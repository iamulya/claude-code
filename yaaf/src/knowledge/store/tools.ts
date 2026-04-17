/**
 * KB Runtime Tools — Agent-facing tools for querying a compiled Knowledge Base
 *
 * These tools give any YAAF agent the ability to browse, search, and read
 * from a compiled KB at runtime. No RAG, no vectors — pure document retrieval.
 *
 * Tools:
 * - list_kb_index: returns the llms.txt-style table of contents
 * - fetch_kb_document: returns the full content of a specific article
 * - search_kb: keyword search across all articles
 */

import { buildTool, type Tool } from "../../tools/tool.js";
import type { KBStore } from "./store.js";

// ── Tool factory ──────────────────────────────────────────────────────────────

export type KBToolOptions = {
  /** Maximum characters for fetch_kb_document results. Default: 16000 */
  maxDocumentChars?: number;
  /** Maximum characters for search_kb excerpts. Default: 800 */
  maxExcerptChars?: number;
  /** Maximum search results returned. Default: 5 */
  maxSearchResults?: number;
};

/**
 * Create the three KB runtime tools from a loaded KBStore.
 *
 * @example
 * ```ts
 * const store = new KBStore('./my-kb')
 * await store.load()
 * const tools = createKBTools(store)
 * const agent = new Agent({ tools })
 * ```
 */
export function createKBTools(
  store: KBStore,
  options: KBToolOptions = {},
  namespace?: string,
): Tool[] {
  const { maxDocumentChars = 16000, maxExcerptChars = 800, maxSearchResults = 5 } = options;

  /** Prefix a docId with the namespace when one is configured. */
  const qualify = (docId: string): string => (namespace ? `${namespace}:${docId}` : docId);

  /**
   * Strip namespace prefix before looking up in the store.
   * Accepts both `namespace:docId` and plain `docId`.
   */
  const stripNs = (docId: string): string => {
    if (!namespace) return docId;
    const prefix = `${namespace}:`;
    return docId.startsWith(prefix) ? docId.slice(prefix.length) : docId;
  };

  // ── list_kb_index ─────────────────────────────────────────────────────────

  const listKBIndex = buildTool({
    name: "list_kb_index",
    describe: () => "List all KB articles",
    maxResultChars: 8000,
    inputSchema: {
      type: "object" as const,
      properties: {
        entityType: {
          type: "string",
          description:
            'Optional: filter by entity type (e.g. "concept", "research_paper"). Omit for all types.',
        },
      },
      required: [],
    },
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    async call({ entityType }: { entityType?: string }) {
      const index = store.buildIndex();

      const filtered = entityType
        ? { ...index, entries: index.entries.filter((e) => e.entityType === entityType) }
        : index;

      // Qualify docIds in the formatted text when namespace is set
      let indexText = store.formatIndexAsLlmsTxt(filtered);
      if (namespace) {
        indexText = indexText.replace(/\[([^\]]+)\]/g, (_, id) => `[${qualify(id)}]`);
      }

      return {
        data: {
          totalArticles: filtered.entries.length,
          totalTokenEstimate: index.totalTokenEstimate,
          ...(namespace ? { namespace } : {}),
          index: indexText,
        },
      };
    },
  });

  // ── fetch_kb_document ─────────────────────────────────────────────────────

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
            'The document ID to fetch (e.g. "concepts/attention-mechanism", "research-papers/bert")',
        },
      },
      required: ["docId"],
    },
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    async call({ docId }: { docId: string }): Promise<{ data: unknown }> {
      const doc = store.getDocument(stripNs(docId));

      if (!doc) {
        // Try fuzzy matching
        const slug = stripNs(docId).split("/").pop() ?? "";
        const allDocs = store.getAllDocuments();
        const suggestions = allDocs
          .filter(
            (d) => d.docId.includes(slug) || d.title.toLowerCase().includes(slug.toLowerCase()),
          )
          .map((d) => qualify(d.docId))
          .slice(0, 5);

        return {
          data: {
            found: false,
            message: `No article with docId "${docId}".`,
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
          docId: qualify(doc.docId),
          title: doc.title,
          entityType: doc.entityType,
          isStub: doc.isStub,
          wordCount: doc.wordCount,
          content,
        },
      };
    },
  });

  // ── search_kb ─────────────────────────────────────────────────────────────

  const searchKB = buildTool({
    name: "search_kb",
    describe: ({ query }: { query?: string }) => `Search KB for "${query ?? "..."}"`,
    maxResultChars: 8000,
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query — a concept name, paper title, or topic keyword",
        },
        entityType: {
          type: "string",
          description: 'Optional: filter results by entity type (e.g. "concept", "research_paper")',
        },
      },
      required: ["query"],
    },
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    async call({
      query,
      entityType,
    }: {
      query: string;
      entityType?: string;
    }): Promise<{ data: unknown }> {
      const results = store.search(query, {
        maxResults: maxSearchResults,
        entityType,
      });

      if (results.length === 0) {
        return {
          data: {
            found: 0,
            message: `No KB articles match "${query}". The KB may not cover this topic.`,
            hint: "Use list_kb_index to see all available topics.",
          },
        };
      }

      return {
        data: {
          found: results.length,
          articles: results.map((r) => ({
            docId: qualify(r.docId),
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
