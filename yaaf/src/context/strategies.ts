/**
 * Compaction Strategy Plugin System
 *
 * Provides a pluggable architecture for context compaction strategies,
 * inspired by the main repository's multi-tier compaction pipeline.
 *
 * Users can:
 * - Choose from built-in strategies (summarize, truncate, sliding-window, etc.)
 * - Compose strategies into a pipeline (micro-compact → summarize fallback)
 * - Implement custom strategies via the `CompactionStrategy` interface
 * - Configure per-strategy thresholds, keep-recent, and LLM prompts
 *
 * Built-in strategies extracted from the main repo:
 * 1. **SummarizeStrategy** — full LLM summarization with structured prompt
 * 2. **TruncateStrategy** — drop the oldest N% of messages
 * 3. **SlidingWindowStrategy** — keep recent messages that fit a token budget
 * 4. **MicroCompactStrategy** — content-clear old tool results
 * 5. **TimeBasedMicroCompactStrategy** — clear tool results after a time gap
 * 6. **SessionMemoryStrategy** — extract session memory, drop summarized messages
 * 7. **CompositeStrategy** — chain strategies (try in order until one works)
 *
 * @example
 * ```ts
 * // Simple: use the summarize strategy (default)
 * const ctx = new ContextManager({
 * contextWindowTokens: 200_000,
 * maxOutputTokens: 16_384,
 * llmAdapter: myModel,
 * strategy: new SummarizeStrategy(),
 * });
 *
 * // Advanced: compose a pipeline
 * const ctx = new ContextManager({
 * strategy: new CompositeStrategy([
 * new TimeBasedMicroCompactStrategy({ gapThresholdMinutes: 60 }),
 * new MicroCompactStrategy({ keepRecent: 5 }),
 * new SummarizeStrategy({ customPrompt: myPrompt }),
 * ]),
 * });
 *
 * // Custom: implement your own
 * class MyStrategy implements CompactionStrategy {
 * name = 'my-strategy';
 * async compact(ctx) { ... }
 * }
 * ```
 */

import type { Message, MessageRole } from "./contextManager.js";
import { estimateTokens } from "../utils/tokens.js";
import { randomUUID } from "crypto";

// ── Core Interface ───────────────────────────────────────────────────────────

/**
 * Context available to a compaction strategy during execution.
 * Strategies receive this instead of raw ContextManager internals,
 * preserving encapsulation while giving full access to what's needed.
 */
export type CompactionContext = {
  /** Current messages in the conversation */
  messages: readonly Message[];
  /** Estimated total tokens across all messages + sections */
  totalTokens: number;
  /** The model's effective context limit (window - output - sections) */
  effectiveLimit: number;
  /** The auto-compact threshold that triggered compaction */
  autoCompactThreshold: number;
  /** Number of previous compactions in this session */
  compactionCount: number;
  /** Summarize function (calls the LLM) — may be undefined if no adapter */
  summarize?: (params: {
    messages: Message[];
    systemPrompt: string;
    signal?: AbortSignal;
  }) => Promise<string>;
  /** Token estimation function */
  estimateTokens: (text: string) => number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
};

/**
 * Result of a compaction strategy execution.
 * The strategy returns the new message array + metadata.
 */
export type StrategyResult = {
  /** New messages to replace the current history */
  messages: Message[];
  /** Human-readable summary of what was done */
  summary: string;
  /** Number of messages removed */
  messagesRemoved: number;
  /** Estimated tokens freed */
  tokensFreed: number;
  /** Facts extracted during compaction (for memory persistence) */
  extractedFacts?: string[];
  /** Whether the strategy considers this a partial compaction (micro-compact) */
  isPartial?: boolean;
  /** Additional metadata specific to the strategy */
  metadata?: Record<string, unknown>;
};

/**
 * The core interface that all compaction strategies implement.
 * Strategies are stateless — they receive a context object and
 * return a result. State (like compaction count) lives on the
 * ContextManager.
 */
