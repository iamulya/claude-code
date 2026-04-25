/**
 * Memory Strategy Plugin System
 *
 * Provides a pluggable architecture for how agents store, retrieve, and
 * manage persistent memory across conversations. Inspired by the main
 * repository's multi-tier memory system.
 *
 * YAAF already has `MemoryStore` (file-based) and `MemoryRelevanceEngine`
 * (LLM-selected retrieval). This module adds the **strategy layer** on top:
 *
 * 1. When to extract memory (trigger policy)
 * 2. How to extract (extraction strategy)
 * 3. How to retrieve at prompt-build time (retrieval strategy)
 * 4. How to maintain/prune over time (lifecycle policy)
 *
 * Users choose and compose strategies to match their agent's needs.
 *
 * ## Strategy Types
 *
 * | Strategy | Purpose | Main Repo Source |
 * |----------|---------|-----------------|
 * | `SessionMemoryExtractor` | Background extraction into structured notes | `SessionMemory/` |
 * | `TopicFileExtractor` | Write individual topic files with frontmatter | `memdir/` |
 * | `EphemeralBufferStrategy` | In-memory rolling buffer (no persistence) | N/A (lightweight) |
 * | `LLMRetrievalStrategy` | LLM-selected relevant memories per turn | `findRelevantMemories` |
 * | `RecencyRetrievalStrategy` | Most-recently-updated memories | N/A (simple baseline) |
 * | `CompositeMemoryStrategy` | Compose extraction + retrieval strategies | Custom |
 * | `HonchoMemoryStrategy` | Cloud memory + user modeling via Honcho API | `integrations/honcho.ts` |
 *
 * @example
 * ```ts
 * // Session memory (like Claude Code)
 * const agent = new Agent({
 * memory: new SessionMemoryExtractor({
 * store: myStore,
 * llm: myModel,
 * template: DEFAULT_SESSION_MEMORY_TEMPLATE,
 * }),
 * });
 *
 * // Composite: extract to topic files, retrieve with LLM selection
 * const agent = new Agent({
 * memory: new CompositeMemoryStrategy({
 * extraction: new TopicFileExtractor({ store: myStore }),
 * retrieval: new LLMRetrievalStrategy({ queryFn: myQueryFn }),
 * }),
 * });
 * ```
 */

import type { MemoryStore, MemoryHeader, MemoryType, MemoryEntry } from "./memoryStore.js";
import { MEMORY_TYPES } from "./memoryStore.js";
import { MemoryRelevanceEngine, type RelevanceQueryFn, type RelevantMemory } from "./relevance.js";
import { TopicExtractionSchema } from "../schemas.js";

// ── W7-01 Helper: Memory Sanitizer ─────────────────────────────────────────────────────

/**
 * Strip known prompt-injection control tokens from memory content
 * before injecting into the system prompt. This is a defence-in-depth measure
 * against stored prompt injection where a rogue tool result writes
 * system-prompt override instructions into a memory file.
 *
 * Strips:
 * - ChatML control tokens: `<|im_start|>`, `<|im_end|>`, `<|system|>`
 * - Anthropic Human/Assistant markers: `\n\nHuman:`, `\n\nAssistant:`
 * - XML-style system/role overrides: `<system>`, `<instructions>`
 * - Null bytes (can cause parser issues)
 */
function sanitizeMemoryContent(content: string): string {
  return content
    .replace(/<\|im_start\|>/gi, "[im_start]")
    .replace(/<\|im_end\|>/gi, "[im_end]")
    .replace(/<\|system\|>/gi, "[system]")
    .replace(/<\|user\|>/gi, "[user]")
    .replace(/<\|assistant\|>/gi, "[assistant]")
    .replace(/\n\nHuman:/gi, "\n\n[Human:]")
    .replace(/\n\nAssistant:/gi, "\n\n[Assistant:]")
    .replace(/<system>/gi, "[system]")
    .replace(/<\/system>/gi, "[/system]")
    .replace(/<instructions>/gi, "[instructions]")
    .replace(/<\/instructions>/gi, "[/instructions]")
    .replace(/\0/g, ""); // strip null bytes
}

// ── Core Interfaces ──────────────────────────────────────────────────────────

/**
 * Context provided to memory strategies on each turn.
 * Gives strategies access to the current conversation state
 * without coupling to ContextManager internals.
 */
export type MemoryContext = {
  /** Current conversation messages (role + content) */
  messages: ReadonlyArray<{ role: string; content: string; timestamp?: number }>;
  /** The user's most recent query */
  currentQuery: string;
  /** Estimated total tokens in the conversation */
  totalTokens: number;
  /** Number of tool calls since last extraction */
  toolCallsSinceExtraction: number;
  /** Tool names used recently (for relevance filtering) */
  recentTools?: readonly string[];
  /** Abort signal */
  signal?: AbortSignal;
};

/**
 * Result of a memory extraction operation.
 * Returned by extraction strategies after processing messages.
 */
export type ExtractionResult = {
  /** Whether extraction actually happened */
  extracted: boolean;
  /** Human-readable summary of what was extracted */
  summary?: string;
  /** Number of facts/entries extracted or updated */
  factsExtracted?: number;
  /** Token cost of the extraction (input + output) */
  tokenCost?: number;
};

/**
 * Result of a memory retrieval operation.
 * Returned by retrieval strategies when building the prompt.
 */
