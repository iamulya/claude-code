/**
 * KB Store — Read-only access to compiled Knowledge Base articles
 *
 * Provides a filesystem-backed store for reading compiled KB documents,
 * building an llms.txt-style index, and keyword searching over the KB.
 *
 * **Memory model (A1):** Documents are loaded lazily. During `load()`, only
 * frontmatter metadata is parsed for every article (title, entityType, isStub,
 * wordCount, tokenEstimate). Full document bodies are read once to feed the
 * search adapter's index, then released. When `getDocument()` is called, the
 * body is loaded from disk and cached in an LRU (default: 200 entries).
 *
 * For a 1000-article KB, this reduces steady-state memory from ~16MB to ~2MB.
 *
 * This is the runtime counterpart to the compile-time KBCompiler.
 */

import { readdir, readFile, stat } from "fs/promises";
import { join, extname, relative } from "path";
import { estimateTokens } from "../../utils/tokens.js";
import type { ConceptRegistry, ConceptRegistryEntry } from "../ontology/index.js";
import { deserializeRegistry } from "../ontology/index.js";
import type { PluginHost, KBSearchAdapter, KBSearchDocument, KBSearchResult, KBGraphAdapter } from "../../plugin/types.js";
import { TfIdfSearchPlugin } from "./tfidfSearch.js";
import { WikilinkGraphPlugin } from "./wikilinkGraph.js";
import { LRUCache } from "./lruCache.js";
import type { KBAnalytics } from "./analytics.js";
import { pAllSettled } from "../utils/concurrency.js";
import { parseYamlFrontmatter } from "../utils/frontmatter.js";

// B1: cap concurrent readFile() calls during _doLoad to prevent EMFILE.
// scanMarkdownFiles already bounds stat() calls; this bounds the body reads.
const IO_CONCURRENCY = 64;
// M9: pAllSettled extracted to ../utils/concurrency.ts (shared across 4 files).

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Lightweight metadata that is always held in memory for every document.
 * Excludes the body text to reduce memory footprint.
 */
export type DocumentMeta = {
  docId: string;
  title: string;
  entityType: string;
  isStub: boolean;
  wordCount: number;
  tokenEstimate: number;
  frontmatter: Record<string, unknown>;
  /** First sentence of the body — stored for index summaries */
  summary: string;
};

export type CompiledDocument = {
  /** Unique document identifier (e.g. "concepts/attention-mechanism") */
  docId: string;
  /** Canonical article title */
  title: string;
  /** Entity type from ontology */
  entityType: string;
  /** Full markdown body (without frontmatter) */
  body: string;
  /** Whether this is a stub article */
  isStub: boolean;
  /** Word count of the body */
  wordCount: number;
  /** Estimated token count */
  tokenEstimate: number;
  /** Raw frontmatter key-value pairs */
  frontmatter: Record<string, unknown>;
};

export type KBIndex = {
  /** Domain description from ontology */
  domain?: string;
  /** Total number of documents */
  totalDocuments: number;
  /** Total estimated tokens across all documents */
  totalTokenEstimate: number;
  /** Index entries grouped by entity type */
  entries: KBIndexEntry[];
};

export type KBIndexEntry = {
  docId: string;
  title: string;
  entityType: string;
  isStub: boolean;
  /** One-line summary (first sentence of body) */
  summary: string;
};

export type SearchResult = {
  docId: string;
  title: string;
  entityType: string;
  isStub: boolean;
  /** Relevance score (0-1) */
  score: number;
  /** Matching excerpt */
  excerpt: string;
  /** Raw frontmatter — used for staleness checks at query time (1.1) */
  frontmatter: Record<string, unknown>;
};

/** Options for KBStore lazy loading behavior */
export type KBStoreOptions = {
  /**
   * Maximum number of full document bodies to keep in the LRU cache.
   * When a document is accessed via `getDocument()` or `getDocumentAsync()`,
   * its body is loaded from disk and cached. When the cache exceeds this limit,
   * the least-recently-accessed body is evicted.
   *
   * Default: 200.
   * Set to `Infinity` to cache all documents (reverts to eager loading behavior).
   */
  maxCachedBodies?: number;

  /**
   * Maximum total byte size of all cached document bodies.
   * Prevents unbounded memory use when individual articles are large.
   *
   * Default: 50MB (50 * 1024 * 1024 bytes).
   * Set to `Infinity` to disable byte-size eviction.
   */
  maxCacheBytes?: number;
};

