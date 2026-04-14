/**
 * Google Gemini ChatModel + LLMAdapter + Streaming
 *
 * Uses the official `@google/genai` SDK. Install it separately:
 *   npm install @google/genai
 *
 * Supports both Google AI Studio (apiKey) and Vertex AI (project + location).
 * Extends `BaseLLMAdapter` — implements `complete()`, `stream()`, and the
 * message translation layer.
 *
 * @example
 * ```ts
 * // Google AI Studio
 * const model = new GeminiChatModel({ apiKey: process.env.GEMINI_API_KEY! });
 *
 * // Streaming
 * for await (const delta of model.stream({ messages })) {
 *   process.stdout.write(delta.content ?? '');
 * }
 *
 * // Vertex AI
 * const model = new GeminiChatModel({
 *   vertexAI: true,
 *   project: process.env.GOOGLE_CLOUD_PROJECT!,
 *   location: 'us-central1',
 *   model: 'gemini-1.5-pro',
 * });
 *
 * // Plugin registration
 * await host.register(new GeminiChatModel({ apiKey: '...' }));
 * const model = host.getLLMAdapter()!;
 * ```
 *
 * Peer dependency: `@google/genai` >= 0.7.0
 */

import type {
  ChatMessage,
  ChatResult,
  ChatDelta,
  ToolSchema,
  StreamingChatModel,
} from '../agents/runner.js'
import { BaseLLMAdapter } from './base.js'
import { YAAFError } from '../errors.js'
import { resolveModelSpecs } from './specs.js'

// ── Config ───────────────────────────────────────────────────────────────────

export type GeminiModelConfig =
  | {
    apiKey: string
    vertexAI?: false
    model?: string
    temperature?: number
    maxOutputTokens?: number
    contextWindowTokens?: number
  }
  | {
    vertexAI: true
    project: string
    location?: string
    model?: string
    temperature?: number
    maxOutputTokens?: number
    contextWindowTokens?: number
  }

// ── Local Gemini types (avoids peer-dep import at module level) ───────────────

type GeminiContent = { role: string; parts: GeminiPart[] }

type GeminiPart =
  | { text: string; thoughtSignature?: never }
  | { functionCall: { id?: string; name: string; args: Record<string, unknown> }; thoughtSignature?: string }
  | { functionResponse: { id?: string; name: string; response: { output: unknown } }; thoughtSignature?: never }

type GeminiFunctionDeclaration = {
  name: string
  description: string
  parametersJsonSchema: Record<string, unknown>
}

type GeminiCandidate = {
  content?: { parts: Array<Record<string, unknown>> }
  finishReason?: string
}

type GeminiResponse = {
  candidates?: GeminiCandidate[]
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    cachedContentTokenCount?: number
  }
}

type GenAIClient = {
  models: {
    generateContent(params: {
      model: string
      contents: GeminiContent[]
      config: Record<string, unknown>
    }): Promise<GeminiResponse>
    generateContentStream(params: {
      model: string
      contents: GeminiContent[]
      config: Record<string, unknown>
    }): AsyncIterable<GeminiResponse>
  }
}

// ── Message translation ───────────────────────────────────────────────────────

function toGeminiContents(messages: ChatMessage[]): {
  contents: GeminiContent[]
  systemInstruction: string | undefined
} {
  const systemParts: string[] = []
  const contents: GeminiContent[] = []
  let pendingToolResults: GeminiPart[] = []

  const flushToolResults = () => {
    if (pendingToolResults.length > 0) {
      contents.push({ role: 'user', parts: pendingToolResults })
      pendingToolResults = []
    }
  }

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemParts.push(msg.content)
      continue
    }

    if (msg.role === 'tool') {
      let response: unknown
      try { response = JSON.parse(msg.content) } catch { response = msg.content }
      pendingToolResults.push({
        functionResponse: {
          id: msg.toolCallId,
          name: msg.name,
          response: { output: response },
        },
      })
      continue
    }

    flushToolResults()

    if (msg.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: msg.content }] })
      continue
    }

    if (msg.role === 'assistant') {
      const parts: GeminiPart[] = []
      if (msg.content) parts.push({ text: msg.content })
      if (msg.toolCalls?.length) {
        for (const tc of msg.toolCalls) {
          let args: Record<string, unknown>
          try { args = JSON.parse(tc.arguments) } catch { args = {} }
          // Extract and strip the thought_signature we encoded during parseCandidate
          const thoughtSignature = args.__yaaf_sig__ as string | undefined
          if (thoughtSignature) delete args.__yaaf_sig__
          // thoughtSignature must be a sibling of functionCall on the Part,
          // NOT nested inside functionCall — this is per Gemini 3 API spec
          const part: GeminiPart = thoughtSignature
            ? { functionCall: { id: tc.id, name: tc.name, args }, thoughtSignature }
            : { functionCall: { id: tc.id, name: tc.name, args } }
          parts.push(part)
        }
      }
      if (parts.length > 0) contents.push({ role: 'model', parts })
    }
  }
  flushToolResults()

  return {
    contents,
    systemInstruction: systemParts.length > 0 ? systemParts.join('\n\n') : undefined,
  }
}

