/**
 * KnowledgeBase — Top-level API for the YAAF Knowledge Base
 *
 * Ties together:
 * - **Compile-time:** KBCompiler for raw/ → compiled/ pipeline
 * - **Runtime:** KBStore + tools for agent integration
 *
 * @example
 * ```ts
 * import { KnowledgeBase } from 'yaaf/knowledge'
 * import { Agent } from 'yaaf'
 *
 * // Load a compiled KB and create an agent with KB tools
 * const kb = await KnowledgeBase.load('./my-kb')
 * const agent = new Agent({
 * tools: [...kb.tools()],
 * systemPrompt: `You have access to a knowledge base.\n\n${kb.systemPromptSection()}`,
 * })
 * ```
 */

import { KBStore } from "./store.js";
import { createKBTools } from "./tools.js";
import type { CompiledDocument, KBIndex, SearchResult, KBIndexEntry, DocumentMeta } from "./store.js";
import type { KBSearchResult } from "../../plugin/types.js";
import type { KBToolOptions } from "./tools.js";
import type { Tool } from "../../tools/tool.js";
import type {
  ToolProvider,
  ContextProvider,
  ContextSection,
  PluginCapability,
  PluginHost,
} from "../../plugin/types.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type KnowledgeBaseOptions = {
  /** Path to the KB root directory (contains ontology.yaml, raw/, compiled/) */
  kbDir: string;
  /** Name of the compiled directory. Default: 'compiled' */
  compiledDirName?: string;
  /** Options for the runtime tools */
  toolOptions?: KBToolOptions;
  /**
   * Optional namespace prefix for all docIds returned by tools.
   * When set, docIds become `namespace:docId` (e.g. `ml:concepts/attention`).
   * Recommended when using this KB alongside a FederatedKnowledgeBase,
   * or any context where multiple KBs are in play.
   */
  namespace?: string;
  /**
   * Optional PluginHost for adapter discovery.
   * When provided, the KBStore will use a registered `KBSearchAdapter`
   * (if any) instead of the built-in TF-IDF search engine.
   */
  pluginHost?: PluginHost;
  /**
   * Maximum token budget for the system prompt KB section.
   * When the full article index exceeds this budget, the system prompt
   * progressively degrades:
   *   1. Full listing (title + docId per article)
   *   2. Compact listing (title only, no docId)
   *   3. Summary only (entity type counts)
   *
   * Default: 2000 tokens (~8KB of text).
   * Set to `Infinity` to always include the full listing.
   */
  systemPromptMaxTokens?: number;
};

// ── KnowledgeBase ─────────────────────────────────────────────────────────────

/**
 * KnowledgeBase — Top-level API for the YAAF Knowledge Base.
 *
 * Also implements `ToolProvider` + `ContextProvider` so it can be registered
 * directly with a `PluginHost`:
 *
 * ```ts
 * const kb = await KnowledgeBase.load('./my-kb')
 *
 * // Classic usage (still works)
 * const agent = new Agent({ tools: [...kb.tools()] })
 *
 * // Plugin usage (auto-discovers tools + system prompt)
 * await host.register(kb)
 * const agent = await Agent.create({ plugins: host.listPluginsRaw() })
 * ```
 */
export class KnowledgeBase implements ToolProvider, ContextProvider {
  // ── Plugin identity ────────────────────────────────────────────────────────
  readonly name: string;
  readonly version = "1.0.0";
  readonly capabilities: readonly PluginCapability[] = ["tool_provider", "context_provider"];

  private readonly store: KBStore;
  private readonly toolOptions: KBToolOptions;
  private readonly _namespace: string | undefined;
  private readonly systemPromptMaxTokens: number;
  private cachedIndex?: KBIndex;
  private cachedTools?: Tool[];

  private constructor(
    store: KBStore,
    toolOptions: KBToolOptions = {},
    namespace?: string,
    systemPromptMaxTokens?: number,
  ) {
    this.store = store;
    this.toolOptions = toolOptions;
    this._namespace = namespace;
    this.systemPromptMaxTokens = systemPromptMaxTokens ?? 2000;
    // Use namespace (or directory-based name) as plugin name for PluginHost
    this.name = namespace ? `kb:${namespace}` : "kb";
  }