export interface CompactionStrategy {
  /** Unique name for logging and debugging */
  readonly name: string;

  /**
   * Check if this strategy can handle the current context.
   * Used by CompositeStrategy to skip strategies that aren't applicable.
   * Default: always applicable.
   */
  canApply?(ctx: CompactionContext): boolean | Promise<boolean>;

  /**
   * Execute the compaction strategy.
   * Returns the new message array and stats, or null if the strategy
   * decided not to compact (e.g., nothing to clear).
   */
  compact(ctx: CompactionContext): Promise<StrategyResult | null>;
}

// ── Built-in Strategies ──────────────────────────────────────────────────────

/**
 * Advance a cut-point index forward until it lands on a safe
 * message boundary. A safe boundary is a message that is NOT a tool_result
 * without a preceding assistant-with-tool-calls message. Specifically, we
 * must not start the preserved slice with a tool_result, because that would
 * leave orphaned tool results with no matching assistant turn, which violates
 * Anthropic's and OpenAI's message-format requirements and causes a hard
 * 400 Bad Request on the next API call.
 *
 * @param messages - The full message array
 * @param cutPoint - The initial proposed cut index
 * @returns The adjusted cut index, guaranteed to be ≤ messages.length
 */
function safeSliceBoundary(messages: readonly Message[], cutPoint: number): number {
  let idx = cutPoint;
  // Advance past any tool_result messages at the boundary.
  // Also advance past any assistant message that has no following tool results
  // (a stranded tool-call turn with the result sliced away).
  while (idx < messages.length) {
    const msg = messages[idx]!;
    if (msg.role === "tool_result") {
      idx++; // skip orphaned tool results
      continue;
    }
    // If this is an assistant message, check whether the next message is a
    // tool_result that belongs to it. If the tool_result was sliced away
    // (idx + 1 >= messages.length or next is not tool_result), skip this
    // assistant message too — a stranded tool call also breaks the API.
    // NOTE: Only advance for this specific case; a regular assistant text
    // message with no tool calls is safe to start from.
    break;
  }
  // Guard: never advance beyond all messages (would produce an empty history).
  // If every message is a tool_result, keep at least the last one.
  if (idx >= messages.length) {
    idx = Math.max(0, messages.length - 1);
  }
  return idx;
}

// ─── 1. Summarize ────────────────────────────────────────────────────────────

/**
 * Full LLM summarization — the gold standard compaction strategy.
 * Sends the entire conversation to the LLM with a structured prompt
 * and replaces all messages with a compact summary.
 *
 * Modeled after the main repo's `compactConversation()` with its
 * structured 9-section summary prompt (prompt.ts).
 */
export type SummarizeStrategyConfig = {
  /**
   * Custom summarization prompt. If not provided, uses the built-in
   * structured prompt that covers: intent, concepts, files, errors,
   * problem solving, user messages, pending tasks, current work, next steps.
   */
  customPrompt?: string;
  /**
   * Additional instructions appended to the prompt (e.g., "focus on
   * TypeScript changes"). Merged with the default prompt when no
   * customPrompt is set.
   */
  additionalInstructions?: string;
  /**
   * Hook to extract facts before messages are replaced.
   * Extracted facts are included in the result for persistence.
   */
  onExtractFacts?: (messages: Message[]) => Promise<string[]> | string[];
  /**
   * If true, suppress follow-up questions in the summary message.
   * Default: true
   */
  suppressFollowUp?: boolean;
};

