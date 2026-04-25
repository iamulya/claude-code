/**
 * Memory Relevance Engine
 *
 * to select the most relevant memories from the store for a given user query.
 *
 * Design rationale:
 * 1. Always loads MEMORY.md (the index) into the system prompt
 * 2. Scans all memory file headers (name + description from frontmatter)
 * 3. Asks a fast model (Sonnet) to select ≤5 relevant memories
 * 4. Injects only those as attachments to the current turn
 *
 * This keeps context lean while still giving the agent access to hundreds
 * of memories. The selection step costs ~1-2 cents and adds ~200ms latency.
 */

import type { MemoryHeader } from "./memoryStore.js";
import { safeParseJson, MemoryRelevanceResponseSchema } from "../schemas.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type RelevantMemory = {
  path: string;
  mtimeMs: number;
  filename: string;
};

/**
 * Function signature for the LLM call used by the relevance engine.
 * Consumers inject their own LLM adapter to keep the framework model-agnostic.
 */
export type RelevanceQueryFn = (params: {
  system: string;
  userMessage: string;
  maxTokens: number;
  signal?: AbortSignal;
}) => Promise<string>;

// ── Constants ────────────────────────────────────────────────────────────────

const SELECT_SYSTEM_PROMPT = `You are selecting memories that will be useful to an AI assistant as it processes a user's query. You will be given the user's query and a list of available memory files with their filenames and descriptions.

Return a JSON object with a "selected_memories" array of filenames for the memories that will clearly be useful (up to 5). Only include memories you are certain will be helpful.
- If unsure, do not include it.
- If no memories are relevant, return an empty array.
- If recently-used tools are listed, skip reference/API docs for those tools — but DO select warnings, gotchas, or known issues about those tools.

Respond ONLY with valid JSON: {"selected_memories": ["file1.md", "file2.md"]}`;

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * Selects relevant memories for a given query using an LLM.
 *
 * @example
 * ```ts
 * const engine = new MemoryRelevanceEngine(async ({ system, userMessage, maxTokens }) => {
 * const response = await callSonnet({ system, messages: [{ role: 'user', content: userMessage }], maxTokens });
 * return response.text;
 * });
 *
 * const memories = await engine.findRelevant(
 * 'How do I configure the build system?',
 * allHeaders,
 * signal,
 * );
 * ```
 */
export class MemoryRelevanceEngine {
  private readonly queryFn: RelevanceQueryFn;
  /**
   * Maximum number of memory headers included in the manifest
   * sent to the relevance LLM. Without this cap, a store with 1,000 entries
   * × 60 chars/line = 60 KB per query, burning thousands of tokens every turn.
   * Default: 200 entries.
   */
  private readonly maxManifestEntries: number;

  constructor(queryFn: RelevanceQueryFn, maxManifestEntries = 200) {
    this.queryFn = queryFn;
    this.maxManifestEntries = maxManifestEntries;
  }

  /**
   * Find memory files relevant to a query.
   *
   * @param query - The user's current query / task description
   * @param memories - All available memory headers (from MemoryStore.scan)
   * @param signal - AbortSignal for cancellation
   * @param recentTools - Tool names used recently (to avoid re-surfacing their docs)
   * @param alreadySurfaced - Paths already shown in prior turns (budget optimization)
   * @returns Up to 5 relevant memory entries
   */
  async findRelevant(
    query: string,
    memories: MemoryHeader[],
    signal?: AbortSignal,
    recentTools: readonly string[] = [],
    alreadySurfaced: ReadonlySet<string> = new Set(),
  ): Promise<RelevantMemory[]> {
    // Filter out already-surfaced memories
    const candidates = memories.filter((m) => !alreadySurfaced.has(m.filePath));
    if (candidates.length === 0) return [];

    // Cap manifest size to prevent cost amplification.
    // With hundreds of candidates, the LLM call would burn tokens proportional
    // to the store size on every agent turn.
    const cappedCandidates =
      candidates.length > this.maxManifestEntries
        ? candidates.slice(0, this.maxManifestEntries)
        : candidates;

    // Build manifest of available memories
    const manifest = cappedCandidates
      .map((m) => `- ${m.filename}: ${m.description || m.name}`)
      .join("\n");

    const toolsSection =
      recentTools.length > 0 ? `\n\nRecently used tools: ${recentTools.join(", ")}` : "";

    try {
      const result = await this.queryFn({
        system: SELECT_SYSTEM_PROMPT,
        userMessage: `Query: ${query}\n\nAvailable memories:\n${manifest}${toolsSection}`,
        maxTokens: 256,
        signal,
      });

      // Sprint 1b: Validate LLM output with Zod schema
      const parsed = safeParseJson(result, MemoryRelevanceResponseSchema);
      if (!parsed.success) return [];

      const validFilenames = new Set(cappedCandidates.map((m) => m.filename));
      const selected = parsed.data.selected_memories.filter((f) => validFilenames.has(f)).slice(0, 5);

      const byFilename = new Map(cappedCandidates.map((m) => [m.filename, m]));
      return selected
        .map((filename) => byFilename.get(filename))
        .filter((m): m is MemoryHeader => m !== undefined)
        .map((m) => ({
          path: m.filePath,
          mtimeMs: m.mtimeMs,
          filename: m.filename,
        }));
    } catch {
      // Selection failure is non-fatal — agent works without extra memories
      return [];
    }
  }
}
