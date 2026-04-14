/**
 * Anthropic Claude ChatModel + StreamingChatModel
 *
 * Implements the Anthropic Messages API (https://api.anthropic.com/v1/messages).
 * Compatible with claude-3, claude-3.5, claude-3-7, claude-opus-4, claude-sonnet-4,
 * and all future Claude models.
 *
 * Key API differences from OpenAI:
 *  - Auth via `x-api-key` + `anthropic-version` headers (no Bearer token)
 *  - System prompt is a top-level field, not a message role
 *  - Tool schema uses `input_schema` instead of `parameters`
 *  - Tool results go in a user message as `{type:'tool_result', tool_use_id, content}`
 *  - Response content is an array of typed blocks (text, tool_use)
 *  - Streaming uses named SSE events (content_block_start/delta/stop, message_delta)
 *  - Usage field: `input_tokens`, `output_tokens`, `cache_read_input_tokens`
 *
 * @example
 * ```ts
 * const model = new AnthropicChatModel({ apiKey: process.env.ANTHROPIC_API_KEY! })
 *
 * // Via Agent
 * const agent = new Agent({ provider: 'anthropic', model: 'claude-sonnet-4' })
 * ```
 *
 * No external SDK dependencies — uses native fetch.
 *
 * @module models/anthropic
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

export type AnthropicModelConfig = {
  /** Anthropic API key */
  apiKey: string
  /** Model name (default: claude-sonnet-4) */
  model?: string
  /**
   * API version header (default: '2023-06-01').
   * Only change this if Anthropic releases a new stable version.
   */
  apiVersion?: string
  /** Request timeout in ms (default: 120_000 — Claude can be slow on long tasks) */
  timeoutMs?: number
  /** Extra headers sent with every request */
  headers?: Record<string, string>
  /** Context window size in tokens (auto-resolved from registry if omitted) */
  contextWindowTokens?: number
  /** Maximum output tokens per completion (auto-resolved from registry if omitted) */
  maxOutputTokens?: number
}

// ── Anthropic wire types ─────────────────────────────────────────────────────

/** A single content block in a request or response */
type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string }

type AnthropicMessage = {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[]
}

type AnthropicTool = {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

type AnthropicResponse = {
  content: AnthropicContentBlock[]
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | string
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
  }
}

/** Streaming SSE event data (union — only use the fields we actually need) */
type AnthropicStreamEvent = {
  type: string
  // content_block_start
  index?: number
  content_block?: { type: string; id?: string; name?: string; text?: string }
  // content_block_delta
  delta?: {
    type: string
    text?: string           // text_delta
    partial_json?: string   // input_json_delta
    stop_reason?: string    // message_delta
  }
  // message_start / message_delta
  message?: {
    usage?: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number }
  }
  usage?: { output_tokens: number; cache_read_input_tokens?: number }
  // error event
  error?: { type: string; message: string }
}

// ── Message conversion ────────────────────────────────────────────────────────

/**
 * Convert YAAF ChatMessage[] → Anthropic messages array + system string.
 *
 * Anthropic rules:
 * - `system` role → top-level `system` param (joined with double newlines)
 * - `tool` role  → user message with `{type: 'tool_result', tool_use_id, content}`
 * - `assistant` with toolCalls → content array with `{type: 'tool_use', id, name, input}`
 * - Messages must strictly alternate user/assistant (Anthropic rejects consecutive same roles)
 */
function toAnthropicMessages(messages: ChatMessage[]): {
  system: string | undefined
  messages: AnthropicMessage[]
} {
  const systemParts: string[] = []
  const anthropicMessages: AnthropicMessage[] = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      if (msg.content) systemParts.push(msg.content)
      continue
    }

    if (msg.role === 'tool') {
      // Tool results must be batched into a single user message when there are
      // consecutive tool results (one per tool call in the previous assistant turn).
      // We fold them into the previous user message if it's tool_result-only,
      // otherwise start a new user message.
      const lastMsg = anthropicMessages[anthropicMessages.length - 1]
      const toolResultBlock: AnthropicContentBlock = {
        type: 'tool_result',
        tool_use_id: msg.toolCallId,
        content: msg.content,
      }

      if (
        lastMsg?.role === 'user' &&
        Array.isArray(lastMsg.content) &&
        (lastMsg.content as AnthropicContentBlock[]).every(b => b.type === 'tool_result')
      ) {
        // Extend the existing user tool-result message
        ;(lastMsg.content as AnthropicContentBlock[]).push(toolResultBlock)
      } else {
        anthropicMessages.push({ role: 'user', content: [toolResultBlock] })
      }
      continue
    }

    if (msg.role === 'assistant') {
      const contentBlocks: AnthropicContentBlock[] = []

      if (msg.content) {
        contentBlocks.push({ type: 'text', text: msg.content })
      }

      if (msg.toolCalls?.length) {
        for (const tc of msg.toolCalls) {
          let input: Record<string, unknown>
          try { input = JSON.parse(tc.arguments) } catch { input = {} }
          contentBlocks.push({ type: 'tool_use', id: tc.id, name: tc.name, input })
        }
      }

      if (contentBlocks.length > 0) {
        anthropicMessages.push({
          role: 'assistant',
          content: contentBlocks.length === 1 && contentBlocks[0]!.type === 'text'
            ? (contentBlocks[0] as { type: 'text'; text: string }).text  // simple string form
            : contentBlocks,
        })
      }
      continue
    }

    // user role
    anthropicMessages.push({ role: 'user', content: msg.content ?? '' })
  }

  return {
    system: systemParts.length > 0 ? systemParts.join('\n\n') : undefined,
    messages: anthropicMessages,
  }
}