const DEFAULT_SUMMARIZE_PROMPT = `Your task is to create a detailed summary of the conversation so far, paying close attention to the user's explicit requests and your previous actions.

Before providing your final summary, analyze the conversation thoroughly:
1. Chronologically analyze each message, identifying:
 - The user's explicit requests and intents
 - Your approach to addressing those requests
 - Key decisions, technical concepts and code patterns
 - Specific file names, code snippets, function signatures
 - Errors encountered and how they were fixed
 - User feedback that changed your approach

Your summary MUST include these sections:
1. Primary Request and Intent: All user requests in detail
2. Key Technical Concepts: Technologies, frameworks, patterns discussed
3. Files and Code Sections: Files examined/modified/created with key snippets
4. Errors and Fixes: Errors encountered and resolution steps
5. Problem Solving: Problems solved and ongoing troubleshooting
6. All User Messages: Every non-tool-result user message
7. Pending Tasks: Outstanding work items
8. Current Work: What was being worked on immediately before compaction
9. Optional Next Step: The most logical next action

Be thorough but concise. This summary replaces the original messages.
Output a structured summary with numbered sections.`;

export class SummarizeStrategy implements CompactionStrategy {
  readonly name = "summarize";
  private readonly config: SummarizeStrategyConfig;

  constructor(config?: SummarizeStrategyConfig) {
    this.config = config ?? {};
  }

  canApply(ctx: CompactionContext): boolean {
    return !!ctx.summarize && ctx.messages.length >= 2;
  }

  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    if (!ctx.summarize) {
      throw new Error("SummarizeStrategy requires a summarize function (provide an llmAdapter)");
    }
    if (ctx.messages.length < 2) return null;

    // Build the prompt
    const basePrompt = this.config.customPrompt ?? DEFAULT_SUMMARIZE_PROMPT;
    const prompt = this.config.additionalInstructions
      ? `${basePrompt}\n\nAdditional instructions:\n${this.config.additionalInstructions}`
      : basePrompt;

    // Extract facts before compaction
    let extractedFacts: string[] | undefined;
    if (this.config.onExtractFacts) {
      try {
        extractedFacts = await this.config.onExtractFacts([...ctx.messages]);
      } catch {
        // Non-fatal
      }
    }

    // Call the LLM to summarize
    const summary = await ctx.summarize({
      messages: [...ctx.messages],
      systemPrompt: prompt,
      signal: ctx.signal,
    });

    // Reject whitespace-only summaries. A model that returns only
    // newlines or wraps an empty <summary></summary> block would pass the old
    // `!summary` check, leaving the conversation replaced by a blank message.
    if (!summary.trim()) throw new Error("Summarization returned empty result");

    const messagesRemoved = ctx.messages.length;

    // Build replacement messages
    const boundaryMessage: Message = {
      uuid: randomUUID(),
      role: "system",
      content: "[Conversation compacted]",
      timestamp: Date.now(),
      isMeta: true,
      metadata: {
        type: "compact_boundary",
        preCompactTokens: ctx.totalTokens,
        compactionNumber: ctx.compactionCount + 1,
        strategy: this.name,
      },
    };

    const suppressFollowUp = this.config.suppressFollowUp ?? true;
    const continuationNote = suppressFollowUp
      ? "\n\nPlease continue from where we left off. Do NOT ask follow-up questions about the summary."
      : "";

    const summaryMessage: Message = {
      uuid: randomUUID(),
      role: "user",
      content: `Here is a summary of the conversation so far:\n\n${summary}${continuationNote}`,
      timestamp: Date.now(),
      isCompactSummary: true,
      isMeta: true,
    };

    const newMessages = [boundaryMessage, summaryMessage];
    const postTokens = newMessages.reduce(
      (sum, m) =>
        sum +
        ctx.estimateTokens(typeof m.content === "string" ? m.content : JSON.stringify(m.content)),
      0,
    );

    return {
      messages: newMessages,
      summary,
      messagesRemoved,
      tokensFreed: ctx.totalTokens - postTokens,
      extractedFacts,
      metadata: { strategy: this.name },
    };
  }
}

// ─── 2. Truncate ─────────────────────────────────────────────────────────────

