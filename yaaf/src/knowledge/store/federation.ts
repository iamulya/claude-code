/**
 * FederatedKnowledgeBase — Cross-KB Federation
 *
 * Combines multiple KnowledgeBase instances under named namespaces,
 * providing unified search, browsing, and document retrieval across all KBs.
 *
 * Namespacing rules:
 * - All docIds are prefixed with their namespace: `ml:concepts/attention`
 * - The agent sees a merged index with namespace labels
 * - search_kb searches across all KBs, results tagged with their source
 * - fetch_kb_document accepts namespaced docIds: `ml:concepts/attention`
 *
 * @example
 * ```ts
 * import { KnowledgeBase, FederatedKnowledgeBase } from 'yaaf/knowledge'
 *
 * const ml = await KnowledgeBase.load('./kb-ml')
 * const tools = await KnowledgeBase.load('./kb-tools')
 *
 * const federated = FederatedKnowledgeBase.from({
 * ml,
 * tools,
 * })
 *
 * const agent = new Agent({
 * tools: federated.tools(),
 * systemPrompt: federated.systemPromptSection(),
 * })
 * ```
 */

import { KnowledgeBase } from "./knowledgeBase.js";
import { buildTool, type Tool } from "../../tools/tool.js";
import type { CompiledDocument, KBIndex, KBIndexEntry, SearchResult } from "./store.js";
import type { KBToolOptions } from "./tools.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FederatedKBEntry = {
  /** The loaded KnowledgeBase instance */
  kb: KnowledgeBase;
  /** Human-readable label for this KB (used in system prompt). Defaults to namespace. */
  label?: string;
};

export type FederatedKBConfig = Record<string, KnowledgeBase | FederatedKBEntry>;

export type FederatedKBOptions = {
  /** Options passed to the generated tools */
  toolOptions?: KBToolOptions;
};

// ── Namespaced types ──────────────────────────────────────────────────────────

export type NamespacedDocument = CompiledDocument & {
  /** Namespace this document belongs to */
  namespace: string;
  /** Fully qualified docId: `namespace:docId` */
  qualifiedId: string;
};

export type NamespacedSearchResult = SearchResult & {
  /** Namespace this result belongs to */
  namespace: string;
  /** Fully qualified docId: `namespace:docId` */
  qualifiedId: string;
};

export type NamespacedIndexEntry = KBIndexEntry & {
  /** Namespace this entry belongs to */
  namespace: string;
  /** Fully qualified docId: `namespace:docId` */
  qualifiedId: string;
};

export type FederatedIndex = {
  /** Total documents across all KBs */
  totalDocuments: number;
  /** Total estimated tokens across all KBs */
  totalTokenEstimate: number;
  /** All entries with namespace info */
  entries: NamespacedIndexEntry[];
  /** Per-namespace stats */
  namespaces: Array<{
    namespace: string;
    label: string;
    documentCount: number;
    tokenEstimate: number;
  }>;
};

// ── FederatedKnowledgeBase ────────────────────────────────────────────────────

export class FederatedKnowledgeBase {
  private readonly namespaces: Map<string, { kb: KnowledgeBase; label: string }>;
  private readonly toolOptions: KBToolOptions;
  private cachedIndex?: FederatedIndex;
  private cachedTools?: Tool[];

  private constructor(
    namespaces: Map<string, { kb: KnowledgeBase; label: string }>,
    toolOptions: KBToolOptions = {},
  ) {
    this.namespaces = namespaces;
    this.toolOptions = toolOptions;
  }

  // ── Factory ─────────────────────────────────────────────────────────────────

  /**
   * Create a federated KB from a config mapping namespace → KnowledgeBase.
   *
   * @example
   * ```ts
   * const fed = FederatedKnowledgeBase.from({
   * ml: mlKB,
   * tools: { kb: toolsKB, label: 'Internal Tools' },
   * })
   * ```
   */
  static from(config: FederatedKBConfig, options?: FederatedKBOptions): FederatedKnowledgeBase {
    const namespaces = new Map<string, { kb: KnowledgeBase; label: string }>();

    for (const [ns, value] of Object.entries(config)) {
      if (ns.includes(":")) {
        throw new Error(`Namespace "${ns}" must not contain ':'`);
      }

      const raw = value instanceof KnowledgeBase ? value : value.kb;
      const label = value instanceof KnowledgeBase ? ns : (value.label ?? ns);

      // Apply namespace to the KB so its tools always emit namespace:docId
      namespaces.set(ns, { kb: raw.withNamespace(ns), label });
    }

    if (namespaces.size === 0) {
      throw new Error("FederatedKnowledgeBase requires at least one namespace");
    }

    return new FederatedKnowledgeBase(namespaces, options?.toolOptions);
  }

