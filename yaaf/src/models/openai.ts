/**
 * OpenAI-compatible ChatModel + LLMAdapter + Streaming
 *
 * Works with: OpenAI, Groq, Together AI, Fireworks, Perplexity, Ollama,
 * vLLM, LiteLLM, and any other provider exposing the OpenAI chat completions API.
 *
 * Extends `BaseLLMAdapter` which provides `query()`, `summarize()`,
 * `estimateTokens()`, and `healthCheck()` — this class implements
 * `complete()`, `stream()`, and the provider-specific HTTP logic.
 *
 * @example
 * ```ts
 * // Direct use
 * const model = new OpenAIChatModel({ apiKey: process.env.OPENAI_API_KEY! });
 *
 * // Streaming
 * for await (const delta of model.stream({ messages })) {
 *   process.stdout.write(delta.content ?? '');
 * }
 *
 * // Groq
 * new OpenAIChatModel({
 *   apiKey: process.env.GROQ_API_KEY!,
 *   baseUrl: 'https://api.groq.com/openai/v1',
 *   model: 'llama-3.3-70b-versatile',
 * });
 *
 * // Ollama (local)
 * new OpenAIChatModel({
 *   apiKey: 'ollama',
 *   baseUrl: 'http://localhost:11434/v1',
 *   model: 'llama3.1',
 * });
 * ```
 *
 * No external dependencies — uses the native fetch API.
 */

import type {
  ChatMessage,
  ChatResult,
  ChatDelta,
  ToolSchema,
  StreamingChatModel,
  TokenUsage,
} from '../agents/runner.js'
import { BaseLLMAdapter } from './base.js'
import {
  classifyAPIError,
  APIConnectionError,
  AbortError,
} from '../errors.js'
import { resolveModelSpecs } from './specs.js'

// ── Config ───────────────────────────────────────────────────────────────────

export type OpenAIModelConfig = {
  /** API key — or 'ollama', 'local', etc. for local providers */
  apiKey: string
  /** Base URL (default: https://api.openai.com/v1) */
  baseUrl?: string
  /** Model name (default: gpt-4o-mini) */
  model?: string
  /** Request timeout in ms (default: 60_000) */
  timeoutMs?: number
  /** Extra headers to send with every request */
  headers?: Record<string, string>
  /** Context window size in tokens (default: 128_000) */
  contextWindowTokens?: number
  /** Maximum output tokens per completion (default: 4_096) */
  maxOutputTokens?: number
}

// ── OpenAI response types (local — avoids untyped JSON) ──────────────────────

type OpenAIResponse = {
  choices: Array<{
    message: {
      content?: string | null
      tool_calls?: Array<{
        id: string
        type: string
        function: { name: string; arguments: string }
      }>
    }
    finish_reason: string
  }>
  usage?: { prompt_tokens: number; completion_tokens: number }
}

/** SSE delta shape from OpenAI streaming */
type OpenAIStreamDelta = {
  choices: Array<{
    delta: {
      content?: string | null
      tool_calls?: Array<{
        index: number
        id?: string
        function?: { name?: string; arguments?: string }
      }>
    }
    finish_reason?: string | null
  }>
  usage?: { prompt_tokens: number; completion_tokens: number } | null
}

// ── Shared helpers ───────────────────────────────────────────────────────────

function buildRequestBody(
  model: string,
  maxOutputTokens: number,
  params: {
    messages: ChatMessage[]
    tools?: ToolSchema[]
    temperature?: number
    maxTokens?: number
  },
  stream?: boolean,
): Record<string, unknown> {
  const messages = params.messages.map(msg => {
    if (msg.role === 'tool') {
      return { role: 'tool' as const, tool_call_id: msg.toolCallId, content: msg.content }
    }
    if (msg.role === 'assistant' && msg.toolCalls?.length) {
      return {
        role: 'assistant' as const,
        content: msg.content ?? null,
        tool_calls: msg.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      }
    }
    return { role: msg.role, content: msg.content }
  })

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: params.temperature ?? 0.2,
    max_tokens: params.maxTokens ?? maxOutputTokens,
  }

  if (params.tools?.length) {
    body.tools = params.tools
    body.tool_choice = 'auto'
  }

  if (stream) {
    body.stream = true
    // Request usage in the final SSE chunk (supported by OpenAI)
    body.stream_options = { include_usage: true }
  }

  return body
}

