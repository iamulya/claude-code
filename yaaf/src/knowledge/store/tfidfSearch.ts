/**
 * TF-IDF Search Engine — Built-in KBSearchAdapter
 *
 * A production-grade, zero-dependency TF-IDF search engine that serves as
 * the default `KBSearchAdapter` plugin. Used automatically when no custom
 * search adapter is registered with the PluginHost.
 *
 * Features:
 * - **Sublinear TF-IDF** with cosine-normalized scoring
 * - **Field weighting**: title (3×), aliases (2×), body (1×)
 * - **Multilingual tokenization** via pluggable `TokenizerStrategy`
 *   (default: `HybridTokenizer` — handles CJK, Thai, Latin, Cyrillic, Arabic)
 * - **Vocabulary-aware query expansion**: searches for synonyms automatically
 * - **Optional embedding re-ranking**: blend TF-IDF + cosine similarity
 *
 * The index is built once at `load()` time — O(n) construction, O(k) lookup
 * per query term. The inverted index lives in memory; raw document bodies
 * are not retained (only their token frequencies).
 *
 * @example
 * ```ts
 * // Automatic: just works with no configuration
 * const kb = await KnowledgeBase.load('./my-kb')
 * await kb.search('attention mechanisms') // Uses TF-IDF internally
 *
 * // Explicit: register as plugin for full control
 * const plugin = new TfIdfSearchPlugin({
 *   tokenizer: new EnglishTokenizer(),
 *   vocabulary: ontology.vocabulary,
 * })
 * await host.register(plugin)
 * ```
 *
 * @module knowledge/store/tfidfSearch
 */

import type {
  KBSearchAdapter,
  KBSearchDocument,
  KBSearchOptions,
  KBSearchResult,
  PluginCapability,
} from "../../plugin/types.js";
import type { VocabularyEntry } from "../ontology/types.js";
import {
  HybridTokenizer,
  type TokenizerStrategy,
} from "./tokenizers.js";

// ── Bounded concurrency helper ────────────────────────────────────────────────

/** Run tasks with at most `limit` in-flight simultaneously. */
function pAllSettled<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<Array<PromiseSettledResult<T>>> {
  const concurrency = Math.max(1, limit);
  const results: Array<PromiseSettledResult<T>> = new Array(tasks.length);
  let next = 0;
  let active = 0;
  return new Promise((resolve) => {
    if (tasks.length === 0) { resolve(results); return; }
    const launch = () => {
      while (active < concurrency && next < tasks.length) {
        const i = next++;
        active++;
        tasks[i]!()
          .then(
            (v) => { results[i] = { status: "fulfilled", value: v }; },
            (e) => { results[i] = { status: "rejected", reason: e }; },
          )
          .finally(() => {
            active--;
            launch();
            if (active === 0 && next === tasks.length) resolve(results);
          });
      }
    };
    launch();
  });
}

/** Maximum concurrent embedding API calls during docEmbeddings build. */
const EMBED_CONCURRENCY = 8;

// ── Types ────────────────────────────────────────────────────────────────────

export type TfIdfSearchPluginOptions = {
  /**
   * Tokenizer strategy for text processing.
   * Default: `HybridTokenizer` (multilingual, auto-detects script).
   */
  tokenizer?: TokenizerStrategy;

  /**
   * Ontology vocabulary for query expansion.
   * When provided, search queries are expanded with synonyms/aliases.
   */
  vocabulary?: Record<string, VocabularyEntry>;

  /**
   * Optional embedding function for semantic re-ranking.
   * Same signature as `GroundingValidator.embedFn`.
   * When provided, results are blended: (1-w) * tfidf + w * embedding.
   */
  embedFn?: (text: string) => Promise<number[]>;

  /**
   * Weight of embedding score vs TF-IDF score (0–1).
   * Only used when `embedFn` is provided.
   * Default: 0.4
   */
  embeddingWeight?: number;
};

/** Internal document metadata stored alongside the index */
type DocMeta = {
  title: string;
  entityType: string;
  isStub: boolean;
  /**
   * Three 300-char snippet windows from different article regions for excerpt
   * extraction and embedding re-ranking: [intro, middle, conclusion].
   *
   * P2-3: Replaces the single 500-char bodySnippet that only covered the article
   * intro, making search matches in the middle/end invisible to excerpt extraction.
   * Total retained: ~900 chars (vs 500 before). Still well within A1's memory model.
   */
  snippets: [string, string, string];
};