function toGeminiFunctions(tools: ToolSchema[]): GeminiFunctionDeclaration[] {
  return tools.map(t => ({
    name: t.function.name,
    description: t.function.description,
    parametersJsonSchema: t.function.parameters,
  }))
}

/** Build the shared config object for both batch and streaming calls */
function buildGeminiConfig(
  config: GeminiModelConfig,
  maxOutputTokens: number,
  params: {
    tools?: ToolSchema[]
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
    systemInstruction?: string
  },
): Record<string, unknown> {
  const genConfig: Record<string, unknown> = {
    temperature: params.temperature ?? config.temperature ?? 0.2,
    maxOutputTokens: params.maxTokens ?? maxOutputTokens,
    abortSignal: params.signal,
  }

  if (params.systemInstruction) genConfig.systemInstruction = params.systemInstruction

  if (params.tools?.length) {
    genConfig.tools = [{ functionDeclarations: toGeminiFunctions(params.tools) }]
    genConfig.toolConfig = { functionCallingConfig: { mode: 'AUTO' } }
    // Thinking models (e.g. gemini-3-flash-preview) require thought_signature
    // when tools are present. Setting thinkingBudget:0 disables the thinking
    // chain for tool-calling turns, which avoids this SDK-level requirement.
    genConfig.thinkingConfig = { thinkingBudget: 0 }
  }

  return genConfig
}