function parseFinishReason(reason: string | null | undefined): ChatResult['finishReason'] {
  if (reason === 'tool_calls') return 'tool_calls'
  if (reason === 'length') return 'length'
  return 'stop'
}

// ── OpenAIChatModel ──────────────────────────────────────────────────────────

export class OpenAIChatModel extends BaseLLMAdapter implements StreamingChatModel {
  readonly model: string
  readonly contextWindowTokens: number
  readonly maxOutputTokens: number

  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly extraHeaders: Record<string, string>

  constructor(config: OpenAIModelConfig) {
    const model = config.model ?? 'gpt-4o-mini'
    super(`openai:${model}`)
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl?.replace(/\/$/, '') ?? 'https://api.openai.com/v1'
    this.model = model
    this.timeoutMs = config.timeoutMs ?? 60_000
    this.extraHeaders = config.headers ?? {}
    // Auto-resolve from registry; explicit config always wins
    const specs = resolveModelSpecs(model)
    this.contextWindowTokens = config.contextWindowTokens ?? specs.contextWindowTokens
    this.maxOutputTokens = config.maxOutputTokens ?? specs.maxOutputTokens
  }

  // ── Shared fetch ──────────────────────────────────────────────────────────

  private async doFetch(
    body: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    signal?.addEventListener('abort', () => controller.abort())

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...this.extraHeaders,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AbortError('Request was aborted')
      }
      throw new APIConnectionError(
        `Failed to connect to ${this.baseUrl}: ${err instanceof Error ? err.message : String(err)}`,
        { provider: 'openai', cause: err instanceof Error ? err : undefined },
      )
    } finally {
      clearTimeout(timer)
    }

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      throw classifyAPIError(response.status, text, 'openai', response.headers)
    }

    return response
  }

  // ── complete() (batch) ────────────────────────────────────────────────────

  async complete(params: {
    messages: ChatMessage[]
    tools?: ToolSchema[]
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  }): Promise<ChatResult> {
    const body = buildRequestBody(this.model, this.maxOutputTokens, params)
    const response = await this.doFetch(body, params.signal)
    const data = await response.json() as OpenAIResponse
    const choice = data.choices[0]!

    const result: ChatResult = {
      content: choice.message.content ?? undefined,
      finishReason: parseFinishReason(choice.finish_reason),
    }

    if (choice.message.tool_calls?.length) {
      result.toolCalls = choice.message.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      }))
      result.finishReason = 'tool_calls'
    }

    if (data.usage) {
      result.usage = {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
      }
    }

    return result
  }

  // ── stream() (SSE) ────────────────────────────────────────────────────────

  async *stream(params: {
    messages: ChatMessage[]
    tools?: ToolSchema[]
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  }): AsyncGenerator<ChatDelta, void, undefined> {
    const body = buildRequestBody(this.model, this.maxOutputTokens, params, true)
    const response = await this.doFetch(body, params.signal)

    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is not readable')

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events line-by-line
        const lines = buffer.split('\n')
        buffer = lines.pop()!   // keep incomplete last line

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(':')) continue
          if (trimmed === 'data: [DONE]') return

          if (trimmed.startsWith('data: ')) {
            const json = trimmed.slice(6)
            let chunk: OpenAIStreamDelta
            try {
              chunk = JSON.parse(json) as OpenAIStreamDelta
            } catch {
              continue  // malformed chunk, skip
            }

            const choice = chunk.choices?.[0]
            if (!choice) {
              // Usage-only final chunk (no choices)
              if (chunk.usage) {
                yield {
                  usage: {
                    promptTokens: chunk.usage.prompt_tokens,
                    completionTokens: chunk.usage.completion_tokens,
                  },
                }
              }
              continue
            }

            const delta: ChatDelta = {}

            if (choice.delta.content) {
              delta.content = choice.delta.content
            }

            if (choice.delta.tool_calls?.length) {
              const tc = choice.delta.tool_calls[0]!
              delta.toolCallDelta = {
                index: tc.index,
                id: tc.id,
                name: tc.function?.name,
                arguments: tc.function?.arguments,
              }
            }

            if (choice.finish_reason) {
              delta.finishReason = parseFinishReason(choice.finish_reason)
            }

            // Some providers send usage in the final delta
            if (chunk.usage) {
              delta.usage = {
                promptTokens: chunk.usage.prompt_tokens,
                completionTokens: chunk.usage.completion_tokens,
              }
            }

            yield delta
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