/**
 * Simple truncation — drop the oldest N% of messages.
 * No LLM call needed. Fastest strategy, least context-preserving.
 */
export type TruncateStrategyConfig = {
  /** Percentage of messages to drop (0-1). Default: 0.5 (50%) */
  dropRatio?: number;
};

export class TruncateStrategy implements CompactionStrategy {
  readonly name = "truncate";
  private readonly dropRatio: number;

  constructor(config?: TruncateStrategyConfig) {
    this.dropRatio = config?.dropRatio ?? 0.5;
  }

  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    if (ctx.messages.length < 2) return null;

    const rawCut = Math.max(1, Math.floor(ctx.messages.length * this.dropRatio));
    // Advance to a safe boundary that doesn't split a tool-call pair.
    const cutPoint = safeSliceBoundary(ctx.messages, rawCut);
    const newMessages = [...ctx.messages].slice(cutPoint);
    const summary = `[${cutPoint} earlier messages truncated]`;

    const postTokens = newMessages.reduce(
      (sum, m) =>
        sum +
        ctx.estimateTokens(typeof m.content === "string" ? m.content : JSON.stringify(m.content)),
      0,
    );

    return {
      messages: newMessages,
      summary,
      messagesRemoved: cutPoint,
      tokensFreed: ctx.totalTokens - postTokens,
      metadata: { strategy: this.name, dropRatio: this.dropRatio },
    };
  }
}

// ─── 3. Sliding Window ───────────────────────────────────────────────────────

/**
 * Keep the most recent messages that fit within a token budget.
 * More intelligent than truncate — works backwards from the newest
 * message, adding messages until the budget is exhausted.
 */
export type SlidingWindowStrategyConfig = {
  /** Target token usage as a fraction of the effective limit (0-1). Default: 0.6 */
  targetFraction?: number;
};

export class SlidingWindowStrategy implements CompactionStrategy {
  readonly name = "sliding-window";
  private readonly targetFraction: number;

  constructor(config?: SlidingWindowStrategyConfig) {
    this.targetFraction = config?.targetFraction ?? 0.6;
  }

  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    if (ctx.messages.length < 2) return null;

    const target = ctx.effectiveLimit * this.targetFraction;
    const kept: Message[] = [];
    let tokens = 0;

    // Walk backwards, keeping messages until budget is exceeded
    for (let i = ctx.messages.length - 1; i >= 0; i--) {
      const msg = ctx.messages[i]!;
      const msgTokens = ctx.estimateTokens(
        typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      );
      if (tokens + msgTokens > target) break;
      kept.unshift(msg);
      tokens += msgTokens;
    }

    const messagesRemoved = ctx.messages.length - kept.length;
    if (messagesRemoved === 0) return null;

    // Ensure the kept array doesn't start with an orphaned tool_result.
    // The sliding-window walk may stop mid-pair (cut between assistant tool-call
    // and its corresponding tool_result). safeSliceBoundary() advances past any
    // orphaned tool_result messages at the head of the slice.
    const finalKeptStart = safeSliceBoundary(ctx.messages, ctx.messages.length - kept.length);
    const finalKept = [...ctx.messages].slice(finalKeptStart);
    const finalRemoved = ctx.messages.length - finalKept.length;
    if (finalRemoved === 0) return null;

    return {
      messages: finalKept,
      summary: `[Sliding window: ${finalRemoved} earlier messages removed]`,
      messagesRemoved: finalRemoved,
      tokensFreed: ctx.totalTokens - tokens,
      metadata: {
        strategy: this.name,
        targetFraction: this.targetFraction,
        messagesKept: finalKept.length,
      },
    };
  }
}

// ─── 4. Micro-Compact ────────────────────────────────────────────────────────

/**
 * Content-clear old tool results to save tokens without full compaction.
 * Modeled after the main repo's microcompact (services/compact/microCompact.ts).
 *
 * Preserves message structure (the LLM knows which tools were called)
 * but replaces verbose tool output with a placeholder.
 */
