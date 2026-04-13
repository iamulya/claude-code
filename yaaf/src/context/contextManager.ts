/**
 * Context Manager
 *
  * the full lifecycle of what the LLM sees:
 *
 * 1. **System context** — Git status, date, environment info (cached per session)
 * 2. **User context** — CLAUDE.md / memory files (cached per session)
 * 3. **Conversation messages** — The running message history
 * 4. **Token budgeting** — Tracks usage against the model's context window
 * 5. **Auto-compaction** — Summarizes old messages when context gets full
 *
 * Design rationale:
  * user context, and tool schemas consume a fixed overhead (~20-40K tokens).
 * As conversation messages accumulate, the system monitors total token usage
 * and triggers compaction before reaching the model's window limit.
 *
 * Compaction works by:
 * 1. Sending all messages to the LLM with a "summarize this conversation" prompt
 * 2. Replacing the message history with the summary + a compact boundary marker
 * 3. Re-injecting recently-read file contents as attachments
 * 4. Running post-compaction hooks
 *
 * The auto-compact threshold is: contextWindow - maxOutputTokens - 13K buffer
 */

import type { LLMAdapter, LLMMessage } from '../plugin/types.js'
import { estimateTokens as rawEstimateTokens } from '../utils/tokens.js'
import { randomUUID } from 'crypto'
import type {
  CompactionStrategy as CompactionStrategyPlugin,
  CompactionContext,
  StrategyResult,
} from './strategies.js'

// ── Types ─────────────────────────────────────────────────────────────────────────────

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool_result'

export type Message = {
  uuid: string
  role: MessageRole
  content: string | Array<{ type: string; [key: string]: unknown }>
  /** Timestamp of message creation */
  timestamp: number
  /** If true, this message is invisible to the user (system bookkeeping) */
  isMeta?: boolean
  /** If true, this is a compaction summary message */
  isCompactSummary?: boolean
  /** Tool use ID (for tool_result messages) */
  toolUseId?: string
  /** Custom metadata bag */
  metadata?: Record<string, unknown>
}

export type ContextSection = {
  /** Unique key for this section (e.g., 'git_status', 'memory') */
  key: string
  /** Content to inject. null = omit this section. */
  content: string | null
  /** Where to inject: 'system' (in system prompt) or 'user' (first user msg) */
  placement: 'system' | 'user'
  /** Priority — higher = injected first */
  priority?: number
}

/** Legacy string-based strategy name (backward compat) */
export type CompactionStrategyName = 'summarize' | 'truncate' | 'sliding_window'
/** @deprecated Use CompactionStrategyName or the strategy plugin interface */
export type CompactionStrategy = CompactionStrategyName

export type CompactionResult = {
  /** The summary message that replaces older messages */
  summary: string
  /** Number of messages removed */
  messagesRemoved: number
  /** Estimated tokens freed */
  tokensFreed: number
  /** Estimated post-compaction token count */
  postCompactTokens: number
  /** Key facts extracted during compaction (for memory persistence) */
  extractedFacts?: string[]
}

/** Result of micro-compaction (tool result clearing) */
export type MicroCompactionResult = {
  /** Number of tool results cleared */
  toolResultsCleared: number
  /** Estimated tokens freed */
  tokensFreed: number
  /** Tool names that were cleared */
  clearedTools: string[]
}

/**
 * Function signature for the LLM summarization call.
 * Consumers inject their own LLM adapter.
 */
export type SummarizeFn = (params: {
  messages: Message[]
  systemPrompt: string
  signal?: AbortSignal
}) => Promise<string>

