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
import { estimateTokens } from "../../utils/tokens.js";


// ── Types ─────────────────────────────────────────────────────────────────────

export type FederatedKBEntry = {
  /** The loaded KnowledgeBase instance */
  kb: KnowledgeBase;
  /** Human-readable label for this KB (used in system prompt). Defaults to namespace. */
  label?: string;
  /**
   * ADR-012/Fix-5: Trust weight for this namespace (0.0–1.0). Default: 1.0.
   *
   * Applied as a multiplier AFTER fixed-point sigmoid normalization.
   * Allows operators to explicitly discount KBs from less-trusted sources
   * in a multi-KB federation, without gating on content-level signals.
   *
   * Example: { trustWeight: 0.75 } reduces all scores from this namespace
   * by 25%, ensuring a high-scoring result from a low-trust KB cannot
   * outrank a lower-scoring result from a high-trust KB.
   *
   * NOTE: This only mitigates the federated score rigging risk (see ADR-012).
   * It does not substitute for operator-level assessment of KB quality.
   */
  trustWeight?: number;
};

export type FederatedKBConfig = Record<string, KnowledgeBase | FederatedKBEntry>;

export type FederatedKBOptions = {
  /** Options passed to the generated tools */
  toolOptions?: KBToolOptions;
  /**
   * Maximum token budget for the system prompt KB section.
   * Same progressive degradation as KnowledgeBaseOptions.systemPromptMaxTokens.
   * Default: 3000 tokens (federations have more namespaces to describe).
   */
  systemPromptMaxTokens?: number;
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
  private readonly namespaces: Map<string, { kb: KnowledgeBase; label: string; trustWeight: number }>;
  private readonly toolOptions: KBToolOptions;
  private readonly systemPromptMaxTokens: number;
  private cachedIndex?: FederatedIndex;
  private cachedTools?: Tool[];

  private constructor(
    namespaces: Map<string, { kb: KnowledgeBase; label: string; trustWeight: number }>,
    toolOptions: KBToolOptions = {},
    systemPromptMaxTokens?: number,
  ) {
    this.namespaces = namespaces;
    this.toolOptions = toolOptions;
    this.systemPromptMaxTokens = systemPromptMaxTokens ?? 3000;
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
    const namespaces = new Map<string, { kb: KnowledgeBase; label: string; trustWeight: number }>();

    for (const [ns, value] of Object.entries(config)) {
      if (ns.includes(":")) {
        throw new Error(`Namespace "${ns}" must not contain ':'`);
      }

      const raw = value instanceof KnowledgeBase ? value : value.kb;
      const label = value instanceof KnowledgeBase ? ns : (value.label ?? ns);
      // ADR-012/Fix-5: clamp to [0,1] at storage time so the runtime path is fast
      const trustWeight = value instanceof KnowledgeBase ? 1.0
        : Math.min(1.0, Math.max(0.0, value.trustWeight ?? 1.0));

      // Apply namespace to the KB so its tools always emit namespace:docId
      namespaces.set(ns, { kb: raw.withNamespace(ns), label, trustWeight });
    }

    if (namespaces.size === 0) {
      throw new Error("FederatedKnowledgeBase requires at least one namespace");
    }

    return new FederatedKnowledgeBase(namespaces, options?.toolOptions, options?.systemPromptMaxTokens);
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
   * Progressively degrades when the index exceeds `systemPromptMaxTokens`:
   *   1. Full listing (title + docId per article, grouped by namespace/type)
   *   2. Compact listing (namespace → article count + type breakdown only)
   *   3. Summary only (namespace names and counts)
   */
  systemPromptSection(): string {
    const index = this.index();
    const maxTokens = this.systemPromptMaxTokens;

    const headerLines = [
      `## Federated Knowledge Base (${index.namespaces.length} sources, ${index.totalDocuments} articles, ~${index.totalTokenEstimate.toLocaleString()} tokens)`,
      "",
      "You have access to multiple knowledge bases. Use the following tools to retrieve information:",
      "- **list_kb_index**: see all available articles (optionally filter by namespace)",
      "- **fetch_kb_document**: get an article by qualified ID (`namespace:docId`)",
      "- **search_kb**: search across all knowledge bases by keyword",
      "",
    ];

    // === Strategy 1: Full listing ===
    const fullLines = [...headerLines, "### Knowledge Base Sources", ""];
    for (const ns of index.namespaces) {
      fullLines.push(`- **${ns.label}** (namespace: \`${ns.namespace}\`) — ${ns.documentCount} articles`);
    }
    fullLines.push("", "### Available Articles", "");

    for (const ns of index.namespaces) {
      fullLines.push(`#### ${ns.label} (\`${ns.namespace}:\`)`);
      fullLines.push("");
      const nsEntries = index.entries.filter((e) => e.namespace === ns.namespace);
      const byType = new Map<string, NamespacedIndexEntry[]>();
      for (const entry of nsEntries) {
        const group = byType.get(entry.entityType) ?? [];
        group.push(entry);
        byType.set(entry.entityType, group);
      }
      for (const [type, entries] of byType) {
        const typeLabel = type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        fullLines.push(`**${typeLabel}s:**`);
        for (const entry of entries) {
          const stub = entry.isStub ? " _(stub)_" : "";
          fullLines.push(`- ${entry.title}${stub} \`[${entry.qualifiedId}]\``);
        }
        fullLines.push("");
      }
    }
    const fullText = fullLines.join("\n");
    if (this.estimateTokenCount(fullText) <= maxTokens) return fullText;

    // === Strategy 2: Compact (namespace + type counts, no docIds) ===
    const compactLines = [...headerLines, "### Knowledge Base Sources", ""];
    for (const ns of index.namespaces) {
      const nsEntries = index.entries.filter((e) => e.namespace === ns.namespace);
      const byType = new Map<string, number>();
      for (const e of nsEntries) byType.set(e.entityType, (byType.get(e.entityType) ?? 0) + 1);
      const typeBreakdown = [...byType.entries()]
        .map(([t, n]) => `${n} ${t.replace(/_/g, " ")}`)
        .join(", ");
      compactLines.push(`- **${ns.label}** (\`${ns.namespace}:\`) — ${ns.documentCount} articles: ${typeBreakdown}`);
    }
    compactLines.push("", "_Use search_kb or list_kb_index for individual articles._");
    const compactText = compactLines.join("\n");
    if (this.estimateTokenCount(compactText) <= maxTokens) return compactText;

    // === Strategy 3: Summary only ===
    const summaryLines = [...headerLines, "### Available Knowledge Bases", ""];
    for (const ns of index.namespaces) {
      summaryLines.push(`- **${ns.label}** (\`${ns.namespace}:\`): ${ns.documentCount} articles`);
    }
    summaryLines.push("", "_Use search_kb to find articles, or list_kb_index for the full directory._");
    return summaryLines.join("\n");
  }

  private estimateTokenCount(text: string): number {
    // 4.3 fix: use CJK-aware estimateTokens (same as KnowledgeBase) instead of
    // naive length/4. For CJK-heavy KBs, length/4 underestimates by ~2.7×,
    // causing the federated system prompt to silently exceed its token budget.
    return estimateTokens(text);
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
   * Fetch a document by qualified ID (`namespace:docId`). Async, lazy-safe.
   */
  async getDocumentAsync(qualifiedId: string): Promise<NamespacedDocument | undefined> {
    const { namespace, docId } = this.parseQualifiedId(qualifiedId);
    if (!namespace) return undefined;

    const ns = this.namespaces.get(namespace);
    if (!ns) return undefined;

    const doc = await ns.kb.getDocumentAsync(docId);
    if (!doc) return undefined;

    return { ...doc, namespace, qualifiedId: `${namespace}:${doc.docId}` };
  }

  /**
   * Fetch a document by qualified ID (`namespace:docId`).
   * @deprecated Use `getDocumentAsync()` — returns empty body in lazy mode.
   */
  getDocument(qualifiedId: string): NamespacedDocument | undefined {
    const { namespace, docId } = this.parseQualifiedId(qualifiedId);
    if (!namespace) return undefined;
    const ns = this.namespaces.get(namespace);
    if (!ns) return undefined;
    const doc = ns.kb.getDocument(docId);
    if (!doc) return undefined;
    return { ...doc, namespace, qualifiedId: `${namespace}:${doc.docId}` };
  }

  /**
   * Search across all KBs, merging and ranking results.
   * Uses the full TF-IDF adapter (async, lazy-safe).
   *
   * P2-2: Applies per-KB min-max score normalization before merging so TF-IDF
   * scores from a 3-article KB and a 3000-article KB are on the same [0,1] scale.
   * Without normalization the small KB always wins because its IDF values are
   * much larger (log(N/df) with N=3 vs N=3000).
   */
  async searchAsync(
    query: string,
    options?: {
      maxResults?: number;
      entityType?: string;
      namespace?: string;
    },
  ): Promise<NamespacedSearchResult[]> {
    const { maxResults = 10, entityType, namespace: nsFilter } = options ?? {};

    // Collect results per namespace so we can normalize before merging (P2-2)
    const resultsByNs: Array<NamespacedSearchResult[]> = [];

    await Promise.all(
      Array.from(this.namespaces.entries()).map(async ([ns, { kb }]) => {
        if (nsFilter && ns !== nsFilter) return;
        const results = await kb.searchAsync(query, { maxResults: maxResults * 2, entityType });
        const tagged = results.map((r) => ({
          ...r,
          namespace: ns,
          qualifiedId: `${ns}:${r.docId}`,
        } as NamespacedSearchResult));
        resultsByNs.push(tagged);
      }),
    );

    // F-1: Fixed-point sigmoid normalization per KB before merging.
    //
    // History of decisions:
    //  - Original: raw TF-IDF scores merged directly — small KBs always won
    //    because log(N/df) with N=3 yields much larger IDF than N=3000.
    //  - Min-max normalization: raised 0.5 to 1.0 if it was the local max;
    //    erased absolute quality signals; single-result KBs always scored 1.0.
    //  - Z-score + sigmoid: fixed the outlier problem but spread tightly-clustered
    //    high-relevance results across [0.2, 0.8]. Five 90%-relevant results
    //    became [0.21, 0.36, 0.50, 0.64, 0.79] — the bottom wrongly excluded.
    //
    // Fixed-point sigmoid: sigmoid(k×(x - 0.5)) with k=6.
    //   x=0.95 → 0.937  (high relevance stays high)
    //   x=0.50 → 0.500  (midpoint unchanged)
    //   x=0.05 → 0.063  (low relevance stays low)
    //
    // This is NOT data-dependent (no mean/stdev computed), so absolute quality
    // is preserved across all namespaces on the same scale.
    //
    // ADR-012/Fix-5: After sigmoid, apply per-namespace trustWeight (default 1.0).
    // This is a downgrade-only operator control: trustWeight ∈ [0, 1].
    const K = 6;
    const fixedSigmoid = (x: number) => 1 / (1 + Math.exp(-K * (x - 0.5)));

    const allResults: NamespacedSearchResult[] = [];
    for (const nsResults of resultsByNs) {
      if (nsResults.length === 0) continue;
      const ns = nsResults[0]!.namespace;
      const trustWeight = Math.min(1.0, Math.max(0.0,
        this.namespaces.get(ns)?.trustWeight ?? 1.0,
      ));
      for (const r of nsResults) {
        allResults.push({ ...r, score: fixedSigmoid(r.score) * trustWeight });
      }
    }

    // J-3: Code-point tiebreak — localeCompare() without explicit locale varies across
    // OS environments (LANG=C vs LANG=tr_TR etc). Use < / > for deterministic ordering.
    allResults.sort((a, b) => b.score - a.score || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0));
    return allResults.slice(0, maxResults);
  }

  /**
   * @deprecated Use `searchAsync()` — uses TF-IDF plugin correctly.
   * This sync shim iterates empty document maps in lazy mode.
   */
  search(
    query: string,
    options?: { maxResults?: number; entityType?: string; namespace?: string },
  ): NamespacedSearchResult[] {
    const { maxResults = 10, entityType, namespace: nsFilter } = options ?? {};
    const allResults: NamespacedSearchResult[] = [];
    for (const [ns, { kb }] of this.namespaces) {
      if (nsFilter && ns !== nsFilter) continue;
      const results = kb.search(query, { maxResults: maxResults * 2, entityType });
      for (const r of results) {
        allResults.push({ ...r, namespace: ns, qualifiedId: `${ns}:${r.docId}` });
      }
    }
    // J-3: Code-point tiebreak (same fix as searchAsync).
    allResults.sort((a, b) => b.score - a.score || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0));
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
   *
   * 7.4 fix: clear caches AFTER all constituent KBs have reloaded.
   * The previous implementation cleared `cachedIndex` before the reload
   * started, so a concurrent query during the reload window would call
   * `buildIndex()` against partially-loaded stores and return an
   * empty or inconsistent index. The stale cache served until reload
   * completes is a much safer tradeoff.
   */
  async reload(): Promise<void> {
    await Promise.all(Array.from(this.namespaces.values()).map(({ kb }) => kb.reload()));
    // Invalidate caches only after all stores are loaded — atomic swap
    this.cachedIndex = undefined;
    this.cachedTools = undefined;
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
            // P2-4: close over the live Map so reload() always reflects current namespaces,
            // not a snapshot string captured at buildTools() call time
            description: `Optional: filter by KB namespace. Available: ${Array.from(this.namespaces.keys()).join(", ")}`,
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
        const doc = await this.getDocumentAsync(docId);

        if (!doc) {
          // Try to help with suggestions using metadata only (no body loading)
          const { namespace, docId: rawDocId } = this.parseQualifiedId(docId);
          const suggestions: string[] = [];

          if (namespace && this.namespaces.has(namespace)) {
            // Namespace valid, docId wrong
            const ns = this.namespaces.get(namespace)!;
            const slug = rawDocId.split("/").pop() ?? "";
            suggestions.push(
              ...ns.kb.getAllDocumentMeta()
                .filter(
                  (d) =>
                    d.docId.includes(slug) || d.title.toLowerCase().includes(slug.toLowerCase()),
                )
                .map((d) => `${namespace}:${d.docId}`)
                .slice(0, 5),
            );
          } else if (!namespace) {
            // No namespace prefix — search all metas
            for (const [ns, { kb }] of this.namespaces) {
              suggestions.push(
                ...kb.getAllDocumentMeta()
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
        // P2-4: use live namespace keys, not snapshot from buildTools() time
      }): Promise<{ data: unknown }> => {
        const results = await this.searchAsync(query, {
          maxResults: maxSearchResults,
          entityType,
          namespace,
        });

        if (results.length === 0) {
          return {
            data: {
              found: 0,
              message: `No articles match "${query}" across ${namespace ? `the ${namespace} KB` : "any KB"}.`,
              availableNamespaces: Array.from(this.namespaces.keys()),
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
      // P0-7/P3-6: Use getDocumentMeta (always safe, no body load) instead of the deprecated
      // getDocument() whose truthy-object check returns true for ANY docId with metadata
      // in lazy mode (body is empty string but the object itself is truthy).
      for (const [ns, { kb }] of this.namespaces) {
        if (kb._getStore().getDocumentMeta(qualifiedId)) {
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