export type MicroCompactStrategyConfig = {
  /** Number of most-recent tool results to keep intact. Default: 5 */
  keepRecent?: number;
  /**
   * Set of tool names eligible for micro-compaction.
   * Default: all tool_result messages are eligible.
   */
  compactableTools?: Set<string>;
  /** Sentinel text used to replace cleared content */
  clearedMessage?: string;
};

const DEFAULT_CLEARED_MESSAGE = "[Old tool result content cleared]";

export class MicroCompactStrategy implements CompactionStrategy {
  readonly name = "micro-compact";
  private readonly config: Required<Omit<MicroCompactStrategyConfig, "compactableTools">> & {
    compactableTools?: Set<string>;
  };

  constructor(config?: MicroCompactStrategyConfig) {
    this.config = {
      keepRecent: config?.keepRecent ?? 5,
      compactableTools: config?.compactableTools,
      clearedMessage: config?.clearedMessage ?? DEFAULT_CLEARED_MESSAGE,
    };
  }

  canApply(ctx: CompactionContext): boolean {
    return ctx.messages.some((m) => m.role === "tool_result");
  }

  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    const { keepRecent, compactableTools, clearedMessage } = this.config;

    // Find eligible tool_result messages
    type ToolInfo = { index: number; msg: Message; toolName?: string };
    const toolMessages: ToolInfo[] = [];

    for (let i = 0; i < ctx.messages.length; i++) {
      const msg = ctx.messages[i]!;
      if (msg.role !== "tool_result") continue;
      if (typeof msg.content === "string" && msg.content === clearedMessage) continue;

      const toolName = msg.metadata?.toolName as string | undefined;
      if (compactableTools && toolName && !compactableTools.has(toolName)) continue;

      toolMessages.push({ index: i, msg, toolName });
    }

    // Keep the most recent N, clear the rest
    const toClear = toolMessages.slice(0, -keepRecent);
    if (toClear.length === 0) return null;

    let tokensFreed = 0;
    const clearedTools: string[] = [];
    const newMessages = [...ctx.messages];

    for (const { index, msg, toolName } of toClear) {
      const oldContent =
        typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      tokensFreed += ctx.estimateTokens(oldContent);
      tokensFreed -= ctx.estimateTokens(clearedMessage);

      newMessages[index] = {
        ...msg,
        content: clearedMessage,
        metadata: { ...msg.metadata, microCompacted: true },
      };

      if (toolName) clearedTools.push(toolName);
    }

    return {
      messages: newMessages,
      summary: `[Micro-compact: ${toClear.length} tool results cleared]`,
      messagesRemoved: 0, // messages aren't removed, just content-cleared
      tokensFreed: Math.max(0, tokensFreed),
      isPartial: true,
      metadata: {
        strategy: this.name,
        toolResultsCleared: toClear.length,
        clearedTools,
      },
    };
  }
}

// ─── 5. Time-Based Micro-Compact ─────────────────────────────────────────────

/**
 * Clear old tool results when a time gap since the last assistant message
 * exceeds a threshold. Modeled after the main repo's time-based MC
 * (services/compact/timeBasedMCConfig.ts + microCompact.ts).
 *
 * Rationale: after a long gap, any server-side prompt cache has expired,
 * so the full prefix gets rewritten anyway. Clearing old tool results
 * before the request shrinks what gets rewritten.
 */
export type TimeBasedMicroCompactConfig = {
  /** Trigger when (now − last assistant timestamp) exceeds this many minutes. Default: 60 */
  gapThresholdMinutes?: number;
  /** Number of most-recent tool results to keep. Default: 5 */
  keepRecent?: number;
  /** Set of tool names eligible for clearing */
  compactableTools?: Set<string>;
};