export type ContextManagerConfig = {
  /** Model's total context window size in tokens */
  contextWindowTokens: number
  /** Maximum output tokens reserved for the model's response */
  maxOutputTokens: number
  /** Buffer tokens below the threshold (default: 13_000) */
  autoCompactBuffer?: number
  /** Legacy strategy name for compaction (default: 'summarize') */
  compactionStrategy?: CompactionStrategyName
  /**
   * Pluggable compaction strategy — takes priority over `compactionStrategy`.
   * Pass any object implementing `CompactionStrategy` from `yaaf/strategies`.
   *
   * Built-in strategies:
   * - `SummarizeStrategy` — full LLM summarization with structured prompt
   * - `TruncateStrategy` — drop oldest N% of messages
   * - `SlidingWindowStrategy` — keep recent messages within token budget
   * - `MicroCompactStrategy` — content-clear old tool results
   * - `TimeBasedMicroCompactStrategy` — clear tool results after time gap
   * - `SessionMemoryStrategy` — extract memory, keep recent messages
   * - `CompositeStrategy` — chain strategies in order
   *
   * Factory helpers:
   * - `defaultCompactionPipeline()` — multi-tier production pipeline
   * - `lightweightCompactionPipeline()` — no-LLM fallback chain
   *
   * @example
   * ```ts
   * import { CompositeStrategy, MicroCompactStrategy, SummarizeStrategy } from 'yaaf/strategies';
   *
   * const ctx = new ContextManager({
   *   strategy: new CompositeStrategy([
   *     new MicroCompactStrategy({ keepRecent: 5 }),
   *     new SummarizeStrategy(),
   *   ], { continueAfterPartial: true }),
   * });
   * ```
   */
  strategy?: CompactionStrategyPlugin
  /**
   * LLM adapter to use for summarization and token estimation.
   * When provided, `summarizeFn` and `estimateTokensFn` are auto-wired
   * from the adapter — no manual closure required.
   *
   * Takes priority over `summarizeFn` and `estimateTokensFn` if all are set.
   */
  llmAdapter?: LLMAdapter
  /** LLM function for generating summaries (ignored when llmAdapter is set) */
  summarizeFn?: SummarizeFn
  /** Token estimation function (ignored when llmAdapter is set) */
  estimateTokensFn?: (text: string) => number
  /**
   * Micro-compaction: how many recent tool results to keep (default: 5).
   * Older tool results are content-cleared to save tokens without
   * full compaction. Set to 0 to disable micro-compaction.
   */
  microCompactKeepRecent?: number
  /**
   * Set of tool names that are eligible for micro-compaction.
   * Default: all tool_result messages are eligible.
   */
  microCompactableTools?: Set<string>
  /**
   * Hook called during compaction to extract key facts from messages
   * before they're replaced by a summary. Extracted facts can be
   * persisted to memory.
   */
  onExtractFacts?: (messages: Message[]) => Promise<string[]> | string[]
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_COMPACT_BUFFER = 13_000
/** Warning threshold: emit before auto-compact fires */
const WARNING_BUFFER = 20_000
/** Sentinel text injected when tool results are micro-compacted */
const TOOL_RESULT_CLEARED = '[Old tool result content cleared]'

const COMPACT_PROMPT = `Summarize the conversation so far. Preserve:
- Key decisions and their rationale
- File paths mentioned and their relevance
- Errors encountered and how they were resolved
- The user's current objective and any constraints
- Important tool outputs (commands run, results seen)
- Environment state (working directory, installed deps, running services)

Be thorough but concise. This summary replaces the original messages.
Output a structured summary with sections for each topic.`

// ── Helpers ──────────────────────────────────────────────────────────────────

function defaultEstimateTokens(text: string): number {
  return rawEstimateTokens(text)
}

// ── Context Manager ──────────────────────────────────────────────────────────

/**
 * Manages the LLM's context window — tracks messages, injects context
 * sections, monitors token usage, and triggers compaction.
 *
 * @example
 * ```ts
 * const ctx = new ContextManager({
 *   contextWindowTokens: 200_000,
 *   maxOutputTokens: 16_384,
 *   summarizeFn: async ({ messages, systemPrompt }) => {
 *     return await callLLM({ system: systemPrompt, messages });
 *   },
 * });
 *
 * // Register context sections (injected into every turn)
 * ctx.addSection({ key: 'git', content: gitStatus, placement: 'system' });
 * ctx.addSection({ key: 'memory', content: memoryPrompt, placement: 'system' });
 *
 * // Add messages as conversation progresses
 * ctx.addMessage({ role: 'user', content: 'Fix the build error' });
 * ctx.addMessage({ role: 'assistant', content: 'I see the issue...' });
 *
 * // Check if compaction is needed
 * if (ctx.shouldCompact()) {
 *   const result = await ctx.compact();
 *   console.log(`Freed ${result.tokensFreed} tokens`);
 * }
 * ```
 */
export class ContextManager {
  private readonly config: Required<Omit<ContextManagerConfig, 'llmAdapter' | 'microCompactableTools' | 'onExtractFacts' | 'strategy'>> & {
    microCompactableTools?: Set<string>
    onExtractFacts?: (messages: Message[]) => Promise<string[]> | string[]
  }
  private messages: Message[] = []
  private sections: Map<string, ContextSection> = new Map()
  private compactionCount = 0
  /** Tracks the number of micro-compactions performed */
  private microCompactionCount = 0
  /** Pluggable strategy (takes priority over legacy string-based strategy) */
  private readonly strategyPlugin?: CompactionStrategyPlugin

  constructor(config: ContextManagerConfig) {
    // Auto-wire from LLMAdapter if provided
    const summarizeFn: SummarizeFn | null = config.llmAdapter
      ? async ({ messages, systemPrompt, signal }) => {
          const llmMessages: LLMMessage[] = messages.map(m => ({
            role: m.role === 'tool_result' ? 'user' : m.role as LLMMessage['role'],
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          }))
          return config.llmAdapter!.summarize(llmMessages, systemPrompt)
        }
      : config.summarizeFn ?? null

    const estimateTokensFn = config.llmAdapter
      ? (text: string) => config.llmAdapter!.estimateTokens(text)
      : config.estimateTokensFn ?? defaultEstimateTokens

    const compactionStrategy = config.compactionStrategy ?? 'summarize'

    // Fail fast: don't silently produce empty summaries
    if (compactionStrategy === 'summarize' && !summarizeFn) {
      throw new Error(
        'ContextManager: compactionStrategy is "summarize" but no summarizer is configured.\n' +
        'Either pass `llmAdapter` (recommended) or provide a `summarizeFn` callback.'
      )
    }

    this.config = {
      contextWindowTokens: config.contextWindowTokens,
      maxOutputTokens: config.maxOutputTokens,
      autoCompactBuffer: config.autoCompactBuffer ?? DEFAULT_COMPACT_BUFFER,
      compactionStrategy,
      microCompactKeepRecent: config.microCompactKeepRecent ?? 5,
      microCompactableTools: config.microCompactableTools,
      onExtractFacts: config.onExtractFacts,
      // Safe: if strategy is not 'summarize', summarizeFn is never called
      summarizeFn: (summarizeFn ?? (async () => '')) as SummarizeFn,
      estimateTokensFn,
    }

    // Store the strategy plugin separately
    this.strategyPlugin = config.strategy
  }

  // ── Context Sections ─────────────────────────────────────────────────────

  /** Add or update a context section */
  addSection(section: ContextSection): void {
    this.sections.set(section.key, section)
  }

  /** Remove a context section */
  removeSection(key: string): void {
    this.sections.delete(key)
  }

  /** Get all sections, sorted by priority (descending) */
  getSections(): ContextSection[] {
    return [...this.sections.values()].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
    )
  }

  /**
   * Build the full system prompt from system-placed sections.
   */
  buildSystemPrompt(basePrompt: string = ''): string {
    const systemSections = this.getSections()
      .filter(s => s.placement === 'system' && s.content !== null)
      .map(s => s.content!)

    return [basePrompt, ...systemSections].filter(Boolean).join('\n\n')
  }

  /**
   * Build user context content from user-placed sections.
   */
  buildUserContext(): string {
    return this.getSections()
      .filter(s => s.placement === 'user' && s.content !== null)
      .map(s => s.content!)
      .join('\n\n')
  }

  // ── Message Management ───────────────────────────────────────────────────

  /** Add a message to the conversation */
  addMessage(
    msg: Omit<Message, 'uuid' | 'timestamp'> & { uuid?: string; timestamp?: number },
  ): Message {
    const message: Message = {
      uuid: msg.uuid ?? randomUUID(),
      timestamp: msg.timestamp ?? Date.now(),
      ...msg,
    }
    this.messages.push(message)
    return message
  }

  /** Get all messages */
  getMessages(): readonly Message[] {
    return this.messages
  }

  /** Get messages after the last compaction boundary */
  getMessagesAfterLastCompaction(): Message[] {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i]!.isCompactSummary) {
        return this.messages.slice(i)
      }
    }
    return this.messages
  }

  /** Replace all messages (used after compaction) */
  setMessages(messages: Message[]): void {
    this.messages = messages
  }

  /** Get message count */
  get messageCount(): number {
    return this.messages.length
  }

  /** Get message count (method form — used by Agent integration) */
  getMessageCount(): number {
    return this.messages.length
  }

  // ── Token Accounting ─────────────────────────────────────────────────────

  /** Estimate tokens for a single message */
  private estimateMessageTokens(msg: Message): number {
    const content =
      typeof msg.content === 'string'
        ? msg.content
        : JSON.stringify(msg.content)
    return this.config.estimateTokensFn(content)
  }

  /** Estimate total tokens across all messages */
  estimateTotalTokens(): number {
    let total = 0

    // System prompt overhead
    total += this.config.estimateTokensFn(this.buildSystemPrompt())
    total += this.config.estimateTokensFn(this.buildUserContext())

    // Messages
    for (const msg of this.messages) {
      total += this.estimateMessageTokens(msg)
    }

    return total
  }

  /** The effective context limit (window - output reservation) */
  get effectiveContextLimit(): number {
    return this.config.contextWindowTokens - this.config.maxOutputTokens
  }

  /** The auto-compact threshold */
  get autoCompactThreshold(): number {
    return this.effectiveContextLimit - this.config.autoCompactBuffer
  }

  /** How much headroom remains before compaction triggers */
  get headroom(): number {
    return this.autoCompactThreshold - this.estimateTotalTokens()
  }

  /** What percentage of context is used */
  get usagePercent(): number {
    return Math.round(
      (this.estimateTotalTokens() / this.effectiveContextLimit) * 100,
    )
  }

  // ── Compaction ───────────────────────────────────────────────────────────

  /** Check if auto-compaction should trigger */
  shouldCompact(): boolean {
    return this.estimateTotalTokens() >= this.autoCompactThreshold
  }

  /** Check if we're approaching the compaction threshold (warning zone) */
  isNearingLimit(): boolean {
    return this.estimateTotalTokens() >= this.autoCompactThreshold - WARNING_BUFFER
  }

  // ── Micro-Compaction ─────────────────────────────────────────────────────

  /**
   * Clear old tool result contents to save tokens without full compaction.
   * Keeps the most recent N tool results intact; replaces older ones with
   * a placeholder. This preserves the tool call structure (so the LLM
   * knows which tools were called) while freeing token budget.
   *
   * Similar to Claude Code's microcompact: content-clear stale tool results.
   *
   * @returns MicroCompactionResult with stats, or null if nothing to clear
   */
  microCompact(): MicroCompactionResult | null {
    const keepRecent = this.config.microCompactKeepRecent
    if (keepRecent <= 0) return null

    // Find all tool_result messages eligible for clearing
    const toolMessages: Array<{ index: number; msg: Message; toolName?: string }> = []

    for (let i = 0; i < this.messages.length; i++) {
      const msg = this.messages[i]!
      if (msg.role !== 'tool_result') continue

      // Already cleared?
      if (typeof msg.content === 'string' && msg.content === TOOL_RESULT_CLEARED) continue

      // Check if this tool is eligible
      const toolName = msg.metadata?.toolName as string | undefined
      if (this.config.microCompactableTools && toolName) {
        if (!this.config.microCompactableTools.has(toolName)) continue
      }

      toolMessages.push({ index: i, msg, toolName })
    }

    // Keep the most recent N, clear the rest
    const toClear = toolMessages.slice(0, -keepRecent)
    if (toClear.length === 0) return null

    let tokensFreed = 0
    const clearedTools: string[] = []

    for (const { index, msg, toolName } of toClear) {
      const oldContent = typeof msg.content === 'string'
        ? msg.content
        : JSON.stringify(msg.content)
      tokensFreed += this.config.estimateTokensFn(oldContent)
      tokensFreed -= this.config.estimateTokensFn(TOOL_RESULT_CLEARED)

      // Replace content but keep message structure
      this.messages[index] = {
        ...msg,
        content: TOOL_RESULT_CLEARED,
        metadata: { ...msg.metadata, microCompacted: true },
      }

      if (toolName) clearedTools.push(toolName)
    }

    this.microCompactionCount++

    return {
      toolResultsCleared: toClear.length,
      tokensFreed: Math.max(0, tokensFreed),
      clearedTools,
    }
  }

  /**
   * Auto micro-compact: triggers when nearing the limit but not yet
   * at the full compaction threshold. Returns null if not needed.
   */
  maybeAutoMicroCompact(): MicroCompactionResult | null {
    if (!this.isNearingLimit()) return null
    if (this.shouldCompact()) return null  // needs full compaction
    return this.microCompact()
  }

  /**
   * Compact the conversation by summarizing older messages.
   *
   * @param customInstructions - Additional instructions for the summarizer
   * @returns CompactionResult with stats about the compaction
   */
  async compact(
    customInstructions?: string,
    signal?: AbortSignal,
  ): Promise<CompactionResult> {
    if (this.messages.length < 2) {
      throw new Error('Not enough messages to compact.')
    }

    const preCompactTokens = this.estimateTotalTokens()

    // ── Strategy Plugin Path ──────────────────────────────────────────────
    // If a pluggable strategy was configured, delegate entirely to it.
    if (this.strategyPlugin) {
      const compactionCtx: CompactionContext = {
        messages: this.messages,
        totalTokens: preCompactTokens,
        effectiveLimit: this.effectiveContextLimit,
        autoCompactThreshold: this.autoCompactThreshold,
        compactionCount: this.compactionCount,
        summarize: this.config.summarizeFn
          ? async (params) => this.config.summarizeFn(params)
          : undefined,
        estimateTokens: this.config.estimateTokensFn,
        signal,
      }

      const result = await this.strategyPlugin.compact(compactionCtx)
      if (!result) {
        throw new Error(`Strategy "${this.strategyPlugin.name}" returned null — no compaction possible.`)
      }

      this.messages = result.messages
      this.compactionCount++

      const postCompactTokens = this.estimateTotalTokens()
      return {
        summary: result.summary,
        messagesRemoved: result.messagesRemoved,
        tokensFreed: preCompactTokens - postCompactTokens,
        postCompactTokens,
        extractedFacts: result.extractedFacts,
      }
    }

    // ── Legacy Path (string-based compactionStrategy) ─────────────────────
    const strategy = this.config.compactionStrategy

    let summary = ''
    let messagesRemoved = 0

    if (strategy === 'truncate') {
      // Simple truncation: drop the oldest 50% of messages
      const cutPoint = Math.floor(this.messages.length / 2)
      messagesRemoved = cutPoint
      summary = `[${messagesRemoved} earlier messages truncated]`
      this.messages = this.messages.slice(cutPoint)
    } else if (strategy === 'sliding_window') {
      // Keep the most recent N messages that fit in 60% of the window
      const target = this.effectiveContextLimit * 0.6
      let kept: Message[] = []
      let tokens = 0
      for (let i = this.messages.length - 1; i >= 0; i--) {
        const msgTokens = this.estimateMessageTokens(this.messages[i]!)
        if (tokens + msgTokens > target) break
        kept.unshift(this.messages[i]!)
        tokens += msgTokens
      }
      messagesRemoved = this.messages.length - kept.length
      summary = `[Sliding window: ${messagesRemoved} earlier messages removed]`
      this.messages = kept
    }

    // Truncate / sliding_window return here
    if (strategy !== 'summarize') {
      const postCompactTokens = this.estimateTotalTokens()
      return {
        summary,
        messagesRemoved,
        tokensFreed: preCompactTokens - postCompactTokens,
        postCompactTokens,
      }
    }

    // Default: LLM summarization (strategy === 'summarize')
    const prompt = customInstructions
      ? `${COMPACT_PROMPT}\n\nAdditional instructions:\n${customInstructions}`
      : COMPACT_PROMPT

    // Extract facts before compaction (for memory persistence)
    let extractedFacts: string[] | undefined
    if (this.config.onExtractFacts && this.messages.length > 0) {
      try {
        extractedFacts = await this.config.onExtractFacts(this.messages)
      } catch {
        // Non-fatal: extraction failure shouldn't block compaction
      }
    }

    summary = await this.config.summarizeFn({
      messages: this.messages,
      systemPrompt: prompt,
      signal,
    })

    if (!summary) {
      throw new Error('Summarization returned empty result')
    }

    messagesRemoved = this.messages.length

    // Replace all messages with the summary
    const boundaryMessage: Message = {
      uuid: randomUUID(),
      role: 'system',
      content: '[Conversation compacted]',
      timestamp: Date.now(),
      isMeta: true,
      metadata: {
        type: 'compact_boundary',
        preCompactTokens,
        compactionNumber: ++this.compactionCount,
      },
    }

    const summaryMessage: Message = {
      uuid: randomUUID(),
      role: 'user',
      content: `Here is a summary of the conversation so far:\n\n${summary}\n\nPlease continue from where we left off. Do NOT ask follow-up questions about the summary.`,
      timestamp: Date.now(),
      isCompactSummary: true,
      isMeta: true,
    }

    this.messages = [boundaryMessage, summaryMessage]

    const postCompactTokens = this.estimateTotalTokens()

    return {
      summary,
      messagesRemoved,
      tokensFreed: preCompactTokens - postCompactTokens,
      postCompactTokens,
      extractedFacts,
    }
  }

  /**
   * Get a diagnostic snapshot of context state.
   */
  getStats(): {
    messageCount: number
    estimatedTokens: number
    effectiveLimit: number
    autoCompactThreshold: number
    usagePercent: number
    headroom: number
    compactionCount: number
    microCompactionCount: number
    isNearingLimit: boolean
  } {
    return {
      messageCount: this.messages.length,
      estimatedTokens: this.estimateTotalTokens(),
      effectiveLimit: this.effectiveContextLimit,
      autoCompactThreshold: this.autoCompactThreshold,
      usagePercent: this.usagePercent,
      headroom: this.headroom,
      compactionCount: this.compactionCount,
      microCompactionCount: this.microCompactionCount,
      isNearingLimit: this.isNearingLimit(),
    }
  }
}