  /**
   * Load a compiled Knowledge Base from disk.
   *
   * @example
   * ```ts
   * const kb = await KnowledgeBase.load('./my-kb')
   * console.log(`Loaded ${kb.size} articles`)
   * ```
   */
  static async load(options: string | KnowledgeBaseOptions): Promise<KnowledgeBase> {
    const opts = typeof options === "string" ? { kbDir: options } : options;
    const store = new KBStore(opts.kbDir, opts.compiledDirName, opts.pluginHost);
    await store.load();
    return new KnowledgeBase(store, opts.toolOptions, opts.namespace, opts.systemPromptMaxTokens);
  }

  /**
   * Return a copy of this KnowledgeBase with a specific namespace applied.
   * Used internally by FederatedKnowledgeBase — avoids reloading from disk.
   */
  withNamespace(namespace: string): KnowledgeBase {
    const kb = new KnowledgeBase(this.store, this.toolOptions, namespace, this.systemPromptMaxTokens);
    return kb;
  }

  /** ToolProvider: called by PluginHost.getAllTools() */
  getTools(): Tool[] {
    return this.tools();
  }

  /** ContextProvider: called by PluginHost.gatherContext() */
  async getContextSections(
    _query: string,
    _existing?: Record<string, string>,
  ): Promise<ContextSection[]> {
    const section = this.systemPromptSection();
    if (!section) return [];
    return [
      {
        key: this._namespace ? `kb-${this._namespace}` : "kb",
        content: section,
        placement: "system",
        priority: 10,
      },
    ];
  }

  /** Plugin lifecycle — no-op (store is loaded via KnowledgeBase.load). */
  async initialize(): Promise<void> {}
  /** P3-3: Release all store resources (LRU cache, search index, analytics). */
  async destroy(): Promise<void> { await this.store.destroy(); }
  async healthCheck(): Promise<boolean> {
    // Fix L-2: actually verify the store is populated and readable
    if (this.store.size === 0) return false;
    try {
      const firstMeta = this.store.getAllDocumentMeta()[0];
      if (!firstMeta) return false;
      const doc = await this.store.getDocumentAsync(firstMeta.docId);
      return doc !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Get the three KB runtime tools: list_kb_index, fetch_kb_document, search_kb.
   *
   * Tools are cached after first call so they can be reused safely.
   *
   * @example
   * ```ts
   * const agent = new Agent({ tools: [...kb.tools()] })
   * // or register as plugin:
   * await host.register(kb) // tools auto-discovered via getTools()
   * ```
   */
  tools(): Tool[] {
    if (!this.cachedTools) {
      this.cachedTools = createKBTools(this.store, this.toolOptions, this._namespace);
    }
    return this.cachedTools;
  }

  /**
   * The namespace assigned to this KB, if any.
   * When set, docIds from tools are prefixed: `namespace:docId`.
   */
  get namespace(): string | undefined {
    return this._namespace;
  }

  // ── System prompt helpers ─────────────────────────────────────────────────

  /**
   * Generate a system prompt section describing the KB and available tools.
   *
   * Includes a compact index of all articles so the agent knows what it can access.
   * Progressively degrades when the index exceeds `systemPromptMaxTokens`:
   *   1. Full listing (title + docId per article)
   *   2. Compact listing (title only, no docId)  
   *   3. Summary only (entity type counts)
   */
  systemPromptSection(): string {
    const index = this.index();
    const ns = this._namespace;
    const maxTokens = this.systemPromptMaxTokens;

    if (index.entries.length === 0) {
      return [
        "## Knowledge Base",
        "",
        "_No articles have been compiled yet._",
        "",
        "Tools available: list_kb_index, fetch_kb_document, search_kb",
      ].join("\n");
    }

    // Group by entity type
    const byType = new Map<string, KBIndexEntry[]>();
    for (const entry of index.entries) {
      const group = byType.get(entry.entityType) ?? [];
      group.push(entry);
      byType.set(entry.entityType, group);
    }

    const nsNote = ns ? ` (namespace: \`${ns}\`)` : "";
    const headerLines = [
      `## Knowledge Base${nsNote} (${index.totalDocuments} articles, ~${index.totalTokenEstimate.toLocaleString()} tokens)`,
      "",
      "You have access to a curated knowledge base. Use the following tools to retrieve information:",
      "- **list_kb_index**: see all available articles",
      `- **fetch_kb_document**: get the full content of a specific article by docId${ns ? ` (use \`${ns}:docId\` format)` : ""}`,
      "- **search_kb**: search articles by keyword",
      "",
    ];

    // === Strategy 1: Full listing (title + docId) ===
    const fullLines = [...headerLines, "### Available Articles", ""];
    for (const [type, entries] of byType) {
      const typeLabel = type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      fullLines.push(`**${typeLabel}s:**`);
      for (const entry of entries) {
        const stub = entry.isStub ? " _(stub)_" : "";
        const docId = ns ? `${ns}:${entry.docId}` : entry.docId;
        fullLines.push(`- ${entry.title}${stub} \`[${docId}]\``);
      }
      fullLines.push("");
    }
    const fullText = fullLines.join("\n");
    if (this.estimateTokenCount(fullText) <= maxTokens) {
      return fullText;
    }

    // === Strategy 2: Compact listing (title only, no docId) ===
    const compactLines = [...headerLines, "### Available Articles", ""];
    for (const [type, entries] of byType) {
      const typeLabel = type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      const titles = entries
        .filter((e) => !e.isStub)
        .map((e) => e.title);
      if (titles.length > 0) {
        compactLines.push(`**${typeLabel}s** (${entries.length}): ${titles.join(", ")}`);
      }
    }
    compactLines.push("");
    compactLines.push("_Use search_kb or list_kb_index for full details and docIds._");
    const compactText = compactLines.join("\n");
    if (this.estimateTokenCount(compactText) <= maxTokens) {
      return compactText;
    }

    // === Strategy 3: Summary only (entity type counts) ===
    const summaryLines = [...headerLines, "### Coverage", ""];
    for (const [type, entries] of byType) {
      const typeLabel = type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      const stubs = entries.filter((e) => e.isStub).length;
      const stubNote = stubs > 0 ? ` (${stubs} stubs)` : "";
      summaryLines.push(`- **${typeLabel}s:** ${entries.length} articles${stubNote}`);
    }
    summaryLines.push("");
    summaryLines.push("_Use search_kb to find specific articles, or list_kb_index for the full directory._");

    return summaryLines.join("\n");
  }

