/**
 * VectorMemory — In-process TF-IDF cosine similarity vector store.
 *
 * Implements the `VectorStoreAdapter` plugin capability for semantic memory
 * retrieval. Uses TF-IDF weighting with cosine similarity — no external
 * dependencies, works for up to ~10,000 documents.
 *
 * For larger corpora or production semantic search, replace with a
 * community plugin (ChromaPlugin, QdrantPlugin, PgvectorPlugin, etc.)
 * that implements the same `VectorStoreAdapter` interface.
 *
 * @example
 * ```ts
 * import { PluginHost } from 'yaaf'
 * import { VectorMemoryPlugin } from 'yaaf/memory'
 *
 * const host = new PluginHost()
 * await host.register(new VectorMemoryPlugin())
 * // Memory retrieval now uses semantic similarity automatically
 * ```
 *
 * @module memory/vectorMemory
 */

import { PluginBase } from "../plugin/base.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type VectorSearchResult = {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export interface VectorStoreAdapter {
  readonly capability: "vectorstore";
  upsert(id: string, text: string, metadata?: Record<string, unknown>): Promise<void>;
  search(
    query: string,
    topK: number,
    filter?: Record<string, unknown>,
  ): Promise<VectorSearchResult[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
  size(): number;
}

// ── TF-IDF Vector Store ───────────────────────────────────────────────────────

/** Configuration object for VectorMemoryPlugin. */
export type VectorMemoryConfig = {
  /**
   * Maximum number of documents to hold in memory.
   * When exceeded, the oldest document is evicted before inserting a new one.
   * Default: 10,000.
   */
  maxDocuments?: number;

  /**
   * Optional MemoryStore for crash recovery.
   * When set, upserted documents are persisted and reloaded via initialize().
   */
  persistTo?: import("./memoryStore.js").MemoryStore;

  /**
   * Called after each search with timing and result metadata.
   * Use to pipe search latency and recall depth to your observability platform.
   */
  onSearch?: (info: {
    query: string;
    resultCount: number;
    topScore: number;
    durationMs: number;
  }) => void;

  /**
   * V4: Optional semantic embedding function.
   *
   * When provided, document embeddings are stored alongside TF-IDF tokens.
   * During search, embedding cosine similarity is combined with TF-IDF scoring
   * via the `tfidfWeight` parameter. This closes the keyword-match ceiling:
   * documents that share NO keywords with a query can still be retrieved by
   * semantic proximity.
   *
   * The function is called once per `upsert()` and once per `search()` call.
   * It should return a dense float vector of consistent length (`embeddingDimensions`).
   *
   * @example
   * ```ts
   * import { GoogleGenAI } from '@google/genai'
   *
   * const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
   *
   * const vector = new VectorMemoryPlugin({
   * embedFn: async (text) => {
   * const res = await ai.models.embedContent({
   * model: 'text-embedding-004',
   * contents: text,
   * })
   * return res.embeddings[0].values
   * },
   * tfidfWeight: 0.2, // 20% TF-IDF, 80% semantic
   * })
   * ```
   */
  embedFn?: (text: string) => Promise<number[]>;

  /**
   * V4: Weight applied to the TF-IDF component of the combined score.
   * The embedding component receives weight `(1 - tfidfWeight)`.
   *
   * - `1.0` (default): pure TF-IDF, fully backward-compatible.
   * - `0.0`: pure embedding similarity, ignores keyword overlap.
   * - `0.2`: recommended when embedFn is set.
   *
   * Has no effect when `embedFn` is not provided.
   */
  tfidfWeight?: number;
};