/**
 * Convert YAAF ToolSchema[] → Anthropic tools array.
 *
 * YAAF stores tools in the OpenAI function-calling format:
 *   `{ type: 'function', function: { name, description, parameters } }`
 *
 * Anthropic uses:
 *   `{ name, description, input_schema }` (input_schema = JSON Schema object)
 */
function toAnthropicTools(tools: ToolSchema[]): AnthropicTool[] {
  return tools.map(t => ({
    name: t.function.name,
    description: t.function.description ?? '',
    input_schema: (t.function.parameters ?? { type: 'object', properties: {} }) as Record<string, unknown>,
  }))
}

function parseFinishReason(stopReason: string): ChatResult['finishReason'] {
  if (stopReason === 'tool_use') return 'tool_calls'
  if (stopReason === 'max_tokens') return 'length'
  return 'stop'  // end_turn and everything else
}

function parseUsage(usage: AnthropicResponse['usage']): TokenUsage {
  return {
    promptTokens: usage.input_tokens,
    completionTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens,
  }
}

// ── AnthropicChatModel ────────────────────────────────────────────────────────

export class AnthropicChatModel extends BaseLLMAdapter implements StreamingChatModel {
  readonly model: string
  readonly contextWindowTokens: number
  readonly maxOutputTokens: number

  private readonly apiKey: string
  private readonly apiVersion: string
  private readonly timeoutMs: number
  private readonly extraHeaders: Record<string, string>

  constructor(config: AnthropicModelConfig) {
    const model = config.model ?? 'claude-sonnet-4'
    super(`anthropic:${model}`)
    this.apiKey = config.apiKey
    this.model = model
    this.apiVersion = config.apiVersion ?? '2023-06-01'
    this.timeoutMs = config.timeoutMs ?? 120_000
    this.extraHeaders = config.headers ?? {}

    const specs = resolveModelSpecs(model)
    this.contextWindowTokens = config.contextWindowTokens ?? specs.contextWindowTokens
    this.maxOutputTokens = config.maxOutputTokens ?? specs.maxOutputTokens
  }

  // ── Shared fetch ───────────────────────────────────────────────────────────