  /**
   * Load multiple KB directories and federate them.
   *
   * @example
   * ```ts
   * const fed = await FederatedKnowledgeBase.load({
   * ml: './kb-ml',
   * tools: './kb-internal-tools',
   * })
   * ```
   */
  static async load(
    config: Record<string, string | { kbDir: string; label?: string }>,
    options?: FederatedKBOptions,
  ): Promise<FederatedKnowledgeBase> {
    const kbs: FederatedKBConfig = {};

    await Promise.all(
      Object.entries(config).map(async ([ns, value]) => {
        const kbDir = typeof value === "string" ? value : value.kbDir;
        const label = typeof value === "string" ? ns : value.label;
        const kb = await KnowledgeBase.load(kbDir);
        kbs[ns] = label ? { kb, label } : kb;
      }),
    );

    return FederatedKnowledgeBase.from(kbs, options);
  }

  // ── Runtime tools ───────────────────────────────────────────────────────────

  /**
   * Get federated versions of the three KB tools.
   *
   * These tools work across all namespaces:
   * - `list_kb_index` shows all KBs with namespace labels
   * - `fetch_kb_document` accepts `namespace:docId` format
   * - `search_kb` searches all KBs and merges results
   */
  tools(): Tool[] {
    if (!this.cachedTools) {
      this.cachedTools = this.buildTools();
    }
    return this.cachedTools;
  }

  // ── System prompt ───────────────────────────────────────────────────────────

  /**
   * Generate a system prompt section describing all federated KBs.
   */
  systemPromptSection(): string {
    const index = this.index();

    const lines = [
      `## Federated Knowledge Base (${index.namespaces.length} sources, ${index.totalDocuments} articles, ~${index.totalTokenEstimate.toLocaleString()} tokens)`,
      "",
      "You have access to multiple knowledge bases. Use the following tools to retrieve information:",
      "- **list_kb_index**: see all available articles (optionally filter by namespace)",
      "- **fetch_kb_document**: get an article by qualified ID (`namespace:docId`)",
      "- **search_kb**: search across all knowledge bases by keyword",
      "",
      "### Knowledge Base Sources",
      "",
    ];

    for (const ns of index.namespaces) {
      lines.push(
        `- **${ns.label}** (namespace: \`${ns.namespace}\`) — ${ns.documentCount} articles`,
      );
    }

    lines.push("");
    lines.push("### Available Articles");
    lines.push("");

    // Group by namespace, then by entity type
    for (const ns of index.namespaces) {
      lines.push(`#### ${ns.label} (\`${ns.namespace}:\`)`);
      lines.push("");

      const nsEntries = index.entries.filter((e) => e.namespace === ns.namespace);
      const byType = new Map<string, NamespacedIndexEntry[]>();
      for (const entry of nsEntries) {
        const group = byType.get(entry.entityType) ?? [];
        group.push(entry);
        byType.set(entry.entityType, group);
      }

      for (const [type, entries] of byType) {
        const typeLabel = type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        lines.push(`**${typeLabel}s:**`);
        for (const entry of entries) {
          const stub = entry.isStub ? " _(stub)_" : "";
          lines.push(`- ${entry.title}${stub} \`[${entry.qualifiedId}]\``);
        }
        lines.push("");
      }
    }

    return lines.join("\n");
  }

  // ── Direct access API ───────────────────────────────────────────────────────

  /**
   * Get the federated index (cached after first call).
   */
  index(): FederatedIndex {
    if (!this.cachedIndex) {
      this.cachedIndex = this.buildIndex();
    }
    return this.cachedIndex;
  }

  /**
   * Fetch a document by qualified ID (`namespace:docId`).
   */
  getDocument(qualifiedId: string): NamespacedDocument | undefined {
    const { namespace, docId } = this.parseQualifiedId(qualifiedId);
    if (!namespace) return undefined;

    const ns = this.namespaces.get(namespace);
    if (!ns) return undefined;

    const doc = ns.kb.getDocument(docId);
    if (!doc) return undefined;

    return {
      ...doc,
      namespace,
      qualifiedId: `${namespace}:${doc.docId}`,
    };
  }

  /**
   * Search across all KBs, merging and ranking results.
   */
  search(
    query: string,
    options?: {
      maxResults?: number;
      entityType?: string;
      namespace?: string;
    },
  ): NamespacedSearchResult[] {
    const { maxResults = 10, entityType, namespace: nsFilter } = options ?? {};

    const allResults: NamespacedSearchResult[] = [];

    for (const [ns, { kb }] of this.namespaces) {
      if (nsFilter && ns !== nsFilter) continue;

      const results = kb.search(query, { maxResults: maxResults * 2, entityType });
      for (const r of results) {
        allResults.push({
          ...r,
          namespace: ns,
          qualifiedId: `${ns}:${r.docId}`,
        });
      }
    }

    // Re-sort merged results by score
    allResults.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

    return allResults.slice(0, maxResults);
  }