type Document = {
  id: string;
  tokens: Map<string, number>; // term → TF (raw count)
  metadata?: Record<string, unknown>;
  /** V4: Dense embedding vector, if embedFn is configured. */
  embedding?: number[];
};

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "me",
  "him",
  "her",
  "us",
  "them",
  "my",
  "your",
  "his",
  "its",
  "our",
  "their",
  "this",
  "that",
  "these",
  "those",
  "and",
  "but",
  "or",
  "nor",
  "not",
  "so",
  "yet",
  "if",
  "then",
  "when",
  "where",
  "how",
  "what",
  "which",
  "who",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "into",
  "about",
  "up",
  "out",
  "than",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

function cosineSimilarity(queryTfIdf: Map<string, number>, docTfIdf: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [term, wa] of queryTfIdf) {
    normA += wa * wa;
    const wb = docTfIdf.get(term) ?? 0;
    dot += wa * wb;
  }
  for (const wb of docTfIdf.values()) normB += wb * wb;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * V4: Cosine similarity between two dense float vectors.
 * O(d) where d = embedding dimensions.
 */
function embeddingCosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length !== a.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * In-process TF-IDF vector store.
 *
 * Suitable for up to `maxDocuments` (default 10,000) documents. For larger
 * corpora, plug in an external vector DB via the `VectorStoreAdapter` interface.
 */
export class VectorMemoryPlugin extends PluginBase implements VectorStoreAdapter {
  readonly capability = "vectorstore" as const;

  private readonly docs = new Map<string, Document>();
  /** IDF cache: term → ln(1 + N/df) */
  private idfCache: Map<string, number> | null = null;

  // V1: Hard size cap
  private readonly maxDocuments: number;
  // V2: Optional persistence
  private readonly persistTo?: VectorMemoryConfig["persistTo"];
  // V3: Search callback
  private readonly onSearch?: VectorMemoryConfig["onSearch"];
  // V4: Optional embedding function + weight
  private readonly embedFn?: VectorMemoryConfig["embedFn"];
  private readonly tfidfWeight: number;

  constructor(config: VectorMemoryConfig = {}) {
    super("vectorstore:in-process", ["vectorstore"]);
    this.maxDocuments = config.maxDocuments ?? 10_000;
    this.persistTo = config.persistTo;
    this.onSearch = config.onSearch;
    this.embedFn = config.embedFn;
    this.tfidfWeight = config.tfidfWeight ?? 1.0;
  }

