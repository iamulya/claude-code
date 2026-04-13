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
   */
  async query(params: LLMQueryParams): Promise<LLMResponse> {
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
  }

  /**
   * Summarize a conversation into a compact string.
   * Used by ContextManager for context compaction.
   */
  async summarize(messages: LLMMessage[], instructions?: string): Promise<string> {
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