  /**
   * Get all namespace names.
   */
  get namespaceNames(): string[] {
    return Array.from(this.namespaces.keys());
  }

  /**
   * Total documents across all KBs.
   */
  get size(): number {
    let total = 0;
    for (const { kb } of this.namespaces.values()) {
      total += kb.size;
    }
    return total;
  }

  /**
   * Reload all KBs from disk.
   */
  async reload(): Promise<void> {
    this.cachedIndex = undefined;
    this.cachedTools = undefined;
    await Promise.all(Array.from(this.namespaces.values()).map(({ kb }) => kb.reload()));
  }

  // ── Private: index builder ──────────────────────────────────────────────────

  private buildIndex(): FederatedIndex {
    const entries: NamespacedIndexEntry[] = [];
    const nsStats: FederatedIndex["namespaces"] = [];
    let totalTokens = 0;

    for (const [ns, { kb, label }] of this.namespaces) {
      const index = kb.index();
      totalTokens += index.totalTokenEstimate;

      nsStats.push({
        namespace: ns,
        label,
        documentCount: index.totalDocuments,
        tokenEstimate: index.totalTokenEstimate,
      });

      for (const entry of index.entries) {
        entries.push({
          ...entry,
          namespace: ns,
          qualifiedId: `${ns}:${entry.docId}`,
        });
      }
    }

    return {
      totalDocuments: entries.length,
      totalTokenEstimate: totalTokens,
      entries,
      namespaces: nsStats,
    };
  }

  // ── Private: tool builder ───────────────────────────────────────────────────