// ── TfIdfSearchPlugin ────────────────────────────────────────────────────────

export class TfIdfSearchPlugin implements KBSearchAdapter {
  readonly name = "yaaf-tfidf-search";
  readonly version = "1.0.0";
  readonly capabilities: readonly PluginCapability[] = ["kb_search"];

  // === Index structures ===

  /**
   * Inverted index: stemmed token → Map<docId, weighted term frequency>.
   * The TF is already field-weighted (title × 3, aliases × 2, body × 1).
   */
  private invertedIndex = new Map<string, Map<string, number>>();

  /** IDF scores per token: log(N / df(t)) */
  private idf = new Map<string, number>();

  /** Document vector norms for cosine normalization */
  private docNorms = new Map<string, number>();

  /** Internal document metadata (title, entityType, isStub, bodySnippet) */
  private docMeta = new Map<string, DocMeta>();

  /**
   * No full body storage here — C4 fix.
   * The LRU cache in KBStore owns full bodies; we only store a 500-char snippet
   * for excerpt extraction. This preserves A1's memory model.
   * @deprecated This field was removed; excerpt now uses docMeta.bodySnippet.
   */
  // private docBodies removed — was causing full bodies to stay resident

  /** Total number of indexed documents */
  private docCount = 0;

  // === Configuration ===

  private readonly tokenizer: TokenizerStrategy;
  private readonly vocabulary?: Record<string, VocabularyEntry>;
  private readonly embedFn?: (text: string) => Promise<number[]>;
  private readonly embeddingWeight: number;

  /** Pre-computed document embeddings (computed lazily on first search with embedFn) */
  private docEmbeddings?: Map<string, number[]>;
  /**
   * E-1: Shared promise guard for docEmbeddings build.
   * Prevents concurrent search() calls from each triggering an independent
   * sequential embedding pass (which doubles/triples API cost).
   * The second caller awaits the same promise as the first.
   */
  private docEmbeddingsBuildPromise: Promise<void> | null = null;

  /**
   * P2-1: Pre-built index mapping stemmed tokens to canonical vocabulary terms.
   * Built once during indexDocuments(), makes expandQuery() O(Q) instead of O(V×Q).
   */
  private vocabTokenIndex?: Map<string, Set<string>>;

  constructor(options?: TfIdfSearchPluginOptions) {
    this.tokenizer = options?.tokenizer ?? new HybridTokenizer();
    this.vocabulary = options?.vocabulary;
    this.embedFn = options?.embedFn;
    this.embeddingWeight = options?.embeddingWeight ?? 0.4;
  }

  // ── Plugin lifecycle ──────────────────────────────────────────────────────

  async initialize(): Promise<void> {}
  async destroy(): Promise<void> {
    this.clear();
  }
  async healthCheck(): Promise<boolean> {
    // D5: return true even for empty KBs — an empty index is valid (pre-compile state).
    // Returning false signals a broken plugin to the PluginHost, which may trigger
    // health-check failures and unnecessary plugin reinstalls.
    return true;
  }

  // ── KBSearchAdapter implementation ──────────────────────────────────────