  private async doFetch(
    body: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    signal?.addEventListener('abort', () => controller.abort())

    let response: Response
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
          'content-type': 'application/json',
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
        `Failed to connect to Anthropic API: ${err instanceof Error ? err.message : String(err)}`,
        { provider: 'anthropic', cause: err instanceof Error ? err : undefined },
      )
    } finally {
      clearTimeout(timer)
    }

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      throw classifyAPIError(response.status, text, 'anthropic', response.headers)
    }

    return response
  }

  private buildBody(
    params: {
      messages: ChatMessage[]
      tools?: ToolSchema[]
      temperature?: number
      maxTokens?: number
    },
    stream = false,
  ): Record<string, unknown> {
    const { system, messages } = toAnthropicMessages(params.messages)

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      max_tokens: params.maxTokens ?? this.maxOutputTokens,
      temperature: params.temperature ?? 0.2,
    }

    if (system) body.system = system

    if (params.tools?.length) {
      body.tools = toAnthropicTools(params.tools)
      body.tool_choice = { type: 'auto' }
    }

    if (stream) body.stream = true

    return body
  }

  // ── complete() (batch) ─────────────────────────────────────────────────────

  async complete(params: {
    messages: ChatMessage[]
    tools?: ToolSchema[]
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  }): Promise<ChatResult> {
    const body = this.buildBody(params)
    const response = await this.doFetch(body, params.signal)
    const data = await response.json() as AnthropicResponse

    const result: ChatResult = {
      finishReason: parseFinishReason(data.stop_reason),
      usage: parseUsage(data.usage),
    }

    for (const block of data.content) {
      if (block.type === 'text') {
        result.content = (result.content ?? '') + block.text
      } else if (block.type === 'tool_use') {
        result.toolCalls ??= []
        result.toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input),
        })
      }
    }

    if (result.toolCalls?.length) {
      result.finishReason = 'tool_calls'
    }

    return result
  }

  // ── stream() (SSE) ─────────────────────────────────────────────────────────

  async *stream(params: {
    messages: ChatMessage[]
    tools?: ToolSchema[]
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  }): AsyncGenerator<ChatDelta, void, undefined> {
    const body = this.buildBody(params, true)
    const response = await this.doFetch(body, params.signal)

    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is not readable')

    const decoder = new TextDecoder()
    let buffer = ''

    // Streaming state — tool calls are accumulated across multiple deltas
    // because Anthropic streams JSON arguments incrementally via input_json_delta.
    type InFlightTool = { id: string; name: string; argumentsBuffer: string }
    const inFlightTools = new Map<number, InFlightTool>()
    let inputTokens = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Anthropic SSE format: `event: <name>\ndata: <json>\n\n`
        // We split on double-newline boundaries between events.
        const events = buffer.split(/\n\n/)
        buffer = events.pop() ?? ''  // keep the last (possibly incomplete) segment

        for (const rawEvent of events) {
          // Each event block contains lines like `event: foo` and `data: {...}`
          let eventType = ''
          let eventData = ''

          for (const line of rawEvent.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim()
            else if (line.startsWith('data: ')) {
              eventData += line.slice(6)
            }
          }

          if (!eventData) continue

          let event: AnthropicStreamEvent
          try { event = JSON.parse(eventData) as AnthropicStreamEvent } catch { continue }

          // ── message_start: gives input token count ───────────────────────
          if (eventType === 'message_start' || event.type === 'message_start') {
            const usage = event.message?.usage
            if (usage) {
              inputTokens = usage.input_tokens
            }
            continue
          }

          // ── content_block_start: registers a new tool_use block ──────────
          if (eventType === 'content_block_start' || event.type === 'content_block_start') {
            const block = event.content_block
            if (block?.type === 'tool_use' && event.index !== undefined) {
              inFlightTools.set(event.index, {
                id: block.id ?? '',
                name: block.name ?? '',
                argumentsBuffer: '',
              })
            }
            continue
          }

          // ── content_block_delta: text or tool argument fragment ───────────
          if (eventType === 'content_block_delta' || event.type === 'content_block_delta') {
            const delta = event.delta
            if (!delta) continue

            if (delta.type === 'text_delta' && delta.text) {
              yield { content: delta.text }
            } else if (delta.type === 'input_json_delta' && delta.partial_json !== undefined) {
              // Accumulate partial JSON for this tool block
              const tool = inFlightTools.get(event.index ?? -1)
              if (tool) {
                tool.argumentsBuffer += delta.partial_json
                // Emit a streaming tool call delta (index = the block index)
                yield {
                  toolCallDelta: {
                    index: event.index!,
                    id: tool.id,
                    name: tool.name,
                    arguments: delta.partial_json,
                  },
                }
              }
            }
            continue
          }

          // ── content_block_stop: flush completed tool calls ───────────────
          if (eventType === 'content_block_stop' || event.type === 'content_block_stop') {
            // Nothing to emit here — the runner accumulates from toolCallDelta
            continue
          }

          // ── message_delta: stop reason + output token count ───────────────
          if (eventType === 'message_delta' || event.type === 'message_delta') {
            const stopReason = event.delta?.stop_reason
            const outputTokens = event.usage?.output_tokens ?? 0
            const cacheRead = event.usage?.cache_read_input_tokens

            yield {
              finishReason: stopReason ? parseFinishReason(stopReason) : undefined,
              usage: {
                promptTokens: inputTokens,
                completionTokens: outputTokens,
                cacheReadTokens: cacheRead,
              },
            }
            continue
          }

          // ── error event: surface as a thrown error ───────────────────────
          if (eventType === 'error' || event.type === 'error') {
            const msg = event.error?.message ?? 'Unknown streaming error from Anthropic'
            throw classifyAPIError(500, msg, 'anthropic', new Headers())
          }

          // ping, message_stop, and unknown events are intentionally ignored
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
