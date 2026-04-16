/**
 * BaseLLMAdapter — shared abstract base for all YAAF LLM adapter implementations.
 *
 * Provides the shared implementations of `query()`, `summarize()`,
 * `estimateTokens()`, and `healthCheck()` — all expressed in terms of the
 * abstract `complete()` method that subclasses must implement.
 *
 * Subclasses only need to implement:
 * - `complete(params)` — the full LLM call with tool support
 * - `stream(params)` — SSE streaming (optional, has a default fallback)
 * - `readonly model: string` — the model identifier
 * - `readonly contextWindowTokens: number`
 * - `readonly maxOutputTokens: number`
 * - `constructor` — call `super(name)` with a unique plugin name
 */

import { PluginBase } from '../plugin/base.js'
import type { LLMAdapter, LLMQueryParams, LLMResponse, LLMMessage } from '../plugin/types.js'
import type {
  ChatModel,
  StreamingChatModel,
  ChatMessage,
  ChatResult,
  ChatDelta,
  ToolSchema,
} from '../agents/runner.js'
import { estimateTokens as rawEstimateTokens } from '../utils/tokens.js'

export abstract class BaseLLMAdapter extends PluginBase implements LLMAdapter, StreamingChatModel {
  // ── Abstract surface — each provider implements these ─────────────────────

  abstract readonly model: string
  abstract readonly contextWindowTokens: number
  abstract readonly maxOutputTokens: number
  abstract complete(params: {
    messages: ChatMessage[]
    tools?: ToolSchema[]
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  }): Promise<ChatResult>

  constructor(name: string) {
    super(name, ['llm'])
  }

  // ── H3 FIX: Retry with exponential backoff ─────────────────────────────────

  /**
   * Retry transient API errors with exponential backoff + jitter.
   *
   * Retries on:
   * - HTTP 429 (rate limit)
   * - HTTP 500 (server error)
   * - HTTP 503 (service unavailable)
   * - Network errors (ECONNRESET, ETIMEDOUT, fetch failures)
   *
   * @param fn — async function to retry
   * @param maxRetries — maximum retry attempts (default: 3)
   * @param baseDelayMs — initial delay in ms (default: 1000)
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelayMs = 1_000,
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))

        if (attempt >= maxRetries || !this.isRetryableError(lastError)) {
          throw lastError
        }

        // Exponential backoff with jitter: delay = baseDelay * 2^attempt + random jitter
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * baseDelayMs * 0.5
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  /**
   * Determine if an error is retryable (transient API error).
   * Override in subclasses for provider-specific error handling.
   */
  protected isRetryableError(err: Error): boolean {
    const msg = err.message.toLowerCase()

    // HTTP status code checks
    if (msg.includes('429') || msg.includes('rate limit')) return true
    if (msg.includes('500') || msg.includes('internal server error')) return true
    if (msg.includes('503') || msg.includes('service unavailable')) return true
    if (msg.includes('502') || msg.includes('bad gateway')) return true

    // Network errors
    if (msg.includes('econnreset') || msg.includes('etimedout')) return true
    if (msg.includes('econnrefused') || msg.includes('epipe')) return true
    if (msg.includes('network') || msg.includes('fetch failed')) return true
    if (msg.includes('socket hang up')) return true

    // Provider-specific transient errors
    if (msg.includes('overloaded') || msg.includes('capacity')) return true

    return false
  }

  // ── Streaming — default fallback wraps complete() ─────────────────────────

  /**
   * Stream a completion as an async generator of deltas.
   * Default implementation wraps `complete()` into a single delta —
   * subclasses should override with real SSE streaming.
   */
  async *stream(params: {
    messages: ChatMessage[]
    tools?: ToolSchema[]
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  }): AsyncGenerator<ChatDelta, void, undefined> {
    const result = await this.complete(params)

    // Emit a single delta containing the full response
    yield {
      content: result.content,
      finishReason: result.finishReason,
      usage: result.usage,
    }
  }

  // ── LLMAdapter — shared implementations ───────────────────────────────────

  /**
   * Simple text query — no tool schemas, no history management.
   * Wraps `complete()` with a single-user-message conversation.
   * H3 FIX: Wrapped in withRetry() for transient error resilience.
   */
  async query(params: LLMQueryParams): Promise<LLMResponse> {
    return this.withRetry(async () => {
      const chatMessages: ChatMessage[] = []
      if (params.system) {
        chatMessages.push({ role: 'system', content: params.system })
      }
      for (const m of params.messages) {
        chatMessages.push({ role: m.role, content: m.content })
      }

      const result = await this.complete({
        messages: chatMessages,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
        signal: params.signal,
      })

      return {
        content: result.content ?? '',
        tokensUsed: {
          input: result.usage?.promptTokens ?? 0,
          output: result.usage?.completionTokens ?? 0,
        },
        model: this.model,
        stopReason: result.finishReason,
      }
    })
  }

  /**
   * Summarize a conversation into a compact string.
   * Used by ContextManager for context compaction.
   * H3 FIX: Wrapped in withRetry() for transient error resilience.
   */
  async summarize(messages: LLMMessage[], instructions?: string): Promise<string> {
    return this.withRetry(async () => {
      const systemParts = [
        'You are a conversation summarizer. Compress the provided conversation into a compact, information-dense summary that preserves all key facts, decisions, and context. Focus on what was done, what was learned, and what state was established.',
      ]
      if (instructions) systemParts.push(instructions)

      const formatted = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
      const result = await this.complete({
        messages: [
          { role: 'system', content: systemParts.join('\n\n') },
          { role: 'user', content: `Summarize this conversation:\n\n${formatted}` },
        ],
        temperature: 0.1,
        maxTokens: 1024,
      })
      return result.content ?? ''
    })
  }

  /** Rough token estimate — no network call. */
  estimateTokens(text: string): number {
    return rawEstimateTokens(text)
  }

  /**
   * Health check — sends a minimal 1-token request.
   * Override for a cheaper / non-billable check if your provider supports it.
   */
  override async healthCheck(): Promise<boolean> {
    try {
      const result = await this.complete({
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 1,
        temperature: 0,
      })
      return result.finishReason === 'length' || !!result.content
    } catch {
      return false
    }
  }
}