  /**
   * Reload previously persisted documents from the MemoryStore.
   * Call this once after plugin registration to restore state across restarts.
   *
   * @example
   * ```ts
   * const store = new MemoryStore({ dir: './.yaaf-memory' })
   * const vector = new VectorMemoryPlugin({ persistTo: store })
   * await host.register(vector)
   * await vector.initialize() // restores previous session's docs
   * ```
   */
  async initialize(): Promise<void> {
    if (!this.persistTo) return;
    try {
      const headers = await this.persistTo.scan();
      for (const header of headers) {
        const entry = await this.persistTo.read(header.filename);
        if (entry) {
          await this.upsert(header.filename, entry.content, {
            restored: true,
            restoredAt: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Persistence is best-effort — a missing or corrupt store should not
      // prevent the vector store from starting up fresh.
    }
  }

  async upsert(id: string, text: string, metadata?: Record<string, unknown>): Promise<void> {
    // Evict oldest document if at capacity (and this is a new doc, not an update)
    if (!this.docs.has(id) && this.docs.size >= this.maxDocuments) {
      const oldestKey = this.docs.keys().next().value as string;
      this.docs.delete(oldestKey);
    }

    const tokens = tokenize(text);
    const tf = termFrequency(tokens);
    // V4: Compute embedding if embedFn is configured
    const embedding = this.embedFn ? await this.embedFn(text) : undefined;
    this.docs.set(id, { id, tokens: tf, metadata, embedding });
    this.idfCache = null; // invalidate IDF cache

    // Persist to MemoryStore for crash recovery (best-effort)
    if (this.persistTo) {
      try {
        // Use the doc ID as the filename (slugified for MemoryStore path safety)
        const safeFilename = `vec_${id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100)}.md`;
        await this.persistTo.save({
          name: id,
          description: `VectorMemory document: ${id}`,
          type: "reference",
          content: text,
          filename: safeFilename,
        });
      } catch {
        // Best-effort — don't fail the upsert if persistence fails
      }
    }
  }

  search(
    query: string,
    topK: number,
    filter?: Record<string, unknown>,
  ): Promise<VectorSearchResult[]> {
    if (this.docs.size === 0 || topK <= 0) return Promise.resolve([]);

    // V4: Only await embedFn when actually configured; otherwise return synchronously
    // This is critical for P1 performance: the async keyword alone adds microtask overhead
    // at 10k docs × 100 searches even when embedFn is undefined.
    if (this.embedFn) {
      return this.embedFn(query).then((queryEmbedding) =>
        this._searchSync(query, topK, filter, queryEmbedding),
      );
    }
    return Promise.resolve(this._searchSync(query, topK, filter, undefined));
  }

  private _searchSync(
    query: string,
    topK: number,
    filter: Record<string, unknown> | undefined,
    queryEmbedding: number[] | undefined,
  ): VectorSearchResult[] {
    const t0 = performance.now();

    // Build IDF if stale
    if (!this.idfCache) this.idfCache = this.buildIdf();

    const queryTokens = tokenize(query);
    const queryTf = termFrequency(queryTokens);

    // TF-IDF for query
    const queryTfIdf = new Map<string, number>();
    for (const [term, tf] of queryTf) {
      const idf = this.idfCache.get(term) ?? 0;
      queryTfIdf.set(term, tf * idf);
    }

    const results: VectorSearchResult[] = [];

    for (const doc of this.docs.values()) {
      // Apply metadata filter if provided
      if (filter && doc.metadata) {
        const matches = Object.entries(filter).every(([k, v]) => doc.metadata![k] === v);
        if (!matches) continue;
      }

      // TF-IDF component
      const docTfIdf = new Map<string, number>();
      for (const [term, tf] of doc.tokens) {
        const idf = this.idfCache!.get(term) ?? 0;
        docTfIdf.set(term, tf * idf);
      }
      const tfidfScore = cosineSimilarity(queryTfIdf, docTfIdf);

      // V4: Combined score = tfidfWeight * tfidf + (1 - tfidfWeight) * embedding
      let score: number;
      if (queryEmbedding && doc.embedding) {
        const embScore = embeddingCosineSimilarity(queryEmbedding, doc.embedding);
        score = this.tfidfWeight * tfidfScore + (1 - this.tfidfWeight) * embScore;
      } else {
        score = tfidfScore;
      }

      if (score > 0) {
        results.push({ id: doc.id, score, metadata: doc.metadata });
      }
    }

    results.sort((a, b) => b.score - a.score);
    const sliced = results.slice(0, topK);

    // Observability callback with timing
    if (this.onSearch) {
      const durationMs = performance.now() - t0;
      this.onSearch({
        query,
        resultCount: sliced.length,
        topScore: sliced[0]?.score ?? 0,
        durationMs,
      });
    }

    return sliced;
  }

  async delete(id: string): Promise<void> {
    this.docs.delete(id);
    this.idfCache = null;
  }

  async clear(): Promise<void> {
    this.docs.clear();
    this.idfCache = null;
  }

  size(): number {
    return this.docs.size;
  }

  private buildIdf(): Map<string, number> {
    const df = new Map<string, number>(); // document frequency per term
    const N = this.docs.size;

    for (const doc of this.docs.values()) {
      for (const term of doc.tokens.keys()) {
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }

    const idf = new Map<string, number>();
    for (const [term, freq] of df) {
      // Laplace-smoothed IDF: ln(1 + N/df)
      // This prevents IDF=0 in single-document corpora where df=N,
      // ensuring all terms have a positive weight.
      idf.set(term, Math.log(1 + N / freq));
    }
    return idf;
  }
}