export type RetrievalResult = {
  /** Text to inject into the system prompt */
  systemPromptSection: string;
  /** Individual memories that were selected */
  selectedMemories: Array<{
    name: string;
    content: string;
    relevanceScore?: number;
  }>;
  /** Total tokens consumed by the returned content */
  tokenEstimate: number;
};

// ── Extraction Strategy ──────────────────────────────────────────────────────

/**
 * Extraction strategy — decides WHEN and HOW to extract knowledge
 * from the conversation into persistent storage.
 *
 * Called on every turn during the agent loop. Strategies decide
 * internally whether extraction is needed (threshold checks).
 */
export interface MemoryExtractionStrategy {
  /** Strategy name for logging */
  readonly name: string;

  /**
   * Check if extraction should run this turn.
   * Called before every LLM call. Return true to trigger `extract()`.
   */
  shouldExtract(ctx: MemoryContext): boolean | Promise<boolean>;

  /**
   * Extract knowledge from the conversation and persist it.
   * Only called when `shouldExtract()` returns true.
   */
  extract(ctx: MemoryContext): Promise<ExtractionResult>;

  /**
   * Reset extraction state (e.g., after compaction clears messages).
   */
  reset?(): void;
}

// ── Retrieval Strategy ───────────────────────────────────────────────────────

/**
 * Retrieval strategy — decides HOW to select and format memories
 * for injection into the LLM's context on each turn.
 *
 * Called at prompt-build time. The returned content is injected
 * into the system prompt.
 */
export interface MemoryRetrievalStrategy {
  /** Strategy name for logging */
  readonly name: string;

  /**
   * Build the memory section for the current turn's system prompt.
   * Should be token-aware — stay within budget.
   */
  retrieve(ctx: MemoryContext): Promise<RetrievalResult>;
}

// ── Combined Interface ───────────────────────────────────────────────────────

/**
 * Full memory strategy — combines extraction and retrieval.
 * This is the type accepted by `AgentConfig.memoryStrategy`.
 */
export interface MemoryStrategy extends MemoryExtractionStrategy, MemoryRetrievalStrategy {
  /** Initialize the strategy (create dirs, load state, etc.) */
  initialize?(): Promise<void>;
  /** Shutdown (flush buffers, close connections) */
  destroy?(): Promise<void>;
}

// ══════════════════════════════════════════════════════════════════════════════
// Built-in Strategies
// ══════════════════════════════════════════════════════════════════════════════

// ── 1. Session Memory Extractor ──────────────────────────────────────────────

/**
 * Default session memory template — structured markdown with sections
 * for each knowledge category. Modeled after the main repo's
 * `DEFAULT_SESSION_MEMORY_TEMPLATE` from `SessionMemory/prompts.ts`.
 */
export const DEFAULT_SESSION_MEMORY_TEMPLATE = `
# Session Title
_A short and distinctive 5-10 word descriptive title for the session_

# Current State
_What is actively being worked on right now? Pending tasks not yet completed. Immediate next steps._

# Task Specification
_What did the user ask to build? Any design decisions or other explanatory context_

# Files and Functions
_What are the important files? In short, what do they contain and why are they relevant?_

# Workflow
_What bash commands are usually run and in what order? How to interpret their output if not obvious?_

# Errors & Corrections
_Errors encountered and how they were fixed. What did the user correct? What approaches failed and should not be tried again?_

# Codebase and System Documentation
_What are the important system components? How do they work/fit together?_

# Learnings
_What has worked well? What has not? What to avoid? Do not duplicate items from other sections_

# Key Results
_If the user asked a specific output such as an answer to a question, a table, or other document, repeat the exact result here_

# Worklog
_Step by step, what was attempted, done? Very terse summary for each step_
`;

/**
 * Session memory extraction strategy — the core of the main repo's
 * `SessionMemory` system.
 *
 * Periodically extracts key information from the conversation into
 * a structured markdown file (session notes), using a background
 * LLM call. The notes persist across compaction and serve as the
 * agent's long-term working memory.
 *
 * Trigger policy (from main repo):
 * - Wait until `minimumTokensToInit` tokens accumulated (cold start)
 * - Then extract every `minimumTokensBetweenUpdate` tokens AND
 * `toolCallsBetweenUpdates` tool calls
 * - Also extract at natural breaks (no tool calls in last assistant turn)
 */
export type SessionMemoryExtractorConfig = {
  /**
   * LLM function for running the extraction.
   * Receives the conversation + current notes and should return updated notes.
   */
  extractFn: (params: {
    messages: ReadonlyArray<{ role: string; content: string }>;
    currentNotes: string;
    systemPrompt: string;
    signal?: AbortSignal;
  }) => Promise<string>;

  /** Where to persist the session notes. Default: in-memory only. */
  storagePath?: string;

  /** Custom template. Default: DEFAULT_SESSION_MEMORY_TEMPLATE */
  template?: string;

  /** Minimum tokens before first extraction. Default: 10_000 */
  minimumTokensToInit?: number;

  /** Minimum token growth between extractions. Default: 5_000 */
  minimumTokensBetweenUpdate?: number;

  /** Minimum tool calls between extractions. Default: 3 */
  toolCallsBetweenUpdates?: number;

  /** Maximum tokens per section. Default: 2_000 */
  maxSectionTokens?: number;

  /** Maximum total tokens for session notes. Default: 12_000 */
  maxTotalTokens?: number;

  /** Custom extraction prompt (overrides the built-in). */
  customPrompt?: string;

  /** Token estimation function */
  estimateTokens?: (text: string) => number;
};