  private buildTools(): Tool[] {
    const {
      maxDocumentChars = 16000,
      maxExcerptChars = 800,
      maxSearchResults = 5,
    } = this.toolOptions;

    // ── list_kb_index ─────────────────────────────────────────────────────

    const listKBIndex = buildTool({
      name: "list_kb_index",
      describe: () => "List all KB articles across all knowledge bases",
      maxResultChars: 12000,
      inputSchema: {
        type: "object" as const,
        properties: {
          namespace: {
            type: "string",
            description: `Optional: filter by KB namespace. Available: ${this.namespaceNames.join(", ")}`,
          },
          entityType: {
            type: "string",
            description: 'Optional: filter by entity type (e.g. "concept", "research_paper")',
          },
        },
        required: [],
      },
      isReadOnly: () => true,
      isConcurrencySafe: () => true,
      call: async ({ namespace, entityType }: { namespace?: string; entityType?: string }) => {
        const index = this.index();

        let filtered = index.entries;
        if (namespace) filtered = filtered.filter((e) => e.namespace === namespace);
        if (entityType) filtered = filtered.filter((e) => e.entityType === entityType);

        // Group by namespace
        const byNs = new Map<string, NamespacedIndexEntry[]>();
        for (const entry of filtered) {
          const group = byNs.get(entry.namespace) ?? [];
          group.push(entry);
          byNs.set(entry.namespace, group);
        }

        const lines: string[] = [`# Federated Knowledge Base (${filtered.length} articles)`, ""];

        for (const [ns, entries] of byNs) {
          const nsInfo = index.namespaces.find((n) => n.namespace === ns);
          lines.push(`## ${nsInfo?.label ?? ns} (${ns}:)`);
          for (const entry of entries) {
            const stub = entry.isStub ? " _(stub)_" : "";
            lines.push(`- **${entry.title}**${stub}: ${entry.summary} \`[${entry.qualifiedId}]\``);
          }
          lines.push("");
        }

        return {
          data: {
            totalArticles: filtered.length,
            totalNamespaces: byNs.size,
            availableNamespaces: this.namespaceNames,
            index: lines.join("\n"),
          },
        };
      },
    });

    // ── fetch_kb_document ─────────────────────────────────────────────────

    const fetchKBDocument = buildTool({
      name: "fetch_kb_document",
      describe: ({ docId }: { docId?: string }) => `Fetch KB article: ${docId ?? "..."}`,
      maxResultChars: maxDocumentChars,
      inputSchema: {
        type: "object" as const,
        properties: {
          docId: {
            type: "string",
            description:
              'Qualified document ID in "namespace:docId" format (e.g. "ml:concepts/attention-mechanism")',
          },
        },
        required: ["docId"],
      },
      isReadOnly: () => true,
      isConcurrencySafe: () => true,
      call: async ({ docId }: { docId: string }): Promise<{ data: unknown }> => {
        const doc = this.getDocument(docId);

        if (!doc) {
          // Try to help with suggestions
          const { namespace, docId: rawDocId } = this.parseQualifiedId(docId);
          const suggestions: string[] = [];

          if (namespace && this.namespaces.has(namespace)) {
            // Namespace valid, docId wrong
            const ns = this.namespaces.get(namespace)!;
            const allDocs = ns.kb.getAllDocuments();
            const slug = rawDocId.split("/").pop() ?? "";
            suggestions.push(
              ...allDocs
                .filter(
                  (d) =>
                    d.docId.includes(slug) || d.title.toLowerCase().includes(slug.toLowerCase()),
                )
                .map((d) => `${namespace}:${d.docId}`)
                .slice(0, 5),
            );
          } else if (!namespace) {
            // No namespace prefix — search all
            for (const [ns, { kb }] of this.namespaces) {
              const allDocs = kb.getAllDocuments();
              suggestions.push(
                ...allDocs
                  .filter(
                    (d) =>
                      d.docId.includes(docId) ||
                      d.title.toLowerCase().includes(docId.toLowerCase()),
                  )
                  .map((d) => `${ns}:${d.docId}`)
                  .slice(0, 3),
              );
            }
          }

          return {
            data: {
              found: false,
              message: namespace
                ? `No article "${rawDocId}" in namespace "${namespace}".`
                : `Invalid docId format. Use "namespace:docId" (e.g. "${this.namespaceNames[0]}:concepts/topic").`,
              availableNamespaces: this.namespaceNames,
              suggestions: suggestions.length > 0 ? suggestions : undefined,
              hint: "Use list_kb_index to see all available articles.",
            },
          };
        }

        const content =
          doc.body.length > maxDocumentChars
            ? doc.body.slice(0, maxDocumentChars) +
              `\n\n[... ${doc.body.length - maxDocumentChars} chars truncated ...]`
            : doc.body;

        return {
          data: {
            found: true,
            namespace: doc.namespace,
            docId: doc.qualifiedId,
            title: doc.title,
            entityType: doc.entityType,
            isStub: doc.isStub,
            wordCount: doc.wordCount,
            content,
          },
        };
      },
    });

    // ── search_kb ─────────────────────────────────────────────────────────

    const searchKB = buildTool({
      name: "search_kb",
      describe: ({ query }: { query?: string }) => `Search KB for "${query ?? "..."}"`,
      maxResultChars: 10000,
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "Search query — a concept name, topic keyword, or phrase",
          },
          namespace: {
            type: "string",
            description: `Optional: search only within a specific KB. Available: ${this.namespaceNames.join(", ")}`,
          },
          entityType: {
            type: "string",
            description:
              'Optional: filter results by entity type (e.g. "concept", "research_paper")',
          },
        },
        required: ["query"],
      },
      isReadOnly: () => true,
      isConcurrencySafe: () => true,
      call: async ({
        query,
        namespace,
        entityType,
      }: {
        query: string;
        namespace?: string;
        entityType?: string;
      }): Promise<{ data: unknown }> => {
        const results = this.search(query, {
          maxResults: maxSearchResults,
          entityType,
          namespace,
        });

        if (results.length === 0) {
          return {
            data: {
              found: 0,
              message: `No articles match "${query}" across ${namespace ? `the ${namespace} KB` : "any KB"}.`,
              availableNamespaces: this.namespaceNames,
              hint: "Use list_kb_index to see all available topics.",
            },
          };
        }

        return {
          data: {
            found: results.length,
            articles: results.map((r) => ({
              namespace: r.namespace,
              docId: r.qualifiedId,
              title: r.title,
              entityType: r.entityType,
              isStub: r.isStub,
              relevance: Math.round(r.score * 100) + "%",
              excerpt: r.excerpt.slice(0, maxExcerptChars),
            })),
          },
        };
      },
    });

    return [listKBIndex, fetchKBDocument, searchKB];
  }

  // ── Private: qualified ID parsing ───────────────────────────────────────────

  private parseQualifiedId(qualifiedId: string): { namespace: string | null; docId: string } {
    const colonIdx = qualifiedId.indexOf(":");
    if (colonIdx === -1) {
      // No namespace prefix — try to find in any KB
      for (const [ns, { kb }] of this.namespaces) {
        if (kb.getDocument(qualifiedId)) {
          return { namespace: ns, docId: qualifiedId };
        }
      }
      return { namespace: null, docId: qualifiedId };
    }

    return {
      namespace: qualifiedId.slice(0, colonIdx),
      docId: qualifiedId.slice(colonIdx + 1),
    };
  }
}