  async indexDocuments(documents: KBSearchDocument[]): Promise<void> {
    this.clear();
    this.docCount = documents.length;

    if (documents.length === 0) return;

    // === Pass 1: Tokenize all documents and build raw term frequencies ===

    const docTermFreqs = new Map<string, Map<string, number>>();

    for (const doc of documents) {
      const tf = new Map<string, number>();

      // Title tokens (weight 3×)
      const titleTokens = this.tokenizer.tokenize(doc.title);
      for (const token of titleTokens) {
        tf.set(token, (tf.get(token) ?? 0) + 3);
      }

      // Alias tokens (weight 2×)
      for (const alias of doc.aliases) {
        const aliasTokens = this.tokenizer.tokenize(alias);
        for (const token of aliasTokens) {
          tf.set(token, (tf.get(token) ?? 0) + 2);
        }
      }

      // Body tokens (weight 1×)
      const bodyTokens = this.tokenizer.tokenize(doc.body);
      for (const token of bodyTokens) {
        tf.set(token, (tf.get(token) ?? 0) + 1);
      }

      docTermFreqs.set(doc.docId, tf);

      // Store metadata with P2-3 triple snippet windows
      const bodyLen = doc.body.length;
      const intro = doc.body.slice(0, 300);
      const midStart = Math.max(0, Math.floor(bodyLen / 2) - 150);
      const middle = doc.body.slice(midStart, midStart + 300);
      const concStart = Math.max(0, bodyLen - 300);
      const conclusion = doc.body.slice(concStart, concStart + 300);

      this.docMeta.set(doc.docId, {
        title: doc.title,
        entityType: doc.entityType,
        isStub: doc.isStub,
        snippets: [intro, middle, conclusion],
      });
      // docBodies NOT stored — would defeat A1 lazy load memory savings
    }

    // === Pass 2: Compute IDF ===

    // Document frequency: how many documents contain each token
    const df = new Map<string, number>();
    for (const tf of docTermFreqs.values()) {
      for (const token of tf.keys()) {
        df.set(token, (df.get(token) ?? 0) + 1);
      }
    }

    // Fix H-6: IDF+1 smoothing — prevents zero IDF for tokens present in all documents.
    // log((N+1)/(df+1)) + 1 ensures every token has IDF >= 1, improving recall
    // for common-but-meaningful domain terms like "model", "layer", "algorithm".
    const N = documents.length;
    for (const [token, docFreq] of df) {
      this.idf.set(token, Math.log((N + 1) / (docFreq + 1)) + 1);
    }

    // === Pass 3: Build inverted index with sublinear TF × IDF ===

    for (const [docId, tf] of docTermFreqs) {
      let normSquared = 0;

      for (const [token, rawTf] of tf) {
        const idfValue = this.idf.get(token) ?? 1; // always >= 1 after IDF+1 smoothing
        // Sublinear TF: 1 + log(tf), prevents long documents from dominating
        const tfidf = (1 + Math.log(rawTf)) * idfValue;

        // IDF+1 guarantees idfValue >= 1, so tfidf is always > 0 for any token
        if (!this.invertedIndex.has(token)) {
          this.invertedIndex.set(token, new Map());
        }
        this.invertedIndex.get(token)!.set(docId, tfidf);
        normSquared += tfidf * tfidf;
      }

      // Store document vector norm for cosine normalization
      this.docNorms.set(docId, Math.sqrt(normSquared));
    }

    // P2-1: Build vocab token index for O(Q) query expansion
    // Note: docEmbeddings is already cleared by clear() at the top of this method.
    // The previous explicit `this.docEmbeddings = undefined` here was redundant and
    // removed (T-3) to prevent future divergence from the R-5 fix in clear().
    this.vocabTokenIndex = undefined;
    if (this.vocabulary) {
      this.vocabTokenIndex = new Map();
      for (const [canonical, entry] of Object.entries(this.vocabulary)) {
        const canonicalTokens = this.tokenizer.tokenize(canonical);
        const allTokens = [
          ...canonicalTokens,
          ...entry.aliases.flatMap((a: string) => this.tokenizer.tokenize(a)),
        ];
        for (const token of allTokens) {
          let set = this.vocabTokenIndex.get(token);
          if (!set) { set = new Set(); this.vocabTokenIndex.set(token, set); }
          set.add(canonical);
        }
      }
    }
  }