// ── KBStore ───────────────────────────────────────────────────────────────────

export class KBStore {
  private readonly kbDir: string;
  private readonly compiledDir: string;
  private readonly registryPath: string;

  /** Lightweight metadata for all documents (always in memory) */
  private docMeta: Map<string, DocumentMeta> = new Map();
  /** File paths for each docId (for lazy body loading) */
  private docPaths: Map<string, string> = new Map();
  /** LRU cache for full document bodies */
  private bodyCache: LRUCache<string, string>;
  /** Legacy eager-loaded documents (populated if maxCachedBodies=Infinity) */
  private documents: Map<string, CompiledDocument> = new Map();
  // M2: Explicit load state machine (idle → loading → loaded | failed).
  // On 'failed', loadPromise is cleared so the next caller retries.
  private _loadState: "idle" | "loading" | "loaded" | "failed" = "idle";
  private loaded = false;
  private eagerMode: boolean;
  /** P1-6: serialize concurrent load() calls via a shared promise */
  private loadPromise: Promise<void> | null = null;

  /** Pluggable search adapter — custom or built-in TF-IDF */
  private searchAdapter: KBSearchAdapter;
  /** Optional plugin host for adapter discovery */
  private readonly pluginHost?: PluginHost;
  /** Pluggable graph adapter — custom or built-in wikilink graph */
  private graphAdapter: KBGraphAdapter | null = null;
  /** GAP-1: optional analytics recorder for runtime→compile feedback */
  private analytics?: KBAnalytics;