/**
 * The extraction prompt sent to the LLM to update session notes.
 * Modeled after the main repo's `getDefaultUpdatePrompt()`.
 */
function buildExtractionPrompt(currentNotes: string, notesLabel: string): string {
  return `Based on the conversation above, update the session notes.

Here are the current notes:
<current_notes>
${currentNotes}
</current_notes>

Your ONLY task is to return the COMPLETE updated notes file. Maintain the exact structure with all section headers and italic descriptions intact.

CRITICAL RULES:
- NEVER modify, delete, or add section headers (lines starting with '#')
- NEVER modify or delete the italic _section description_ lines
- ONLY update the actual content that appears BELOW the italic descriptions
- Write DETAILED, INFO-DENSE content — include file paths, function names, error messages, exact commands
- Keep each section under ~2000 tokens — condense by cycling out less important details
- ALWAYS update "Current State" to reflect the most recent work
- Focus on actionable, specific information
- Do NOT add filler content like "No info yet" — leave sections blank if no content

Return the complete updated notes file with all sections.`;
}

export class SessionMemoryExtractor implements MemoryStrategy {
  readonly name = "session-memory";

  private readonly config: Required<
    Omit<SessionMemoryExtractorConfig, "storagePath" | "customPrompt">
  > & {
    storagePath?: string;
    customPrompt?: string;
  };

  // State
  private initialized = false;
  private currentNotes: string;
  private tokensAtLastExtraction = 0;
  private toolCallsAtLastExtraction = 0;

  constructor(config: SessionMemoryExtractorConfig) {
    this.config = {
      extractFn: config.extractFn,
      storagePath: config.storagePath,
      template: config.template ?? DEFAULT_SESSION_MEMORY_TEMPLATE,
      minimumTokensToInit: config.minimumTokensToInit ?? 10_000,
      minimumTokensBetweenUpdate: config.minimumTokensBetweenUpdate ?? 5_000,
      toolCallsBetweenUpdates: config.toolCallsBetweenUpdates ?? 3,
      maxSectionTokens: config.maxSectionTokens ?? 2_000,
      maxTotalTokens: config.maxTotalTokens ?? 12_000,
      customPrompt: config.customPrompt,
      estimateTokens: config.estimateTokens ?? ((text: string) => Math.ceil(text.length / 4)),
    };
    this.currentNotes = this.config.template;
  }

  async initialize(): Promise<void> {
    if (this.config.storagePath) {
      try {
        const fs = await import("fs/promises");
        const content = await fs.readFile(this.config.storagePath, "utf-8");
        this.currentNotes = content;
      } catch {
        // File doesn't exist yet — start from template
        this.currentNotes = this.config.template;
      }
    }
  }

  shouldExtract(ctx: MemoryContext): boolean {
    // Cold start: wait until enough tokens have accumulated
    if (!this.initialized) {
      if (ctx.totalTokens < this.config.minimumTokensToInit) return false;
      this.initialized = true;
      return true;
    }

    // Token growth threshold
    const tokenGrowth = ctx.totalTokens - this.tokensAtLastExtraction;
    const hasTokenThreshold = tokenGrowth >= this.config.minimumTokensBetweenUpdate;

    // Tool call threshold
    const hasToolCallThreshold =
      ctx.toolCallsSinceExtraction >= this.config.toolCallsBetweenUpdates;

    // Natural break: no tool calls in the current turn
    const isNaturalBreak = ctx.toolCallsSinceExtraction === 0;

    // Trigger when:
    // 1. Both thresholds met, OR
    // 2. Token threshold met AND natural break
    return (hasTokenThreshold && hasToolCallThreshold) || (hasTokenThreshold && isNaturalBreak);
  }