  /**
   * Rough token count for budget enforcement.
   * Uses the 4 chars ≈ 1 token heuristic (same as estimateTokens).
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // ── Direct access API ─────────────────────────────────────────────────────

  /**
   * Get the KB index (cached after first call).
   */
  index(): KBIndex {
    if (!this.cachedIndex) {
      this.cachedIndex = this.store.buildIndex();
    }
    return this.cachedIndex;
  }

  /**
   * Get the index formatted as an llms.txt string.
   */
  indexAsText(): string {
    return this.store.formatIndexAsLlmsTxt(this.index());
  }

  /**
   * Fetch a specific document by docId (async, lazy-safe).
   */
  async getDocumentAsync(docId: string): Promise<CompiledDocument | undefined> {
    return this.store.getDocumentAsync(docId);
  }

  /**
   * Fetch a specific document by docId.
   * @deprecated Prefer `getDocumentAsync()` — returns empty body in lazy mode.
   */
  getDocument(docId: string): CompiledDocument | undefined {
    return this.store.getDocument(docId);
  }

  /**
   * Get lightweight metadata for all documents (no body loading, no I/O).
   */
  getAllDocumentMeta(): DocumentMeta[] {
    return this.store.getAllDocumentMeta();
  }

  /**
   * Get all compiled documents.
   * @deprecated In lazy mode, returned documents have empty bodies. Prefer `getAllDocumentMeta()`.
   */
  getAllDocuments(): CompiledDocument[] {
    return this.store.getAllDocuments();
  }

  /**
   * Search the KB using the TF-IDF adapter (async, lazy-safe).
   * This is the primary search API — uses the same adapter as the search_kb tool.
   */
  async searchAsync(
    query: string,
    options?: { maxResults?: number; entityType?: string },
  ): Promise<KBSearchResult[]> {
    return this.store.searchAsync(query, options);
  }

  /**
   * Search the KB by keyword (sync, backward-compatible).
   * @deprecated Use `searchAsync()` for the full TF-IDF adapter.
   */
  search(query: string, options?: { maxResults?: number; entityType?: string }): SearchResult[] {
    return this.store.search(query, options);
  }

  /**
   * Number of compiled documents.
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * Reload documents from disk (e.g. after recompilation).
   */
  async reload(): Promise<void> {
    this.cachedIndex = undefined;
    this.cachedTools = undefined;
    await this.store.load();
  }

  // ── Internal: store access for FederatedKnowledgeBase ───────────────────────

  /** @internal Used by FederatedKnowledgeBase to delegate search/fetch. */
  _getStore(): KBStore {
    return this.store;
  }
}