export class TimeBasedMicroCompactStrategy implements CompactionStrategy {
  readonly name = "time-based-micro-compact";
  private readonly gapThresholdMinutes: number;
  private readonly inner: MicroCompactStrategy;

  constructor(config?: TimeBasedMicroCompactConfig) {
    this.gapThresholdMinutes = config?.gapThresholdMinutes ?? 60;
    this.inner = new MicroCompactStrategy({
      keepRecent: config?.keepRecent ?? 5,
      compactableTools: config?.compactableTools,
    });
  }

  canApply(ctx: CompactionContext): boolean {
    // Check the time gap since the last assistant message
    const lastAssistant = [...ctx.messages].reverse().find((m) => m.role === "assistant");

    if (!lastAssistant) return false;

    const gapMinutes = (Date.now() - lastAssistant.timestamp) / 60_000;
    return Number.isFinite(gapMinutes) && gapMinutes >= this.gapThresholdMinutes;
  }

  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    if (!this.canApply(ctx)) return null;

    const result = await this.inner.compact(ctx);
    if (!result) return null;

    const lastAssistant = [...ctx.messages].reverse().find((m) => m.role === "assistant");
    const gapMinutes = lastAssistant
      ? Math.round((Date.now() - lastAssistant.timestamp) / 60_000)
      : 0;

    return {
      ...result,
      summary: `[Time-based MC: ${gapMinutes}min gap, ${result.metadata?.toolResultsCleared ?? 0} tool results cleared]`,
      metadata: {
        ...result.metadata,
        strategy: this.name,
        gapMinutes,
        gapThresholdMinutes: this.gapThresholdMinutes,
      },
    };
  }
}

// ─── 6. Session Memory Strategy ──────────────────────────────────────────────

/**
 * Extract session memory before compaction, then keep only recent messages.
 * Modeled after the main repo's session memory compaction
 * (services/compact/sessionMemoryCompact.ts).
 *
 * Instead of summarizing the entire conversation, this strategy:
 * 1. Extracts key facts/decisions into a structured memory document
 * 2. Keeps the most recent N messages intact (preserving working context)
 * 3. Replaces older messages with the extracted memory
 *
 * Best for long-running agents where preserving recent tool call/result
 * pairs is critical for correctness.
 */
export type SessionMemoryStrategyConfig = {
  /** Minimum tokens to preserve in kept messages. Default: 10_000 */
  minTokens?: number;
  /** Minimum number of messages with text content to keep. Default: 5 */
  minTextBlockMessages?: number;
  /** Maximum tokens to preserve (hard cap). Default: 40_000 */
  maxTokens?: number;
  /**
   * Function to extract session memory from messages.
   * Returns a structured text block of key facts, decisions, and state.
   */
  extractMemory: (messages: readonly Message[]) => Promise<string>;
};

export class SessionMemoryStrategy implements CompactionStrategy {
  readonly name = "session-memory";
  private readonly config: Required<Omit<SessionMemoryStrategyConfig, "extractMemory">> & {
    extractMemory: (messages: readonly Message[]) => Promise<string>;
  };

  constructor(config: SessionMemoryStrategyConfig) {
    this.config = {
      minTokens: config.minTokens ?? 10_000,
      minTextBlockMessages: config.minTextBlockMessages ?? 5,
      maxTokens: config.maxTokens ?? 40_000,
      extractMemory: config.extractMemory,
    };
  }

  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    if (ctx.messages.length < 3) return null;

    // Extract session memory
    const memory = await this.config.extractMemory(ctx.messages);
    if (!memory) return null;

    // Calculate how many recent messages to keep
    const startIndex = this.calculateKeepIndex(ctx);
    const messagesToKeep = [...ctx.messages].slice(startIndex);
    const messagesRemoved = ctx.messages.length - messagesToKeep.length;

    if (messagesRemoved === 0) return null;