  /**
   * P2-1: O(Q) query expansion using pre-built vocab token index.
   *
   * The vocabTokenIndex maps each stemmed token to the set of canonical vocabulary
   * terms it belongs to. For each query token, we look up matching canonical terms
   * and add all their tokens + alias tokens. This is O(Q × matches) where matches
   * is typically 0-3 per term, vs the old O(Q × V) which iterated every vocab entry.
   */
  expandQuery(query: string, vocabulary?: Record<string, unknown>): string[] {
    const terms = this.tokenizer.tokenize(query);

    // Use pre-built index if available, otherwise fall through
    if (this.vocabTokenIndex && !vocabulary) {
      const expanded = new Set(terms);
      for (const term of terms) {
        const canonicals = this.vocabTokenIndex.get(term);
        if (!canonicals) continue;
        for (const canonical of canonicals) {
          const entry = this.vocabulary?.[canonical];
          if (!entry) continue;
          for (const t of this.tokenizer.tokenize(canonical)) expanded.add(t);
          for (const alias of (entry as VocabularyEntry).aliases) {
            for (const t of this.tokenizer.tokenize(alias)) expanded.add(t);
          }
        }
      }
      return [...expanded];
    }

    // Fallback: explicit vocabulary passed (legacy path)
    if (!vocabulary && !this.vocabulary) return terms;
    const vocab = (vocabulary ?? this.vocabulary) as Record<string, VocabularyEntry> | undefined;
    if (!vocab) return terms;

    const expanded = new Set(terms);
    for (const term of terms) {
      for (const [canonical, entry] of Object.entries(vocab)) {
        const canonicalTokens = this.tokenizer.tokenize(canonical);
        const allAliasTokens = entry.aliases.flatMap((a) => this.tokenizer.tokenize(a));
        if (canonicalTokens.includes(term) || allAliasTokens.includes(term)) {
          for (const t of canonicalTokens) expanded.add(t);
          for (const t of allAliasTokens) expanded.add(t);
        }
      }
    }
    return [...expanded];
  }

  async search(query: string, options?: KBSearchOptions): Promise<KBSearchResult[]> {
    if (this.docCount === 0) return [];

    const maxResults = options?.maxResults ?? 10;
    const entityTypeFilter = options?.entityType;

    // 1. Tokenize and expand query
    let queryTerms = this.tokenizer.tokenize(query);
    if (queryTerms.length === 0) return [];

    if (this.vocabulary) {
      queryTerms = this.expandQuery(query);
    }

    // 2. Compute TF-IDF cosine similarity for each document
    const scores = new Map<string, number>();

    // Build query vector: TF-IDF for each query term
    const queryTfIdf = new Map<string, number>();
    let queryNormSquared = 0;
    for (const term of queryTerms) {
      const idfValue = this.idf.get(term);
      if (idfValue === undefined) continue; // Term not in corpus
      const tfidf = idfValue; // Query TF = 1 (each term appears once)
      queryTfIdf.set(term, tfidf);
      queryNormSquared += tfidf * tfidf;
    }

    const queryNorm = Math.sqrt(queryNormSquared);
    if (queryNorm === 0) return [];

    // Compute dot product: query · document
    for (const [term, queryWeight] of queryTfIdf) {
      const postings = this.invertedIndex.get(term);
      if (!postings) continue;

      for (const [docId, docWeight] of postings) {
        // Filter by entity type if specified
        if (entityTypeFilter) {
          const meta = this.docMeta.get(docId);
          if (meta && meta.entityType !== entityTypeFilter) continue;
        }

        scores.set(docId, (scores.get(docId) ?? 0) + queryWeight * docWeight);
      }
    }

    // Normalize: score = dot(q, d) / (|q| × |d|)
    for (const [docId, dotProduct] of scores) {
      const docNorm = this.docNorms.get(docId) ?? 1;
      scores.set(docId, dotProduct / (queryNorm * docNorm));
    }

    // 3. Optional: blend with embedding similarity
    if (this.embedFn && scores.size > 0) {
      await this.blendEmbeddingScores(query, scores);
    }

    // 4. Sort by score, take top N
    const ranked = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxResults);