  async extract(ctx: MemoryContext): Promise<ExtractionResult> {
    const prompt =
      this.config.customPrompt ??
      buildExtractionPrompt(this.currentNotes, this.config.storagePath ?? "session-notes");

    try {
      const updatedNotes = await this.config.extractFn({
        messages: ctx.messages,
        currentNotes: this.currentNotes,
        systemPrompt: prompt,
        signal: ctx.signal,
      });

      if (updatedNotes && updatedNotes.trim().length > 0) {
        // Guard against unbounded note growth.
        // A misbehaving extraction LLM could return a 200 KB blob which would
        // then be injected into every subsequent system prompt, exhausting the
        // context window. We cap at maxTotalTokens and emit a warning.
        const noteTokens = this.config.estimateTokens(updatedNotes);
        if (noteTokens > this.config.maxTotalTokens) {
          console.warn(
            `[yaaf/session-memory] Extraction returned ${noteTokens} tokens ` +
              `(max: ${this.config.maxTotalTokens}). Truncating to keep the last section boundary.`,
          );
          // Truncate at the last '# ' section boundary within the token budget.
          // Approximate: 1 token ≈ 4 chars.
          const maxChars = this.config.maxTotalTokens * 4;
          let truncated = updatedNotes.slice(0, maxChars);
          // Trim to last complete section heading if possible
          const lastHeading = truncated.lastIndexOf("\n# ");
          if (lastHeading > 0) truncated = truncated.slice(0, lastHeading);
          this.currentNotes = truncated;
        } else {
          this.currentNotes = updatedNotes;
        }

        // Persist to disk if configured
        if (this.config.storagePath) {
          try {
            const fs = await import("fs/promises");
            const path = await import("path");
            await fs.mkdir(path.dirname(this.config.storagePath), { recursive: true });
            await fs.writeFile(this.config.storagePath, this.currentNotes, "utf-8");
          } catch {
            // Non-fatal: in-memory copy is still updated
          }
        }
      }

      this.tokensAtLastExtraction = ctx.totalTokens;
      this.toolCallsAtLastExtraction = ctx.toolCallsSinceExtraction;

      const factCount = (updatedNotes.match(/^#\s/gm) ?? []).length;
      return {
        extracted: true,
        summary: `Session notes updated (${factCount} sections)`,
        factsExtracted: factCount,
      };
    } catch {
      return { extracted: false };
    }
  }

  async retrieve(_ctx: MemoryContext): Promise<RetrievalResult> {
    // Wrap memory content in UNTRUSTED-MEMORY delimiters before
    // injecting into the system prompt. This defends against stored prompt
    // injection where a rogue tool writes control-flow instructions into a
    // memory file. The delimiters signal to the model that the enclosed content
    // is user data, not model instructions.
    const safeNotes = sanitizeMemoryContent(this.currentNotes);
    const tokens = this.config.estimateTokens(safeNotes);
    return {
      systemPromptSection:
        safeNotes.trim().length > 0
          ? `## Session Memory\n\n<!-- BEGIN UNTRUSTED-MEMORY -->\n${safeNotes}\n<!-- END UNTRUSTED-MEMORY -->`
          : "",
      selectedMemories: [
        {
          name: "Session Notes",
          content: safeNotes,
        },
      ],
      tokenEstimate: tokens,
    };
  }

  /** Get the current session notes content (for external use) */
  getNotes(): string {
    return this.currentNotes;
  }

  /** Set notes manually (e.g., loading from a session resume) */
  setNotes(notes: string): void {
    this.currentNotes = notes;
  }

  reset(): void {
    this.tokensAtLastExtraction = 0;
    this.toolCallsAtLastExtraction = 0;
    // Don't reset currentNotes — they survive compaction
  }
}

// ── 2. Topic File Extractor ──────────────────────────────────────────────────

/**
 * Topic-file extraction strategy — writes individual markdown files
 * with YAML frontmatter for each piece of knowledge.
 *
 * This mirrors the CLAUDE.md / topic file approach from the main repo's
 * `memdir/` system. Each memory is a standalone file that can be
 * version-controlled and shared.
 *
 * Unlike session memory (one big file), this strategy creates separate
 * files per topic, enabling fine-grained retrieval.
 */
export type TopicFileExtractorConfig = {
  /** The MemoryStore to write to */
  store: MemoryStore;
  /** LLM function for deciding what to save */
  extractFn: (params: {
    messages: ReadonlyArray<{ role: string; content: string }>;
    systemPrompt: string;
    signal?: AbortSignal;
  }) => Promise<string>;
  /** Minimum tokens before first extraction. Default: 15_000 */
  minimumTokensToInit?: number;
  /** Minimum token growth between extractions. Default: 8_000 */
  minimumTokensBetweenUpdate?: number;
};

const TOPIC_EXTRACT_PROMPT = `Analyze the conversation and identify any knowledge that should be saved as persistent memory.

For each piece of knowledge, output a JSON array where each entry has:
- "name": short title (e.g., "User prefers dark mode")
- "description": one-line description for indexing
- "type": one of "user", "feedback", "project", "reference"
- "content": detailed content (markdown)

Rules:
- Only save knowledge that is NOT derivable from the current project state
- DO save: user preferences, feedback on your approach, project context, external references
- DO NOT save: code patterns (in the code), architecture (in the docs), git history
- Return [] if nothing should be saved

Respond ONLY with valid JSON: [{"name": "...", "description": "...", "type": "...", "content": "..."}, ...]`;

export class TopicFileExtractor implements MemoryExtractionStrategy {
  readonly name = "topic-file";

  private readonly store: MemoryStore;
  private readonly extractFn: TopicFileExtractorConfig["extractFn"];
  private readonly minimumTokensToInit: number;
  private readonly minimumTokensBetweenUpdate: number;

  private initialized = false;
  private tokensAtLastExtraction = 0;

  constructor(config: TopicFileExtractorConfig) {
    this.store = config.store;
    this.extractFn = config.extractFn;
    this.minimumTokensToInit = config.minimumTokensToInit ?? 15_000;
    this.minimumTokensBetweenUpdate = config.minimumTokensBetweenUpdate ?? 8_000;
  }

  shouldExtract(ctx: MemoryContext): boolean {
    if (!this.initialized) {
      if (ctx.totalTokens < this.minimumTokensToInit) return false;
      this.initialized = true;
      return true;
    }
    return ctx.totalTokens - this.tokensAtLastExtraction >= this.minimumTokensBetweenUpdate;
  }

  async extract(ctx: MemoryContext): Promise<ExtractionResult> {
    try {
      const result = await this.extractFn({
        messages: ctx.messages,
        systemPrompt: TOPIC_EXTRACT_PROMPT,
        signal: ctx.signal,
      });

      const entries = JSON.parse(result);

      // Sprint 0b: Validate LLM extraction output with Zod schema.
      // The schema enforces valid types ('user'|'feedback'|'project'|'reference'),
      // non-empty name/content, and max lengths — replacing the manual VALID_TYPES check.
      const parsed = TopicExtractionSchema.safeParse(entries);
      if (!parsed.success) {
        console.warn(
          `[yaaf/topic-file] LLM returned invalid extraction output: ${parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
        );
        return { extracted: false };
      }

      let saved = 0;
      for (const entry of parsed.data) {
        await this.store.save({
          name: entry.name,
          description: entry.description,
          type: entry.type as import("./memoryStore.js").MemoryType,
          content: entry.content,
        });
        saved++;
      }

      this.tokensAtLastExtraction = ctx.totalTokens;
      return { extracted: true, factsExtracted: saved, summary: `${saved} topic files saved` };
    } catch {
      return { extracted: false };
    }
  }

  reset(): void {
    this.tokensAtLastExtraction = 0;
  }
}

// ── 3. Ephemeral Buffer Strategy ─────────────────────────────────────────────

/**
 * Ephemeral in-memory buffer — no persistence.
 * Stores key facts as a rolling list. Useful for short-lived agents
 * or testing where disk I/O is undesirable.
 */
export type EphemeralBufferConfig = {
  /** Maximum number of facts to keep. Default: 50 */
  maxFacts?: number;
  /** Maximum total characters. Default: 10_000 */
  maxChars?: number;
};

export class EphemeralBufferStrategy implements MemoryStrategy {
  readonly name = "ephemeral-buffer";
  private facts: Array<{ timestamp: number; content: string }> = [];
  private readonly maxFacts: number;
  private readonly maxChars: number;

  constructor(config?: EphemeralBufferConfig) {
    this.maxFacts = config?.maxFacts ?? 50;
    this.maxChars = config?.maxChars ?? 10_000;
  }

  shouldExtract(): boolean {
    return false;
  }

  async extract(): Promise<ExtractionResult> {
    return { extracted: false };
  }

  /** Manually add a fact to the buffer */
  addFact(content: string): void {
    this.facts.push({ timestamp: Date.now(), content });

    // Prune by count
    while (this.facts.length > this.maxFacts) {
      this.facts.shift();
    }

    // Prune by total size
    let totalChars = this.facts.reduce((sum, f) => sum + f.content.length, 0);
    while (totalChars > this.maxChars && this.facts.length > 1) {
      const removed = this.facts.shift();
      if (removed) totalChars -= removed.content.length;
    }
  }

  async retrieve(): Promise<RetrievalResult> {
    if (this.facts.length === 0) {
      return { systemPromptSection: "", selectedMemories: [], tokenEstimate: 0 };
    }

    const lines = this.facts.map((f) => `- ${f.content}`);
    const section = `## Working Memory\n\n${lines.join("\n")}`;
    const tokens = Math.ceil(section.length / 4);

    return {
      systemPromptSection: section,
      selectedMemories: this.facts.map((f) => ({ name: "fact", content: f.content })),
      tokenEstimate: tokens,
    };
  }

  reset(): void {
    this.facts = [];
  }
}

// ── 4. LLM Retrieval Strategy ────────────────────────────────────────────────

/**
 * LLM-powered memory retrieval — uses the MemoryRelevanceEngine to
 * select the most relevant memories per turn.
 *
 * Modeled after the main repo's `findRelevantMemories.ts`.
 */
export type LLMRetrievalConfig = {
  /** The MemoryStore to read from */
  store: MemoryStore;
  /** Query function for the relevance LLM */
  queryFn: RelevanceQueryFn;
  /** Maximum memories to retrieve per turn. Default: 5 */
  maxMemories?: number;
  /** Token budget for retrieved memories. Default: 4_000 */
  tokenBudget?: number;
};

export class LLMRetrievalStrategy implements MemoryRetrievalStrategy {
  readonly name = "llm-retrieval";

  private readonly store: MemoryStore;
  private readonly engine: MemoryRelevanceEngine;
  private readonly maxMemories: number;
  private readonly tokenBudget: number;
  private surfacedPaths = new Set<string>();

  constructor(config: LLMRetrievalConfig) {
    this.store = config.store;
    this.engine = new MemoryRelevanceEngine(config.queryFn);
    this.maxMemories = config.maxMemories ?? 5;
    this.tokenBudget = config.tokenBudget ?? 4_000;
  }

  async retrieve(ctx: MemoryContext): Promise<RetrievalResult> {
    // 1. Always include MEMORY.md index
    const { content: indexContent } = await this.store.getIndex();

    // 2. Scan all memory headers
    const headers = await this.store.scanAll();
    if (headers.length === 0) {
      return {
        systemPromptSection: indexContent ? `## Memory Index\n\n${indexContent}` : "",
        selectedMemories: [],
        tokenEstimate: Math.ceil((indexContent?.length ?? 0) / 4),
      };
    }

    // 3. Use LLM to select relevant memories
    const relevant = await this.engine.findRelevant(
      ctx.currentQuery,
      headers,
      ctx.signal,
      ctx.recentTools ? [...ctx.recentTools] : [],
      this.surfacedPaths,
    );

    // 4. Load full content for selected memories (within budget)
    const memories: Array<{ name: string; content: string; relevanceScore?: number }> = [];
    let tokens = Math.ceil((indexContent?.length ?? 0) / 4);

    for (const rel of relevant.slice(0, this.maxMemories)) {
      const entry = await this.store.read(rel.filename);
      if (!entry) continue;

      const entryTokens = Math.ceil(entry.content.length / 4);
      if (tokens + entryTokens > this.tokenBudget) break;

      memories.push({ name: entry.name, content: entry.content });
      tokens += entryTokens;
      this.surfacedPaths.add(rel.path);
    }

    // 5. Build system prompt section
    const parts: string[] = [];
    if (indexContent) parts.push(`## Memory Index\n\n${indexContent}`);
    if (memories.length > 0) {
      // Wrap retrieved memory content in UNTRUSTED-MEMORY delimiters
      // to signal to the model that this content is user/agent data, not instructions.
      const memorySections = memories
        .map((m) => `### ${sanitizeMemoryContent(m.name)}\n${sanitizeMemoryContent(m.content)}`)
        .join("\n\n");
      parts.push(
        `## Relevant Memories\n\n<!-- BEGIN UNTRUSTED-MEMORY -->\n${memorySections}\n<!-- END UNTRUSTED-MEMORY -->`,
      );
    }

    return {
      systemPromptSection: parts.join("\n\n"),
      selectedMemories: memories,
      tokenEstimate: tokens,
    };
  }
}

// ── 5. Recency Retrieval Strategy ────────────────────────────────────────────

/**
 * Simple recency-based retrieval — no LLM call.
 * Returns the N most recently updated memories. Cheapest possible
 * retrieval strategy.
 */
export type RecencyRetrievalConfig = {
  /** The MemoryStore to read from */
  store: MemoryStore;
  /** Max memories to include. Default: 5 */
  maxMemories?: number;
  /** Token budget. Default: 3_000 */
  tokenBudget?: number;
};

export class RecencyRetrievalStrategy implements MemoryRetrievalStrategy {
  readonly name = "recency-retrieval";

  private readonly store: MemoryStore;
  private readonly maxMemories: number;
  private readonly tokenBudget: number;

  constructor(config: RecencyRetrievalConfig) {
    this.store = config.store;
    this.maxMemories = config.maxMemories ?? 5;
    this.tokenBudget = config.tokenBudget ?? 3_000;
  }

  async retrieve(_ctx: MemoryContext): Promise<RetrievalResult> {
    const headers = await this.store.scanAll();
    if (headers.length === 0) {
      return { systemPromptSection: "", selectedMemories: [], tokenEstimate: 0 };
    }

    // Sort by recency
    const sorted = headers.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const memories: Array<{ name: string; content: string }> = [];
    let tokens = 0;

    for (const header of sorted.slice(0, this.maxMemories)) {
      const entry = await this.store.read(header.filename);
      if (!entry) continue;

      const entryTokens = Math.ceil(entry.content.length / 4);
      if (tokens + entryTokens > this.tokenBudget) break;

      memories.push({ name: entry.name, content: entry.content });
      tokens += entryTokens;
    }

    const section =
      memories.length > 0
        ? `## Recent Memories\n\n${memories.map((m) => `### ${m.name}\n${m.content}`).join("\n\n")}`
        : "";

    return { systemPromptSection: section, selectedMemories: memories, tokenEstimate: tokens };
  }
}

// ── 6. Composite Memory Strategy ─────────────────────────────────────────────

/**
 * Composes separate extraction and retrieval strategies into a unified
 * MemoryStrategy. This is the recommended approach for production agents.
 *
 * @example
 * ```ts
 * const strategy = new CompositeMemoryStrategy({
 * extraction: new SessionMemoryExtractor({ extractFn: myLLM }),
 * retrieval: new LLMRetrievalStrategy({ store: myStore, queryFn: myQuery }),
 * });
 * ```
 */
export type CompositeMemoryConfig = {
  /** How to extract (optional — some agents are read-only) */
  extraction?: MemoryExtractionStrategy;
  /** How to retrieve (required) */
  retrieval: MemoryRetrievalStrategy;
};

export class CompositeMemoryStrategy implements MemoryStrategy {
  readonly name = "composite";
  private readonly extraction?: MemoryExtractionStrategy;
  private readonly retrieval: MemoryRetrievalStrategy;

  constructor(config: CompositeMemoryConfig) {
    this.extraction = config.extraction;
    this.retrieval = config.retrieval;
  }

  shouldExtract(ctx: MemoryContext): boolean | Promise<boolean> {
    return this.extraction?.shouldExtract(ctx) ?? false;
  }

  async extract(ctx: MemoryContext): Promise<ExtractionResult> {
    if (!this.extraction) return { extracted: false };
    return this.extraction.extract(ctx);
  }

  async retrieve(ctx: MemoryContext): Promise<RetrievalResult> {
    return this.retrieval.retrieve(ctx);
  }

  reset(): void {
    this.extraction?.reset?.();
  }

  async initialize(): Promise<void> {
    if (this.extraction && "initialize" in this.extraction) {
      await (this.extraction as MemoryStrategy).initialize?.();
    }
    if ("initialize" in this.retrieval) {
      await (this.retrieval as MemoryStrategy).initialize?.();
    }
  }

  async destroy(): Promise<void> {
    if (this.extraction && "destroy" in this.extraction) {
      await (this.extraction as MemoryStrategy).destroy?.();
    }
    if ("destroy" in this.retrieval) {
      await (this.retrieval as MemoryStrategy).destroy?.();
    }
  }
}

// ── Factory Helpers ──────────────────────────────────────────────────────────

/**
 * Create a session-memory strategy (like Claude Code's SessionMemory).
 * Background extraction into structured notes + direct injection.
 *
 * This is the recommended default for coding agents.
 */
export function sessionMemoryStrategy(opts: {
  /** LLM function for extraction */
  extractFn: SessionMemoryExtractorConfig["extractFn"];
  /** Persist to disk at this path */
  storagePath?: string;
  /** Custom template */
  template?: string;
}): MemoryStrategy {
  return new SessionMemoryExtractor({
    extractFn: opts.extractFn,
    storagePath: opts.storagePath,
    template: opts.template,
  });
}

/**
 * Create a topic-file + LLM-retrieval strategy.
 * Writes individual memories → retrieves relevant ones per turn.
 *
 * Best for agents that accumulate lots of knowledge over many sessions.
 */
export function topicMemoryStrategy(opts: {
  /** The MemoryStore */
  store: MemoryStore;
  /** LLM function for extraction decisions */
  extractFn: TopicFileExtractorConfig["extractFn"];
  /** LLM function for relevance selection */
  queryFn: RelevanceQueryFn;
  /** Max memories per turn. Default: 5 */
  maxMemories?: number;
}): MemoryStrategy {
  return new CompositeMemoryStrategy({
    extraction: new TopicFileExtractor({
      store: opts.store,
      extractFn: opts.extractFn,
    }),
    retrieval: new LLMRetrievalStrategy({
      store: opts.store,
      queryFn: opts.queryFn,
      maxMemories: opts.maxMemories,
    }),
  });
}

/**
 * Create a lightweight strategy (no LLM calls for retrieval).
 * Topic file extraction + recency-based retrieval.
 *
 * Best for cost-sensitive deployments.
 */
export function lightweightMemoryStrategy(opts: {
  store: MemoryStore;
  extractFn: TopicFileExtractorConfig["extractFn"];
  maxMemories?: number;
}): MemoryStrategy {
  return new CompositeMemoryStrategy({
    extraction: new TopicFileExtractor({
      store: opts.store,
      extractFn: opts.extractFn,
    }),
    retrieval: new RecencyRetrievalStrategy({
      store: opts.store,
      maxMemories: opts.maxMemories,
    }),
  });
}

// ── 7. Honcho Memory Strategy ─────────────────────────────────────────────────

/**
 * Config for the Honcho memory strategy.
 * Wraps `HonchoPlugin` — requires only the subset of HonchoPlugin's API
 * surface that is needed for memory operations, so it can also accept
 * any object that satisfies the shape (useful for testing).
 */
export type HonchoMemoryStrategyConfig = {
  /**
   * The HonchoPlugin instance (or any object implementing its memory/context
   * surface). Import from `yaaf/integrations/honcho`.
   */
  plugin: {
    save(entry: {
      name: string;
      description: string;
      type: string;
      content: string;
      metadata?: Record<string, unknown>;
    }): Promise<string>;
    search(
      query: string,
      limit?: number,
    ): Promise<Array<{ entry: { name: string }; score: number; snippet?: string }>>;
    getIndex(): Promise<string>;
    buildPrompt(): string;
    getContextSections(
      query: string,
    ): Promise<Array<{ key: string; content: string; placement: string; priority?: number }>>;
  };
  /**
   * Whether to sync conversation messages to Honcho after each turn.
   * When true, calls `plugin.save()` with each new assistant message
   * so Honcho can build its user/agent model.
   * Default: false (only extract when `shouldExtract` triggers)
   */
  syncMessages?: boolean;
  /**
   * Token budget for retrieved Honcho context. Default: 4_000
   */
  tokenBudget?: number;
  /**
   * Maximum search results for retrieval. Default: 5
   */
  maxResults?: number;
};

/**
 * Honcho memory strategy — bridges `HonchoPlugin` into the `MemoryStrategy`
 * interface so it can be used as a drop-in replacement for file-based memory.
 *
 * Unlike the other strategies which wrap `MemoryStore`, this wraps the
 * `HonchoPlugin` directly. Honcho is a cloud memory + user modeling service
 * that automatically builds and maintains representations of users, agents,
 * and entities across sessions.
 *
 * **Extraction**: On each turn where `shouldExtract()` returns true, new
 * assistant messages are saved to Honcho so it can update its internal model.
 *
 * **Retrieval**: On each turn, fetches the Honcho peer context + session
 * summary and injects them into the system prompt as a rich user/session model.
 *
 * @example
 * ```ts
 * import { HonchoPlugin } from 'yaaf';
 * import { HonchoMemoryStrategy } from 'yaaf';
 *
 * const plugin = new HonchoPlugin({
 * apiKey: process.env.HONCHO_API_KEY!,
 * workspaceId: 'my-app',
 * defaultPeerId: userId,
 * });
 *
 * const agent = new Agent({
 * memoryStrategy: new HonchoMemoryStrategy({ plugin }),
 * });
 * ```
 */
export class HonchoMemoryStrategy implements MemoryStrategy {
  readonly name = "honcho";

  private readonly plugin: HonchoMemoryStrategyConfig["plugin"];
  private readonly syncMessages: boolean;
  private readonly tokenBudget: number;
  private readonly maxResults: number;

  /** Track messages already saved to Honcho to avoid duplicates */
  private savedMessageCount = 0;

  constructor(config: HonchoMemoryStrategyConfig) {
    this.plugin = config.plugin;
    this.syncMessages = config.syncMessages ?? false;
    this.tokenBudget = config.tokenBudget ?? 4_000;
    this.maxResults = config.maxResults ?? 5;
  }

  /**
   * Extract on every turn when syncMessages is enabled, OR when the
   * conversation has new messages since the last extraction.
   */
  shouldExtract(ctx: MemoryContext): boolean {
    if (this.syncMessages) return true;
    // Only extract if there are new assistant messages
    const assistantMessages = ctx.messages.filter((m) => m.role === "assistant");
    return assistantMessages.length > this.savedMessageCount;
  }

  /**
   * Save new assistant messages to Honcho so it can update
   * its user and agent representations.
   */
  async extract(ctx: MemoryContext): Promise<ExtractionResult> {
    const assistantMessages = ctx.messages.filter((m) => m.role === "assistant");
    const newMessages = assistantMessages.slice(this.savedMessageCount);

    if (newMessages.length === 0) return { extracted: false };

    let saved = 0;
    for (const msg of newMessages) {
      try {
        const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
        await this.plugin.save({
          name: `Assistant turn ${this.savedMessageCount + saved + 1}`,
          description: content.slice(0, 100),
          type: "reference",
          content,
        });
        saved++;
      } catch {
        // Non-fatal — continue with remaining messages
      }
    }

    this.savedMessageCount += saved;
    return {
      extracted: saved > 0,
      factsExtracted: saved,
      summary: `${saved} messages synced to Honcho`,
    };
  }

  /**
   * Retrieve Honcho's context for the current peer/session and inject
   * it into the system prompt. Combines:
   * 1. The Honcho memory index (peer representation)
   * 2. Semantically relevant memories for the current query
   * 3. The Honcho memory prompt instructions
   */
  async retrieve(ctx: MemoryContext): Promise<RetrievalResult> {
    const parts: string[] = [];
    const memories: Array<{ name: string; content: string; relevanceScore?: number }> = [];
    let tokens = 0;

    // 1. Get Honcho context sections (peer representation + session summary)
    try {
      const sections = await this.plugin.getContextSections(ctx.currentQuery);
      for (const section of sections) {
        const sectionTokens = Math.ceil(section.content.length / 4);
        if (tokens + sectionTokens > this.tokenBudget) break;
        parts.push(section.content);
        tokens += sectionTokens;
        memories.push({ name: section.key, content: section.content });
      }
    } catch {
      /* non-fatal */
    }

    // 2. Semantic search for query-relevant memories
    if (ctx.currentQuery && tokens < this.tokenBudget) {
      try {
        const results = await this.plugin.search(ctx.currentQuery, this.maxResults);
        const snippets: string[] = [];
        for (const result of results) {
          if (!result.snippet) continue;
          const snippetTokens = Math.ceil(result.snippet.length / 4);
          if (tokens + snippetTokens > this.tokenBudget) break;
          snippets.push(`- ${result.entry.name}: ${result.snippet}`);
          tokens += snippetTokens;
          memories.push({
            name: result.entry.name,
            content: result.snippet,
            relevanceScore: result.score,
          });
        }
        if (snippets.length > 0) {
          parts.push(`## Relevant Memory\n\n${snippets.join("\n")}`);
        }
      } catch {
        /* non-fatal */
      }
    }

    // 3. Memory prompt instructions
    const promptSection = this.plugin.buildPrompt();
    parts.push(promptSection);

    return {
      systemPromptSection: parts.join("\n\n"),
      selectedMemories: memories,
      tokenEstimate: tokens,
    };
  }

  reset(): void {
    this.savedMessageCount = 0;
  }
}

/**
 * Create a Honcho-backed memory strategy from an already-constructed plugin.
 *
 * Preferred usage: construct `HonchoPlugin` first (so you can configure it
 * fully and optionally register it with `PluginHost`), then pass it here.
 *
 * @example
 * ```ts
 * import { HonchoPlugin, honchoMemoryStrategy } from 'yaaf';
 *
 * const honcho = new HonchoPlugin({
 * apiKey: process.env.HONCHO_API_KEY!,
 * workspaceId: 'my-app',
 * defaultPeerId: userId,
 * });
 *
 * // Optionally also register with PluginHost for health-checks
 * await host.register(honcho);
 *
 * const agent = new Agent({
 * memoryStrategy: honchoMemoryStrategy({
 * plugin: honcho,
 * syncMessages: true,
 * }),
 * });
 * ```
 */
export function honchoMemoryStrategy(opts: {
  /** Constructed HonchoPlugin (or any object satisfying HonchoMemoryStrategyConfig['plugin']) */
  plugin: HonchoMemoryStrategyConfig["plugin"];
  syncMessages?: boolean;
  tokenBudget?: number;
  maxResults?: number;
}): MemoryStrategy {
  return new HonchoMemoryStrategy({
    plugin: opts.plugin,
    syncMessages: opts.syncMessages,
    tokenBudget: opts.tokenBudget,
    maxResults: opts.maxResults,
  });
}
