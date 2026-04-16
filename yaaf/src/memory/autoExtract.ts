/**
 * Auto Memory Extraction — background extraction of durable memories
 * from conversation history.
 *
 * Inspired by the main repo's extractMemories.ts (617 lines). After each
 * query-loop completion, an extraction pass scans the conversation for
 * knowledge worth storing:
 *
 * 1. **Cursor tracking** — only process messages since last extraction
 * 2. **Overlap prevention** — in-progress guard + trailing-run coalescence
 * 3. **Mutual exclusion** — skip if the main agent already wrote memories
 * 4. **Throttling** — only extract every N turns
 *
 * @example
 * ```ts
 * const extractor = new AutoMemoryExtractor({
 *   memoryStrategy: myStrategy,
 * });
 *
 * // Hook into agent post-turn:
 * agent.on('turn:complete', (messages) => {
 *   extractor.onTurnComplete(messages, 'What is the user doing?');
 * });
 *
 * // Drain pending extractions before shutdown:
 * await extractor.drain();
 * ```
 */

import type { MemoryExtractionStrategy, MemoryContext, ExtractionResult } from './strategies.js'

// ── Types ────────────────────────────────────────────────────────────────────

export type MessageLike = {
  role: string
  content: string
  id?: string
}

export type AutoExtractorConfig = {
  /** The extraction strategy to use for storing extracted memories. */
  extractionStrategy: MemoryExtractionStrategy
  /** Only extract every N turns. Default: 1 (every turn). */
  turnInterval?: number
  /** Only process messages if there are at least N new messages. Default: 3. */
  minNewMessages?: number
  /** Called when memories are extracted. */
  onExtracted?: (result: ExtractionResult) => void
  /** Called on extraction error. */
  onError?: (error: Error) => void
}

// ── AutoMemoryExtractor ──────────────────────────────────────────────────────

export class AutoMemoryExtractor {
  private readonly config: Required<Omit<AutoExtractorConfig, 'onExtracted' | 'onError'>> & Pick<AutoExtractorConfig, 'onExtracted' | 'onError'>
  private cursorIndex = 0          // Index of last processed message
  private turnsSinceExtraction = 0
  private inProgress = false
  private pendingArgs: { messages: MessageLike[]; currentQuery: string } | null = null
  private inFlightPromise: Promise<void> | null = null

  constructor(config: AutoExtractorConfig) {
    this.config = {
      turnInterval: 1,
      minNewMessages: 3,
      ...config,
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Called after each agent turn. Triggers background extraction
   * if the threshold is met.
   */
  onTurnComplete(messages: MessageLike[], currentQuery: string): void {
    this.turnsSinceExtraction++

    if (this.turnsSinceExtraction < this.config.turnInterval) return

    // Clamp cursor: if ContextManager compacted (truncated) the message history,
    // cursorIndex may point past the new array end. Reset to 0 so we don't
    // silently skip all new messages and never extract again.
    if (this.cursorIndex > messages.length) {
      this.cursorIndex = 0
    }

    const newMessages = messages.slice(this.cursorIndex)
    const modelVisible = newMessages.filter(m => m.role === 'user' || m.role === 'assistant')

    if (modelVisible.length < this.config.minNewMessages) return

    if (this.inProgress) {
      // Stash for trailing run — only keep the latest
      this.pendingArgs = { messages, currentQuery }
      return
    }

    this.runExtraction(messages, currentQuery)
  }

  /**
   * Wait for all in-flight extractions to complete.
   * Call before process exit.
   */
  async drain(timeoutMs = 30_000): Promise<void> {
    if (!this.inFlightPromise) return

    await Promise.race([
      this.inFlightPromise,
      new Promise<void>(resolve => setTimeout(resolve, timeoutMs)),
    ])
  }

  /** Force an immediate extraction (bypasses throttle). */
  async forceExtract(messages: MessageLike[], currentQuery: string): Promise<void> {
    await this.runExtractionAsync(messages, currentQuery)
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private runExtraction(messages: MessageLike[], currentQuery: string): void {
    const promise = this.runExtractionAsync(messages, currentQuery)
    this.inFlightPromise = promise
    promise.finally(() => {
      if (this.inFlightPromise === promise) {
        this.inFlightPromise = null
      }
    })
  }

  private async runExtractionAsync(messages: MessageLike[], currentQuery: string): Promise<void> {
    this.inProgress = true
    this.turnsSinceExtraction = 0

    try {
      // Build the MemoryContext expected by extraction strategies
      const ctx: MemoryContext = {
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        currentQuery,
        totalTokens: 0, // Approximate — strategies don't critically depend on this
        toolCallsSinceExtraction: 0,
      }

      // Check if the strategy wants to extract
      const shouldRun = await this.config.extractionStrategy.shouldExtract(ctx)
      if (!shouldRun) return

      // Execute extraction
      const result = await this.config.extractionStrategy.extract(ctx)

      // Advance cursor
      this.cursorIndex = messages.length

      if (result.extracted) {
        this.config.onExtracted?.(result)
      }
    } catch (error) {
      this.config.onError?.(error instanceof Error ? error : new Error(String(error)))
    } finally {
      this.inProgress = false

      // Run trailing extraction if messages were stashed
      const trailing = this.pendingArgs
      this.pendingArgs = null
      if (trailing) {
        await this.runExtractionAsync(trailing.messages, trailing.currentQuery)
      }
    }
  }
}
