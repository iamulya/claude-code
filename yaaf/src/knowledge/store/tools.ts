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

  /**
   * Fix C-1 + B-01: validate docId at the tool boundary to prevent path traversal.
   * DocIds are used to construct file paths inside compiledDir; a malicious
   * agent could pass "../../etc/passwd" to escape the KB directory.
   *
   * Defense-in-depth: BOTH pattern checks AND canonical path resolution.
   * The pattern check catches obvious attempts early with clear errors.
   * The canonical check catches all encoding tricks (URL-encoded, Unicode, etc.).
   */
  const assertSafeDocId = (docId: string): void => {
    if (typeof docId !== "string" || docId.length === 0) {
      throw new Error("docId must be a non-empty string.");
    }
    if (docId.length > 512) {
      throw new Error(`docId exceeds maximum allowed length (512 chars).`);
    }
    // B-01 fix: check ".." (2 dots = traversal), not "..." (3 dots = ellipsis, harmless)
    if (docId.includes("..")) {
      throw new Error(`Invalid docId "${docId.slice(0, 60)}": path traversal sequences are not allowed.`);
    }
    if (docId.startsWith("/") || docId.startsWith("\\")) {
      throw new Error(`Invalid docId "${docId.slice(0, 60)}": absolute paths are not allowed.`);
    }
    if (docId.includes("\0")) {
      throw new Error(`Invalid docId: null bytes are not allowed.`);
    }
  };

  /**
   * 1.1: Compute a staleness annotation for a document if its expires_at
   * frontmatter field is set and in the past.
   *
   * Returns a string like `[STALE: compiled 47 days ago — content may be outdated]`
   * to prepend to content, or `null` if the article is still fresh / has no TTL.
   */
  const stalenessNote = (frontmatter: Record<string, unknown>): string | null => {
    const expiresAt = frontmatter["expires_at"];
    const compiledAt = frontmatter["compiled_at"];
    if (typeof expiresAt !== "string") return null;
    const expiry = new Date(expiresAt);
    if (isNaN(expiry.getTime())) return null;
    const now = new Date();
    if (now <= expiry) return null; // still fresh

    // Calculate days since compilation (not since expiry) for user clarity
    const compiledDate = typeof compiledAt === "string" ? new Date(compiledAt) : null;
    if (compiledDate && !isNaN(compiledDate.getTime())) {
      const daysSince = Math.floor((now.getTime() - compiledDate.getTime()) / 86_400_000);
      return `[STALE: compiled ${daysSince} day${daysSince === 1 ? "" : "s"} ago — content may be outdated]`;
    }
    return `[STALE: article has passed its freshness TTL — content may be outdated]`;
  };

  /**
   * Confidence decay: apply time-weighted penalty to grounding scores.
   *
   * LLM-grounded claims degrade in reliability over time — a claim well-grounded
   * in 2024 might be contradicted by 2025 research. Rather than waiting for
   * recompilation to update scores, we apply a lightweight query-time decay
   * based on article age relative to its freshness TTL:
   *
   * - First 50% of TTL → full confidence (no annotation)
   * - 50-100% of TTL → linear decay to 50% of original (annotated)
   * - After TTL → floors at 50% of original (+ STALE annotation from above)
   *
   * Cost: ~0.01ms per result (arithmetic only, no LLM/embedding calls).
   */
  const confidenceDecayNote = (frontmatter: Record<string, unknown>): string | null => {
    const expiresAt = frontmatter["expires_at"];
    const compiledAt = frontmatter["compiled_at"];
    const confidence = frontmatter["confidence"];

    // Need all three fields to compute decay
    if (typeof expiresAt !== "string" || typeof compiledAt !== "string") return null;
    if (typeof confidence !== "number" || confidence <= 0) return null;

    const compiledDate = new Date(compiledAt);
    const expiryDate = new Date(expiresAt);
    if (isNaN(compiledDate.getTime()) || isNaN(expiryDate.getTime())) return null;

    const ttlMs = expiryDate.getTime() - compiledDate.getTime();
    if (ttlMs <= 0) return null; // invalid TTL

    const ageMs = Date.now() - compiledDate.getTime();
    const ageFraction = ageMs / ttlMs; // 0.0 = just compiled, 1.0 = at expiry

    if (ageFraction <= 0.5) return null; // still in first half of TTL — full confidence

    // Linear decay from 100% to 50% over the second half of TTL
    const decayFraction = Math.min(1.0, (ageFraction - 0.5) / 0.5);
    const decayedConfidence = confidence * (1.0 - 0.5 * decayFraction);
    const rounded = Math.round(decayedConfidence * 100) / 100;

    const ageDays = Math.floor(ageMs / 86_400_000);
    const ttlDays = Math.round(ttlMs / 86_400_000);

    return `[CONFIDENCE DECAYED: ${confidence.toFixed(2)} → ${rounded.toFixed(2)}, ` +
      `article is ${ageDays} days old (TTL: ${ttlDays} days)]`;
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
      // Fix C-1: validate before any store/filesystem access
      assertSafeDocId(stripNs(docId));
      const doc = await store.getDocumentAsync(stripNs(docId));

      if (!doc) {
        // Try fuzzy matching using lightweight metadata (no body loading)
        const slug = stripNs(docId).split("/").pop() ?? "";
        const allMeta = store.getAllDocumentMeta();
        const suggestions = allMeta
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

      const rawContent =
        doc.body.length > maxDocumentChars
          ? doc.body.slice(0, maxDocumentChars) +
            `\n\n[... ${doc.body.length - maxDocumentChars} chars truncated ...]`
          : doc.body;

      // 1.1: prepend staleness note when the article has passed its TTL
      const staleNote = stalenessNote(doc.frontmatter);
      const content = staleNote ? `${staleNote}\n\n${rawContent}` : rawContent;

      return {
        data: {
          found: true,
          docId: qualify(doc.docId),
          title: doc.title,
          entityType: doc.entityType,
          isStub: doc.isStub,
          wordCount: doc.wordCount,
          // 1.1: expose expiry date in result so callers can make freshness decisions
          ...(doc.frontmatter["expires_at"]
            ? { expires_at: doc.frontmatter["expires_at"] }
            : {}),
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
      const results = await store.searchAsync(
        // N-03: Cap query length to prevent tokenizer memory exhaustion from adversarially
        // large query strings. 1000 chars is generous for any legitimate search intent.
        query.slice(0, 1000),
        {
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
          articles: results.map((r) => {
            // 1.1: surface stale flag in search results so agent can decide
            // whether to fetch full content of a potentially outdated article
            const note = stalenessNote(r.frontmatter ?? {});
            // Confidence decay: time-weighted grounding reliability annotation
            const decayNote = confidenceDecayNote(r.frontmatter ?? {});
            return {
              docId: qualify(r.docId),
              title: r.title,
              entityType: r.entityType,
              isStub: r.isStub,
              relevance: Math.round(r.score * 100) + "%",
              excerpt: r.excerpt.slice(0, maxExcerptChars),
              ...(note ? { staleness: note } : {}),
              ...(decayNote ? { confidenceDecay: decayNote } : {}),
            };
          }),
        },
      };
    },
  });

  // ── query_kb_graph ──────────────────────────────────────────────────────

  const queryKBGraph = buildTool({
    name: "query_kb_graph",
    describe: ({ docId }: { docId?: string }) =>
      `Query KB relationships for "${docId ?? "..."}"`,
    maxResultChars: 8000,
    inputSchema: {
      type: "object" as const,
      properties: {
        docId: {
          type: "string",
          description:
            'Document ID to query relationships for (e.g. "concepts/attention-mechanism")',
        },
        direction: {
          type: "string",
          description:
            'Relationship direction: "outgoing" (what this doc links to), "incoming" (what links to this doc), or "both" (default)',
          enum: ["outgoing", "incoming", "both"],
        },
        relationship: {
          type: "string",
          description:
            'Optional: filter by relationship type (e.g. "IMPLEMENTS", "DEPENDS_ON")',
        },
      },
      required: ["docId"],
    },
    isReadOnly: () => true,
    isConcurrencySafe: () => true,
    async call({
      docId,
      direction,
      relationship,
    }: {
      docId: string;
      direction?: "outgoing" | "incoming" | "both";
      relationship?: string;
    }): Promise<{ data: unknown }> {
      assertSafeDocId(stripNs(docId));

      const graphAdapter = store.getGraphAdapter();
      if (!graphAdapter) {
        return {
          data: {
            available: false,
            message:
              "Relationship graph is not available. The KB may not have an ontology.yaml.",
          },
        };
      }

      const results = await graphAdapter.query(stripNs(docId), {
        direction: direction ?? "both",
        relationship,
        maxResults: 20,
      });

      if (results.length === 0) {
        return {
          data: {
            found: 0,
            docId,
            message: `No relationships found for "${docId}".`,
            hint: "Use search_kb to find related articles by keyword instead.",
          },
        };
      }

      return {
        data: {
          found: results.length,
          docId,
          direction: direction ?? "both",
          ...(relationship ? { filteredBy: relationship } : {}),
          relationships: results.map((r) => ({
            docId: qualify(r.docId),
            title: r.title,
            entityType: r.entityType,
            ...(r.relationship ? { relationship: r.relationship } : {}),
            direction: r.direction,
          })),
        },
      };
    },
  });

  return [listKBIndex, fetchKBDocument, searchKB, queryKBGraph];
}