  constructor(kbDir: string, compiledDirName = "compiled", pluginHost?: PluginHost, options?: KBStoreOptions) {
    this.kbDir = kbDir;
    this.compiledDir = join(kbDir, compiledDirName);
    this.registryPath = join(kbDir, ".kb-registry.json");
    this.pluginHost = pluginHost;

    const maxCached = options?.maxCachedBodies ?? 200;
    // Fix H-4: add byte-size limit to prevent unbounded memory on large articles
    const maxBytes = options?.maxCacheBytes ?? 50 * 1024 * 1024; // 50MB default
    this.eagerMode = !isFinite(maxCached);
    this.bodyCache = new LRUCache<string, string>(
      isFinite(maxCached) ? maxCached : 1,
      isFinite(maxBytes) ? maxBytes : undefined,
    );

    // C3 fix: adapter resolved in load(), not here. Placeholder until load() runs.
    this.searchAdapter = new TfIdfSearchPlugin();
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  /**
   * Load all compiled documents from disk.
   *
   * Fix C-4: concurrent load() calls are serialized — the second caller awaits
   * the first load rather than starting a conflicting parallel load.
   *
   * In lazy mode (default): parses frontmatter metadata for all articles,
   * feeds full bodies to the search index, then releases them from memory.
   * Bodies are loaded from disk on demand via `getDocument()`.
   *
   * In eager mode (`maxCachedBodies: Infinity`): loads everything into memory
   * (original behavior, for small KBs).
   */
  async load(): Promise<void> {
    // P1-6: fast path — avoid any promise allocation if already loaded
    if (this.loaded) return;
    // Serialize concurrent load() calls: if a load is in-flight, return the same promise.
    if (!this.loadPromise) {
      this._loadState = "loading";
      // P3-5: Retry with exponential backoff for transient I/O errors.
      const attempt = async (retries: number, delayMs: number): Promise<void> => {
        try {
          await this._doLoad();
        } catch (err) {
          const code = (err as NodeJS.ErrnoException).code;
          const isTransient = code === "EMFILE" || code === "ENFILE" || code === "EAGAIN";
          if (isTransient && retries > 0) {
            await new Promise((r) => setTimeout(r, delayMs));
            return attempt(retries - 1, delayMs * 2);
          }
          throw err;
        }
      };
      this.loadPromise = attempt(2, 500).then(
        () => { this.loadPromise = null; this._loadState = "loaded"; },
        // M2: On failure, transition to 'failed' and clear the promise
        // so the next load() caller gets a fresh attempt (not a cached rejection).
        (err: unknown) => { this.loadPromise = null; this._loadState = "failed"; throw err; },
      );
    }
    return this.loadPromise;
  }

  /** M2: Public load state getter for observability. */
  get loadState(): "idle" | "loading" | "loaded" | "failed" {
    return this._loadState;
  }

  private async _doLoad(): Promise<void> {
    this.docMeta.clear();
    this.docPaths.clear();
    this.bodyCache.clear();
    this.documents.clear();

    // C3 fix: resolve adapter here so plugins registered after construction are used.
    this.searchAdapter = this.pluginHost?.getKBSearchAdapter() ?? new TfIdfSearchPlugin();

    const paths = await this.scanMarkdownFiles(this.compiledDir);

    // Load registry for alias resolution
    let registry: ConceptRegistry = new Map();
    try {
      registry = await this.loadRegistry();
    } catch {
      /* registry may not exist yet */
    }

    // Parse all documents, collecting bodies for search indexing
    const searchDocs: KBSearchDocument[] = [];

    // B1: bounded IO pool — caps concurrent readFile() at IO_CONCURRENCY.
    // Unbounded Promise.allSettled(paths.map(...)) opens all files simultaneously;
    // on a 500-article KB this easily hits the OS EMFILE fd limit.
    await pAllSettled<void>(
      paths.map((filePath) => async () => {
        const raw = await readFile(filePath, "utf-8");
        const relPath = relative(this.compiledDir, filePath);
        const parsed = this.parseDocument(relPath, raw);
        if (!parsed) return;

        // M3: Reject docIds containing colons — colons are the federation namespace
        // separator. A docId like "concepts:attention" would be parsed as namespace
        // "concepts" + docId "attention" in FederatedKnowledgeBase.parseQualifiedId().
        if (parsed.docId.includes(":")) {
          console.warn(
            `[KBStore] Skipping "${parsed.docId}" — docId contains ':' which ` +
            `conflicts with federation namespace separator. Rename the file.`,
          );
          return;
        }

        // Store file path for lazy loading
        this.docPaths.set(parsed.docId, filePath);

        // Store lightweight metadata (always in memory)
        const meta: DocumentMeta = {
          docId: parsed.docId,
          title: parsed.title,
          entityType: parsed.entityType,
          isStub: parsed.isStub,
          wordCount: parsed.wordCount,
          tokenEstimate: parsed.tokenEstimate,
          frontmatter: parsed.frontmatter,
          summary: this.extractSummary(parsed.body),
        };
        this.docMeta.set(parsed.docId, meta);

        // In eager mode, also store the full document
        if (this.eagerMode) {
          this.documents.set(parsed.docId, parsed);
        }

        // Collect for search indexing
        const registryEntry = registry.get(parsed.docId);
        searchDocs.push({
          docId: parsed.docId,
          title: parsed.title,
          entityType: parsed.entityType,
          body: parsed.body,
          aliases: registryEntry?.aliases ?? [],
          isStub: parsed.isStub,
          wordCount: parsed.wordCount,
          frontmatter: parsed.frontmatter,
        });
        // In lazy mode, the body string from `parsed` is released when this
        // callback returns — only the search adapter's tokenized index survives.
      }),
      IO_CONCURRENCY,
    );

    await this.searchAdapter.indexDocuments(searchDocs);

    // Resolve and build the graph adapter (follows the exact search adapter pattern).
    // The graph is built from the same KBSearchDocument[] used for search indexing.
    try {
      const ontologyRaw = await readFile(join(this.kbDir, "ontology.yaml"), "utf-8");
      // Lazy import to avoid circular dependency — ontology loader is in a sibling layer
      const { OntologyLoader } = await import("../ontology/loader.js");
      const loader = new OntologyLoader(this.kbDir);
      const { ontology } = await loader.load();
      this.graphAdapter = this.pluginHost?.getKBGraphAdapter() ?? new WikilinkGraphPlugin();
      await this.graphAdapter.buildGraph(searchDocs, ontology);
    } catch {
      // Ontology may not exist (non-compiled KB, test fixture) — graph features unavailable
      this.graphAdapter = null;
    }

    this.loaded = true;
  }

  private ensureLoaded(): void {
    if (!this.loaded) throw new Error("KBStore not loaded. Call load() first.");
  }

  // ── Read API ────────────────────────────────────────────────────────────────

  /**
   * Get document metadata (always in memory, no I/O).
   */
  getDocumentMeta(docId: string): DocumentMeta | undefined {
    this.ensureLoaded();
    return this.docMeta.get(docId);
  }

  /**
   * Get a single compiled document by docId.
   *
   * In lazy mode: loads the body from disk + LRU cache.
   * In eager mode: returns from the in-memory document map.
   *
   * @deprecated For async callers, prefer `getDocumentAsync()` which is lazy-safe.
   */
  getDocument(docId: string): CompiledDocument | undefined {
    this.ensureLoaded();

    // Eager mode: return from memory
    if (this.eagerMode) {
      return this.documents.get(docId);
    }

    // Lazy mode: check if we have metadata
    const meta = this.docMeta.get(docId);
    if (!meta) return undefined;

    // Check body cache
    const cachedBody = this.bodyCache.get(docId);
    if (cachedBody !== undefined) {
      return { ...meta, body: cachedBody };
    }

    // M6: Synchronous fallback: can't do lazy I/O, return empty body.
    // Log a warning so callers know they're getting degraded data.
    console.warn(
      `[KBStore] Sync getDocument("${docId}") returned empty body — ` +
      `document body not cached. Use getDocumentAsync() for full lazy loading.`,
    );
    return { ...meta, body: "" };
  }

  /**
   * Get a single compiled document by docId (async, lazy-safe).
   *
   * Loads the body from disk if not in the LRU cache.
   * This is the preferred API for lazy mode.
   */
  async getDocumentAsync(docId: string): Promise<CompiledDocument | undefined> {
    this.ensureLoaded();

    // Eager mode: return from memory
    if (this.eagerMode) {
      return this.documents.get(docId);
    }

    // Check metadata
    const meta = this.docMeta.get(docId);
    if (!meta) return undefined;

    // Check body cache
    const cachedBody = this.bodyCache.get(docId);
    if (cachedBody !== undefined) {
      return { ...meta, body: cachedBody };
    }

    // Load from disk
    const filePath = this.docPaths.get(docId);
    if (!filePath) return undefined;

    try {
      const raw = await readFile(filePath, "utf-8");
      // I2: \r?\n handles both CRLF (Windows) and LF (POSIX) line endings.
      // The original bare `\n` pattern silently returned body="" for CRLF-formatted files.
      const fmMatch = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
      // T-7: If no frontmatter matched, fall back to the full file content.
      // A compiled .md without frontmatter (e.g. from a custom ingester) would
      // previously silently return body="", making the article appear empty in
      // all getDocument/getDocumentAsync callers. Fall back to the raw content
      // so the body at least contains the text the user authored.
      const rawBody = fmMatch != null
        ? (fmMatch[1]?.trim() ?? "")
        : raw.trim();
      // R-10: Normalize CRLF inside body content. The regex above matches CRLF at
      // frontmatter boundaries but leaves raw \r\n sequences inside the body itself.
      // These don't render correctly in most markdown parsers and can break regex
      // processing downstream (e.g. sentence splitting in the grounding plugin).
      const body = rawBody.replace(/\r\n/g, "\n");
      this.bodyCache.set(docId, body);
      return { ...meta, body };
    } catch {
      return { ...meta, body: "" };
    }
  }

  /**
   * Get all compiled documents.
   *
   * In lazy mode, this only returns metadata + cached bodies.
   * Use `getAllDocumentMeta()` for lightweight access to all entries.
   */
  getAllDocuments(): CompiledDocument[] {
    this.ensureLoaded();
    if (this.eagerMode) {
      return Array.from(this.documents.values());
    }
    // Lazy mode: return metadata with empty bodies for uncached docs
    return [...this.docMeta.values()].map((meta) => ({
      ...meta,
      body: this.bodyCache.get(meta.docId) ?? "",
    }));
  }

  /**
   * Get metadata for all documents (lightweight, no I/O).
   */
  getAllDocumentMeta(): DocumentMeta[] {
    this.ensureLoaded();
    return [...this.docMeta.values()];
  }

  /**
   * Get the number of loaded documents.
   */
  get size(): number {
    return this.docMeta.size;
  }

  // ── Index Generation ────────────────────────────────────────────────────────

  /**
   * Build an llms.txt-style index of all documents.
   * Uses lightweight metadata only — no body loading required.
   */
  buildIndex(): KBIndex {
    this.ensureLoaded();

    const entries: KBIndexEntry[] = [];
    let totalTokens = 0;

    for (const meta of this.docMeta.values()) {
      totalTokens += meta.tokenEstimate;
      entries.push({
        docId: meta.docId,
        title: meta.title,
        entityType: meta.entityType,
        isStub: meta.isStub,
        summary: meta.summary,
      });
    }

    // Sort: non-stubs first, then by entity type, then title
    entries.sort((a, b) => {
      if (a.isStub !== b.isStub) return a.isStub ? 1 : -1;
      // J-3: Use Unicode code-point order for deterministic sort across all OS locales.
      if (a.entityType !== b.entityType) return a.entityType < b.entityType ? -1 : 1;
      return a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
    });

    return {
      totalDocuments: entries.length,
      totalTokenEstimate: totalTokens,
      entries,
    };
  }

  /**
   * Format the index as an llms.txt plain-text string.
   */
  formatIndexAsLlmsTxt(index?: KBIndex): string {
    const idx = index ?? this.buildIndex();

    if (idx.entries.length === 0) {
      return "# Knowledge Base\n\n_No articles compiled yet._\n";
    }

    const lines: string[] = [
      `# Knowledge Base (${idx.totalDocuments} articles, ~${idx.totalTokenEstimate.toLocaleString()} tokens)`,
      "",
    ];

    // Group by entity type
    const byType = new Map<string, KBIndexEntry[]>();
    for (const entry of idx.entries) {
      const group = byType.get(entry.entityType) ?? [];
      group.push(entry);
      byType.set(entry.entityType, group);
    }

    for (const [type, entries] of byType) {
      const typeLabel = type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      lines.push(`## ${typeLabel}s`);

      for (const entry of entries) {
        const stub = entry.isStub ? " _(stub)_" : "";
        lines.push(`- **${entry.title}**${stub}: ${entry.summary}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  /**
   * Search across all documents using the registered KBSearchAdapter.
   * Uses TF-IDF + multilingual tokenization by default; can be swapped
   * for Elasticsearch, Pinecone, etc. via a plugin.
   *
   * This is the primary async search API.
   */
  async searchAsync(
    query: string,
    options: { maxResults?: number; entityType?: string } = {},
  ): Promise<KBSearchResult[]> {
    this.ensureLoaded();
    const results = await this.searchAdapter.search(query, options);
    // GAP-1: record hits for compile feedback (non-blocking, non-fatal)
    if (this.analytics && results.length > 0) {
      for (const r of results) {
        this.analytics.recordHit({ docId: r.docId, query, score: r.score });
      }
    }
    return results;
  }

  /**
   * Synchronous keyword search.
   *
   * @deprecated Use `searchAsync()` for the full-quality plugin-based search.
   * @throws {Error} in lazy mode — bodies are not kept in memory; use searchAsync() instead.
   */
  search(
    query: string,
    options: { maxResults?: number; entityType?: string } = {},
  ): SearchResult[] {
    this.ensureLoaded();
    // Fix L-4: assert that sync search is only usable in eager mode
    if (!this.eagerMode) {
      throw new Error(
        "KBStore.search() is unavailable in lazy mode (maxCachedBodies < Infinity). " +
        "Bodies are not held in memory in lazy mode. " +
        "Use searchAsync() instead, or construct KBStore with maxCachedBodies: Infinity.",
      );
    }
    const { maxResults = 10, entityType } = options;

    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1);
    if (terms.length === 0) return [];

    const results: SearchResult[] = [];

    for (const doc of this.documents.values()) {
      if (entityType && doc.entityType !== entityType) continue;

      const titleLower = doc.title.toLowerCase();
      const bodyLower = doc.body.toLowerCase();

      // Score: title matches weighted 3x, body matches weighted 1x
      let score = 0;
      let matchedTerms = 0;

      for (const term of terms) {
        const titleHit = titleLower.includes(term);
        const bodyHit = bodyLower.includes(term);

        if (titleHit) {
          score += 3;
          matchedTerms++;
        } else if (bodyHit) {
          score += 1;
          matchedTerms++;
        }
      }

      // Skip if no terms matched
      if (matchedTerms === 0) continue;

      // Normalize score to 0-1
      const maxScore = terms.length * 3;
      const normalizedScore = Math.min(score / maxScore, 1);

      // Extract excerpt around first match
      const excerpt = this.extractExcerpt(doc.body, terms);

      results.push({
        docId: doc.docId,
        title: doc.title,
        entityType: doc.entityType,
        isStub: doc.isStub,
        score: normalizedScore,
        excerpt,
        frontmatter: doc.frontmatter,
      });
    }

    // Sort by score descending, then by title
    // J-3: Code-point tiebreak — localeCompare() varies with OS locale (see F-4).
    results.sort((a, b) => b.score - a.score || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0));

    return results.slice(0, maxResults);
  }

  // ── Registry ────────────────────────────────────────────────────────────────

  /**
   * Load the concept registry from disk.
   */
  async loadRegistry(): Promise<ConceptRegistry> {
    try {
      const raw = await readFile(this.registryPath, "utf-8");
      return deserializeRegistry(raw);
    } catch {
      return new Map<string, ConceptRegistryEntry>();
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async scanMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    // Fix M-3: bound concurrent stat/readdir calls to avoid EMFILE on large KBs
    const IO_CONCURRENCY = 50;
    const queue: Array<() => Promise<void>> = [];
    let active = 0;

    const drain = async (): Promise<void> => {
      while (active < IO_CONCURRENCY && queue.length > 0) {
        const task = queue.shift()!;
        active++;
        task().finally(() => { active--; void drain(); });
      }
    };

    const enqueue = (task: () => Promise<void>): Promise<void> =>
      new Promise((resolve, reject) => {
        queue.push(() => task().then(resolve, reject));
        void drain();
      });

    const recurse = async (d: string): Promise<void> => {
      try {
        const entries = await readdir(d);
        await Promise.all(
          entries.map((entry) =>
            enqueue(async () => {
              const full = join(d, entry);
              const s = await stat(full);
              if (s.isDirectory()) {
                await recurse(full);
              } else if (s.isFile() && extname(entry) === ".md") {
                files.push(full);
              }
            }),
          ),
        );
      } catch {
        /* compiled/ may not exist */
      }
    };

    await recurse(dir);
    return files.sort();
  }

  private parseDocument(relativePath: string, raw: string): CompiledDocument | null {
    const docId = relativePath.replace(/\\/g, "/").replace(/\.md$/, "");

    // Skip assets directory entries
    if (docId.startsWith("assets/")) return null;

    // R3: CRLF normalization -- Windows-format compiled files silently return
    // null from parseDocument (document absent from store) without this.
    const rawNorm = raw.replace(/\r\n/g, "\n");
    const fmMatch = rawNorm.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!fmMatch) return null;

    const fm = fmMatch[1]!;
    const body = fmMatch[2]?.trim() ?? "";

    // Replaced 80-line hand-rolled YAML parser with shared yaml-library-based
    // implementation. This eliminates: P2-5 (colon-in-value), W-5 (escaped quotes),
    // S-1 (escape sequences), H2 (prototype pollution) — all handled by the yaml
    // library + the shared parseYamlFrontmatter wrapper.
    const frontmatter = parseYamlFrontmatter(fm);

    // R4-2: Use String() to handle numeric or boolean titles safely after R3-3 coercion.
    const title = frontmatter.title != null ? String(frontmatter.title) : docId.split("/").pop() ?? docId;
    const entityType = (frontmatter.entity_type as string) ?? "unknown";
    const isStub = frontmatter.stub === true;
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    const tokenEstimate = estimateTokens(body);

    return { docId, title, entityType, body, isStub, wordCount, tokenEstimate, frontmatter };
  }

  private extractSummary(body: string): string {
    // Try to get the first non-heading, non-empty paragraph
    const lines = body.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("#")) continue;
      if (trimmed.startsWith("---")) continue;
      if (trimmed.startsWith("![")) continue;
      // Skip pure code blocks
      if (trimmed.startsWith("```")) continue;
      // Take first sentence
      const sentence = trimmed.match(/^(.+?[.!?])\s/);
      const raw = (sentence?.[1] ?? trimmed).slice(0, 200);
      // Fix M-1: strip markdown syntax so the summary reads as plain text
      return this.stripMarkdown(raw);
    }
    return "";
  }

  /**
   * Strip common markdown syntax for use in plain-text summaries.
   * Handles wikilinks, URLs, bold/italic, code spans.
   */
  private stripMarkdown(text: string): string {
    return text
      .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1") // [[Link]] → Link
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")           // [text](url) → text
      .replace(/\*\*([^*]+)\*\*/g, "$1")                  // **bold** → bold
      .replace(/__([^_]+)__/g, "$1")                       // __bold__ → bold
      .replace(/\*([^*]+)\*/g, "$1")                       // *italic* → italic
      .replace(/_([^_]+)_/g, "$1")                         // _italic_ → italic
      .replace(/`([^`]+)`/g, "$1")                         // `code` → code
      .trim();
  }

  private extractExcerpt(body: string, terms: string[]): string {
    const bodyLower = body.toLowerCase();
    let bestPos = -1;

    // Find earliest match
    for (const term of terms) {
      const pos = bodyLower.indexOf(term);
      if (pos >= 0 && (bestPos === -1 || pos < bestPos)) {
        bestPos = pos;
      }
    }

    if (bestPos === -1) return body.slice(0, 200);

    // Extract ~200 chars around the match
    const start = Math.max(0, bestPos - 80);
    const end = Math.min(body.length, bestPos + 120);
    let excerpt = body.slice(start, end).trim();

    if (start > 0) excerpt = "…" + excerpt;
    if (end < body.length) excerpt += "…";

    return excerpt;
  }
  /**
   * P3-3: Release all in-memory resources held by this store.
   * Call during server shutdown or when dynamically unloading a KB
   * to reclaim the ~50MB LRU cache, all metadata maps, and search adapter state.
   *
   * P3-R3 fix: if a load() is in-flight when destroy() is called, we await it
   * first (so _doLoad's final `this.loaded = true` fires before we clear state).
   * Without this, _doLoad would set loaded=true on the post-destroy store,
   * making ensureLoaded() pass on an empty store.
   */
  async destroy(): Promise<void> {
    // Await any in-flight load so _doLoad cannot write `loaded=true` after we clear
    if (this.loadPromise) {
      try { await this.loadPromise; } catch { /* load failure is fine — we're destroying */ }
    }
    // Flush any pending analytics before releasing resources
    await this.analytics?.destroy();
    this.analytics = undefined;
    this.docMeta.clear();
    this.docPaths.clear();
    this.bodyCache.clear();
    this.documents.clear();
    this.loaded = false;
    this.loadPromise = null;
    // Tell the search adapter to release its own memory (e.g. TF-IDF inverted index)
    if (typeof (this.searchAdapter as { destroy?: () => Promise<void> }).destroy === "function") {
      await (this.searchAdapter as { destroy: () => Promise<void> }).destroy();
    }
  }

  /**
   * GAP-1: Attach an analytics recorder that will receive hit events from
   * `searchAsync()` for use in the compiler's Discovery phase.
   */
  setAnalytics(analytics: KBAnalytics): void {
    this.analytics = analytics;
  }

  /**
   * Get the graph adapter for relationship queries.
   * Returns null if no ontology was available during load.
   */
  getGraphAdapter(): KBGraphAdapter | null {
    return this.graphAdapter;
  }
}