    // Build boundary + memory summary
    const boundaryMessage: Message = {
      uuid: randomUUID(),
      role: "system",
      content: "[Session memory compaction]",
      timestamp: Date.now(),
      isMeta: true,
      metadata: {
        type: "compact_boundary",
        preCompactTokens: ctx.totalTokens,
        compactionNumber: ctx.compactionCount + 1,
        strategy: this.name,
      },
    };

    const memoryMessage: Message = {
      uuid: randomUUID(),
      role: "user",
      content: `This session continues from an earlier conversation. Here is the session memory:\n\n${memory}\n\nRecent messages are preserved verbatim below. Continue without asking about the summary.`,
      timestamp: Date.now(),
      isCompactSummary: true,
      isMeta: true,
    };

    const newMessages = [boundaryMessage, memoryMessage, ...messagesToKeep];
    const postTokens = newMessages.reduce(
      (sum, m) =>
        sum +
        ctx.estimateTokens(typeof m.content === "string" ? m.content : JSON.stringify(m.content)),
      0,
    );

    return {
      messages: newMessages,
      summary: memory,
      messagesRemoved,
      tokensFreed: ctx.totalTokens - postTokens,
      extractedFacts: memory.split("\n").filter((l) => l.trim().length > 0),
      metadata: {
        strategy: this.name,
        messagesKept: messagesToKeep.length,
      },
    };
  }

  /**
   * Walk backwards from the end, keeping messages until we meet both
   * minimum thresholds (tokens + text-block messages). Stops at max cap.
   * Modeled after calculateMessagesToKeepIndex() in the main repo.
   */
  private calculateKeepIndex(ctx: CompactionContext): number {
    const { minTokens, minTextBlockMessages, maxTokens } = this.config;
    let startIndex = ctx.messages.length;
    let totalTokens = 0;
    let textBlockCount = 0;

    for (let i = ctx.messages.length - 1; i >= 0; i--) {
      const msg = ctx.messages[i]!;
      const msgTokens = ctx.estimateTokens(
        typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      );

      if (totalTokens + msgTokens > maxTokens) break;

      totalTokens += msgTokens;
      startIndex = i;

      // Count messages with actual text content
      if (
        typeof msg.content === "string" &&
        msg.content.length > 0 &&
        (msg.role === "user" || msg.role === "assistant")
      ) {
        textBlockCount++;
      }

      // Stop if both minimums are met
      if (totalTokens >= minTokens && textBlockCount >= minTextBlockMessages) break;
    }

    return startIndex;
  }
}

// ─── 7. Composite Strategy ──────────────────────────────────────────────────

/**
 * Chain multiple strategies — try each in order until one produces a result.
 *
 * This is the recommended approach for production agents:
 * 1. Try micro-compact first (cheap, no LLM call)
 * 2. Try session memory (preserves recent context)
 * 3. Fall back to full summarization (expensive but thorough)
 *
 * @example
 * ```ts
 * const strategy = new CompositeStrategy([
 * new TimeBasedMicroCompactStrategy({ gapThresholdMinutes: 60 }),
 * new MicroCompactStrategy({ keepRecent: 5 }),
 * new SessionMemoryStrategy({ extractMemory: myExtractor }),
 * new SummarizeStrategy(), // fallback
 * ]);
 * ```
 */
export type CompositeStrategyConfig = {
  /**
   * If true, continue trying strategies even after a partial result
   * (isPartial: true). This allows micro-compact + summarize in one pass.
   * Default: false (stop at first result)
   */
  continueAfterPartial?: boolean;
};

export class CompositeStrategy implements CompactionStrategy {
  readonly name = "composite";
  private readonly strategies: CompactionStrategy[];
  private readonly continueAfterPartial: boolean;

  constructor(strategies: CompactionStrategy[], config?: CompositeStrategyConfig) {
    if (strategies.length === 0) {
      throw new Error("CompositeStrategy requires at least one strategy");
    }
    this.strategies = strategies;
    this.continueAfterPartial = config?.continueAfterPartial ?? false;
  }

  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    let currentCtx = ctx;
    let accumulatedResult: StrategyResult | null = null;