    // 5. Build results with excerpts
    return ranked.map(([docId, score]) => {
      const meta = this.docMeta.get(docId)!;
      return {
        docId,
        title: meta.title,
        entityType: meta.entityType,
        isStub: meta.isStub,
        score: Math.min(score, 1), // Clamp to [0, 1]
        excerpt: this.extractExcerpt(meta.snippets, queryTerms),
      };
    });
  }

  async rebuild(documents: KBSearchDocument[]): Promise<void> {
    await this.indexDocuments(documents);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private clear(): void {
    this.invertedIndex.clear();
    this.idf.clear();
    this.docNorms.clear();
    this.docMeta.clear();
    this.docEmbeddings = undefined;
    // R-5: Also null the build-promise so an in-flight embedding build started
    // before a reload can't write stale pre-reload embeddings into the fresh index.
    this.docEmbeddingsBuildPromise = null;
    this.vocabTokenIndex = undefined;
    this.docCount = 0;
  }

  /**
   * Build document embeddings with bounded concurrency.
   *
   * E-2: The previous implementation iterated all docs sequentially
   * (sequential await in a for-of loop). For a 1000-doc KB at 200ms per call
   * this blocked the first search for ~3 minutes.
   *
   * Now uses pAllSettled with EMBED_CONCURRENCY=8 concurrent calls, which
   * brings the same 1000-doc build down to ~25 seconds.
   *
   * The result is stored in this.docEmbeddings once complete. Failures for
   * individual documents are swallowed (the doc simply won't have an embedding).
   */
  private async buildDocEmbeddings(): Promise<void> {
    if (!this.embedFn || this.docEmbeddings) return;
    this.docEmbeddings = new Map();
    const entries = [...this.docMeta.entries()];
    await pAllSettled(
      entries.map(([docId, meta]) => async () => {
        try {
          const text = meta.title + " " + meta.snippets.join(" ");
          const emb = await this.embedFn!(text);
          this.docEmbeddings!.set(docId, emb);
        } catch {
          // Skip documents that fail to embed
        }
      }),
      EMBED_CONCURRENCY,
    );
  }

  /**
   * Blend embedding cosine similarity into TF-IDF scores.
   * Final score = (1 - w) × tfidf + w × embedding_similarity
   */
  private async blendEmbeddingScores(
    query: string,
    scores: Map<string, number>,
  ): Promise<void> {
    if (!this.embedFn) return;

    try {
      // Compute query embedding
      const queryEmb = await this.embedFn(query);

      // E-1/E-2: Ensure docEmbeddings are built exactly once, even under concurrent search()
      // calls. The promise guard prevents the race where two searches both see
      // docEmbeddings===undefined and both kick off a full sequential build.
      if (!this.docEmbeddings) {
        if (!this.docEmbeddingsBuildPromise) {
          this.docEmbeddingsBuildPromise = this.buildDocEmbeddings().finally(() => {
            this.docEmbeddingsBuildPromise = null;
          });
        }
        await this.docEmbeddingsBuildPromise;
      }

      if (!this.docEmbeddings) return; // build failed

      // Blend scores
      const w = this.embeddingWeight;
      for (const [docId, tfidfScore] of scores) {
        const docEmb = this.docEmbeddings.get(docId);
        if (docEmb && docEmb.length === queryEmb.length) {
          const embScore = cosineSimilarity(queryEmb, docEmb);
          scores.set(docId, (1 - w) * tfidfScore + w * Math.max(0, embScore));
        }
        // If no embedding available, keep pure TF-IDF score
      }

      // Also check for documents with high embedding score but no TF-IDF match
      for (const [docId, docEmb] of this.docEmbeddings) {
        if (!scores.has(docId) && docEmb.length === queryEmb.length) {
          const embScore = cosineSimilarity(queryEmb, docEmb);
          if (embScore >= 0.5) {
            // High semantic similarity — add even without keyword match
            scores.set(docId, w * embScore);
          }
        }
      }
    } catch {
      // embedFn failed — fall back to pure TF-IDF scores
    }
  }

  /**
   * P2-3: Extract a ~200 character excerpt from the best matching snippet window.
   * Searches all three windows (intro/middle/conclusion) for the best match,
   * so matches in the article body or conclusion are no longer invisible.
   */
  private extractExcerpt(snippets: [string, string, string], terms: string[]): string {
    // Search each snippet window for the best match
    for (const snippet of snippets) {
      if (!snippet) continue;
      const bodyLower = snippet.toLowerCase();
      for (const term of terms) {
        const pos = bodyLower.indexOf(term);
        if (pos >= 0) {
          const start = Math.max(0, pos - 60);
          const end = Math.min(snippet.length, pos + 140);
          let excerpt = snippet.slice(start, end).trim();
          if (start > 0) excerpt = "…" + excerpt;
          if (end < snippet.length) excerpt += "…";
          return excerpt;
        }
      }
    }
    // No match found in any window — return start of intro
    return snippets[0].slice(0, 200).trim();
  }
}

// ── Helper ──────────────────────────────────────────────────────────────────

/** Compute cosine similarity between two equal-length numeric vectors. */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