/** Parse a Gemini candidate into a ChatResult */
function parseCandidate(
  candidate: GeminiCandidate | undefined,
  usageMetadata: GeminiResponse['usageMetadata'],
): ChatResult {
  if (!candidate) return { content: '', finishReason: 'stop' }

  const parts = candidate.content?.parts ?? []
  const textParts: string[] = []
  const toolCalls: ChatResult['toolCalls'] = []

  for (const part of parts) {
    if (typeof part.text === 'string') textParts.push(part.text)

    const fc = part.functionCall as Record<string, unknown> | undefined
    if (fc) {
      // thoughtSignature is on the outer Part object (sibling of functionCall),
      // not nested inside functionCall itself. Embed it in args for round-trip.
      const args: Record<string, unknown> = (fc.args as Record<string, unknown>) ?? {}
      const thoughtSignature = part.thoughtSignature as string | undefined
      if (thoughtSignature) args.__yaaf_sig__ = thoughtSignature

      toolCalls.push({
        id: (fc.id as string | undefined) ??
          `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: (fc.name as string) ?? '',
        arguments: JSON.stringify(args),
      })
    }
  }

  const finishReason: ChatResult['finishReason'] =
    toolCalls.length > 0 ? 'tool_calls'
      : candidate.finishReason === 'MAX_TOKENS' ? 'length'
        : 'stop'

  const result: ChatResult = {
    content: textParts.join('') || undefined,
    finishReason,
  }

  if (toolCalls.length > 0) result.toolCalls = toolCalls

  if (usageMetadata) {
    result.usage = {
      promptTokens: usageMetadata.promptTokenCount ?? 0,
      completionTokens: usageMetadata.candidatesTokenCount ?? 0,
      cacheReadTokens: usageMetadata.cachedContentTokenCount,
    }
  }

  return result
}

// ── GeminiChatModel ──────────────────────────────────────────────────────────

export class GeminiChatModel extends BaseLLMAdapter implements StreamingChatModel {
  readonly model: string
  readonly contextWindowTokens: number
  readonly maxOutputTokens: number

  private client: GenAIClient | null = null
  private readonly config: GeminiModelConfig

  constructor(config: GeminiModelConfig) {
    const model = config.model ?? 'gemini-3-flash-preview'
    super(`gemini:${model}`)
    this.config = config
    this.model = model
    // Auto-resolve from registry; explicit config always wins
    const specs = resolveModelSpecs(model)
    this.contextWindowTokens = config.contextWindowTokens ?? specs.contextWindowTokens
    this.maxOutputTokens = config.maxOutputTokens ?? specs.maxOutputTokens
  }

  // ── Client initialization ─────────────────────────────────────────────────

  private async getClient(): Promise<GenAIClient> {
    if (this.client) return this.client

    let pkg: { GoogleGenAI: new (opts: Record<string, unknown>) => GenAIClient }
    try {
      // @ts-ignore — optional peer dependency, may not be installed
      pkg = await import('@google/genai') as typeof pkg
    } catch {
      throw new YAAFError(
        'Missing peer dependency: npm install @google/genai\n' +
        'GeminiChatModel requires @google/genai to be installed.',
        { code: 'API_ERROR', retryable: false, provider: 'gemini' },
      )
    }

    const opts: Record<string, unknown> = 'vertexAI' in this.config && this.config.vertexAI
      ? { vertexai: true, project: this.config.project, location: this.config.location ?? 'us-central1' }
      : { apiKey: (this.config as { apiKey: string }).apiKey }

    this.client = new pkg.GoogleGenAI(opts)
    return this.client
  }

  // ── complete() (batch) ────────────────────────────────────────────────────

  async complete(params: {
    messages: ChatMessage[]
    tools?: ToolSchema[]
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  }): Promise<ChatResult> {
    const client = await this.getClient()
    const { contents, systemInstruction } = toGeminiContents(params.messages)
    const genConfig = buildGeminiConfig(this.config, this.maxOutputTokens, {
      ...params,
      systemInstruction,
    })

    const response = await client.models.generateContent({
      model: this.model,
      contents,
      config: genConfig,
    })

    return parseCandidate(response.candidates?.[0], response.usageMetadata)
  }

  // ── stream() (SSE) ────────────────────────────────────────────────────────

  async *stream(params: {
    messages: ChatMessage[]
    tools?: ToolSchema[]
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  }): AsyncGenerator<ChatDelta, void, undefined> {
    const client = await this.getClient()
    const { contents, systemInstruction } = toGeminiContents(params.messages)
    const genConfig = buildGeminiConfig(this.config, this.maxOutputTokens, {
      ...params,
      systemInstruction,
    })

    const stream = await client.models.generateContentStream({
      model: this.model,
      contents,
      config: genConfig,
    })

    // Per-stream function call index counter.
    // Gemini delivers each parallel FC in its own chunk, and each must get a
    // unique index so the runner's assembledToolCalls map can track them separately.
    let fcIndex = 0

    for await (const chunk of stream) {
      const candidate = chunk.candidates?.[0]
      if (!candidate?.content?.parts) continue

      // Text content and finish reason are accumulated into a single delta.
      // Function calls are yielded as individual deltas (one per FC part) so
      // the runner can track them by index.
      let baseHasContent = false
      const baseDelta: ChatDelta = {}

      // Finish reason
      if (candidate.finishReason) {
        const toolCalled = candidate.content.parts.some(
          p => (p as Record<string, unknown>).functionCall !== undefined,
        )
        baseDelta.finishReason = toolCalled
          ? 'tool_calls'
          : candidate.finishReason === 'MAX_TOKENS' ? 'length' : 'stop'
        baseHasContent = true
      }

      // Usage (may be on the final chunk)
      if (chunk.usageMetadata) {
        baseDelta.usage = {
          promptTokens: chunk.usageMetadata.promptTokenCount ?? 0,
          completionTokens: chunk.usageMetadata.candidatesTokenCount ?? 0,
          cacheReadTokens: chunk.usageMetadata.cachedContentTokenCount,
        }
        baseHasContent = true
      }

      for (const part of candidate.content.parts) {
        // Text delta — fold into baseDelta
        if (typeof part.text === 'string' && part.text.length > 0) {
          baseDelta.content = (baseDelta.content ?? '') + part.text
          baseHasContent = true
        }

        // Function call delta — yield one delta per FC part with a unique index.
        // thoughtSignature is a Part-level sibling and only appears on the first
        // FC part in a parallel group (per Gemini 3 API spec).
        const fc = part.functionCall as Record<string, unknown> | undefined
        if (fc) {
          const args: Record<string, unknown> = (fc.args as Record<string, unknown>) ?? {}
          const sig = part.thoughtSignature as string | undefined
          if (sig) args.__yaaf_sig__ = sig

          yield {
            toolCallDelta: {
              index: fcIndex++,
              id: (fc.id as string | undefined) ??
                `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              name: fc.name as string,
              arguments: JSON.stringify(args),
            },
          }
        }
      }

      if (baseHasContent) yield baseDelta
    }
  }
}