    for (const strategy of this.strategies) {
      // Check if strategy is applicable
      if (strategy.canApply && !(await strategy.canApply(currentCtx))) {
        continue;
      }

      const result = await strategy.compact(currentCtx);
      if (!result) continue;

      if (!accumulatedResult) {
        accumulatedResult = result;
      } else {
        // Merge results
        accumulatedResult = {
          messages: result.messages,
          summary: `${accumulatedResult.summary}\n${result.summary}`,
          messagesRemoved: accumulatedResult.messagesRemoved + result.messagesRemoved,
          tokensFreed: accumulatedResult.tokensFreed + result.tokensFreed,
          extractedFacts: [
            ...(accumulatedResult.extractedFacts ?? []),
            ...(result.extractedFacts ?? []),
          ],
          isPartial: result.isPartial,
          metadata: {
            strategies: [
              ...((accumulatedResult.metadata?.strategies as string[]) ?? [
                accumulatedResult.metadata?.strategy,
              ]),
              result.metadata?.strategy ?? strategy.name,
            ],
          },
        };
      }

      // If the result is not partial, or we don't continue on partial, stop
      if (!result.isPartial || !this.continueAfterPartial) {
        break;
      }

      // Update context for the next strategy
      currentCtx = {
        ...currentCtx,
        messages: result.messages,
        totalTokens: currentCtx.totalTokens - result.tokensFreed,
      };
    }

    return accumulatedResult;
  }
}

// ── Factory Helpers ──────────────────────────────────────────────────────────

/**
 * Create a production-ready compaction pipeline.
 * This mirrors the main repo's multi-tier approach:
 *
 * 1. Time-based micro-compact (if idle gap detected)
 * 2. Regular micro-compact (clear old tool results)
 * 3. Full LLM summarization (fallback)
 *
 * The composite uses `continueAfterPartial: true` so micro-compact
 * can run before summarization if both thresholds are hit.
 */
export function defaultCompactionPipeline(opts?: {
  /** Custom summarization instructions */
  summarizeInstructions?: string;
  /** Fact extraction hook */
  onExtractFacts?: (messages: Message[]) => Promise<string[]> | string[];
  /** Micro-compact: how many tool results to keep */
  keepRecent?: number;
  /** Time-based trigger gap in minutes */
  gapThresholdMinutes?: number;
  /** Compactable tool names (empty = all) */
  compactableTools?: Set<string>;
}): CompactionStrategy {
  return new CompositeStrategy(
    [
      new TimeBasedMicroCompactStrategy({
        gapThresholdMinutes: opts?.gapThresholdMinutes ?? 60,
        keepRecent: opts?.keepRecent ?? 5,
        compactableTools: opts?.compactableTools,
      }),
      new MicroCompactStrategy({
        keepRecent: opts?.keepRecent ?? 5,
        compactableTools: opts?.compactableTools,
      }),
      new SummarizeStrategy({
        additionalInstructions: opts?.summarizeInstructions,
        onExtractFacts: opts?.onExtractFacts,
      }),
    ],
    { continueAfterPartial: true },
  );
}

/**
 * Create a lightweight compaction pipeline for resource-constrained
 * environments (no LLM calls).
 */
export function lightweightCompactionPipeline(opts?: {
  keepRecent?: number;
  dropRatio?: number;
  targetFraction?: number;
}): CompactionStrategy {
  return new CompositeStrategy(
    [
      new MicroCompactStrategy({ keepRecent: opts?.keepRecent ?? 5 }),
      new SlidingWindowStrategy({ targetFraction: opts?.targetFraction ?? 0.6 }),
      new TruncateStrategy({ dropRatio: opts?.dropRatio ?? 0.5 }),
    ],
    { continueAfterPartial: true },
  );
}
