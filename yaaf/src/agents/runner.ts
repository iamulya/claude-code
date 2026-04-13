/**
 * Agent Runner — The LLM ↔ Tool execution loop
 *
 * This is the missing piece that makes the framework usable: a generic
 * agent loop that sends messages to an LLM, parses tool call requests,
 * executes tools, feeds results back, and repeats until done.
 *
 * The runner is LLM-agnostic — it works with any provider that implements
 * the `ChatModel` interface (OpenAI, Gemini, Ollama, Groq, etc.)
 *
 * v2: Added hooks, permissions, and sandbox support.
 *
 * @example
 * ```ts
 * const runner = new AgentRunner({
 *   model: new OpenAIChatModel({ apiKey: '...' }),
 *   tools: [grepTool, readTool, writeTool],
 *   systemPrompt: 'You are a helpful coding assistant.',
 * });
 *
 * const response = await runner.run('Find all TODO comments');
 * console.log(response);
 * // The runner called grep, then summarized the results
 * ```
 *
 * @module agents/runner
 */

import { findToolByName, type Tool, type ToolContext } from '../tools/tool.js'
import type { Hooks } from '../hooks.js'
import type { PermissionPolicy } from '../permissions.js'
import type { Sandbox } from '../sandbox.js'
import { withRetry, type RetryConfig } from '../utils/retry.js'
import {
  dispatchBeforeToolCall,
  dispatchAfterToolCall,
  dispatchBeforeLLM,
  dispatchAfterLLM,
} from '../hooks.js'
import {
  startLLMRequestSpan,
  endLLMRequestSpan,
  startToolCallSpan,
  endToolCallSpan,
  startToolExecutionSpan,
  endToolExecutionSpan,
} from '../telemetry/tracing.js'

// ── Chat Types (OpenAI-compatible, industry standard) ────────────────────────

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content?: string; toolCalls?: ToolCall[] }
  | { role: 'tool'; toolCallId: string; name: string; content: string }

export type ToolCall = {
  id: string
  name: string
  arguments: string // JSON string
}

export type ToolSchema = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

/** Token usage for a single LLM call */
export type TokenUsage = {
  promptTokens: number
  completionTokens: number
  /** Tokens served from prompt cache (if supported) */
  cacheReadTokens?: number
  /** Tokens written to prompt cache (if supported) */
  cacheWriteTokens?: number
}

export type ChatResult = {
  content?: string
  toolCalls?: ToolCall[]
  finishReason: 'stop' | 'tool_calls' | 'length'
  usage?: TokenUsage
}

/** Incremental streaming delta from the LLM */
export type ChatDelta = {
  /** Incremental text content */
  content?: string
  /** Partial tool call assembly (index-based, same as OpenAI SSE) */
  toolCallDelta?: {
    index: number
    id?: string
    name?: string
    arguments?: string   // incremental JSON fragment
  }
  /** Set on the final delta */
  finishReason?: 'stop' | 'tool_calls' | 'length'
  /** Token usage (present on the final delta if the provider supports it) */
  usage?: TokenUsage
}

/** Aggregated token usage across a session / run */
export type SessionUsage = {
  totalPromptTokens: number
  totalCompletionTokens: number
  llmCalls: number
  /** Wall-clock ms for all LLM calls combined */
  totalDurationMs: number
}

// ── ChatModel Interface ──────────────────────────────────────────────────────

/**
 * Interface for any LLM that supports tool calling.
 * Uses an OpenAI-compatible message/tool schema (industry standard).
 *
 * Implement this for your LLM provider:
 * - OpenAI: wrap `/v1/chat/completions`
 * - Gemini: wrap `generateContent` (translate function_call)
 * - Ollama: wrap `/api/chat`
 * - Any OpenAI-compatible API
 */
export interface ChatModel {
  complete(params: {
    messages: ChatMessage[]
    tools?: ToolSchema[]
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  }): Promise<ChatResult>
}

/**
 * Extended interface for models that support streaming.
 * Models can implement this in addition to ChatModel.
 */
export interface StreamingChatModel extends ChatModel {
  /**
   * Stream a completion as an async generator of deltas.
   * The caller assembles the full response from the deltas.
   */
  stream(params: {
    messages: ChatMessage[]
    tools?: ToolSchema[]
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  }): AsyncGenerator<ChatDelta, void, undefined>
}

// ── Runner Events ────────────────────────────────────────────────────────────

export type RunnerEvents = {
  'tool:call': { name: string; arguments: Record<string, unknown> }
  'tool:result': { name: string; result: unknown; durationMs: number }
  'tool:error': { name: string; error: string }
  'tool:blocked': { name: string; reason: string }
  'tool:sandbox-violation': { name: string; violationType: string; detail: string }
  'llm:request': { messageCount: number; toolCount: number }
  'llm:response': { hasToolCalls: boolean; contentLength: number; usage?: TokenUsage; durationMs: number }
  'llm:delta': ChatDelta
  'llm:retry': { attempt: number; maxRetries: number; error: unknown; delayMs: number }
  'iteration': { count: number; maxIterations: number }
  'usage': SessionUsage
}

export type RunnerEventHandler<K extends keyof RunnerEvents> = (
  data: RunnerEvents[K],
) => void

// ── Agent Runner ─────────────────────────────────────────────────────────────

export type AgentRunnerConfig = {
  /** The LLM to use for reasoning */
  model: ChatModel
  /** Tools available to the agent */
  tools: readonly Tool[]
  /** System prompt defining the agent's role and capabilities */
  systemPrompt: string
  /** Maximum LLM round-trips before stopping (default: 15) */
  maxIterations?: number
  /** Temperature for LLM sampling (default: 0.2) */
  temperature?: number
  /** Maximum output tokens per LLM call (default: 4096) */
  maxTokens?: number
  /**
   * Lifecycle hooks — observe, block, or modify tool calls and LLM turns.
   * @see Hooks
   */
  hooks?: Hooks
  /**
   * Permission policy — gate tool calls with allow/deny/escalate rules.
   * @see PermissionPolicy
   */
  permissions?: PermissionPolicy
  /**
   * Execution sandbox — enforce timeouts, path restrictions, and network limits.
   * @see Sandbox
   */
  sandbox?: Sandbox
  /**
   * Retry configuration for LLM calls.
   * Default: 5 retries with exponential backoff.
   */
  retry?: RetryConfig
}

/**
 * AgentRunner — drives the LLM ↔ Tool loop.
 *
 * Flow:
 * ```
 * User message
 *   → beforeLLM hook
 *   → [LLM]
 *   → afterLLM hook
 *   → for each tool_call:
 *       → permission check
 *       → beforeToolCall hook
 *       → sandbox.execute(tool)
 *       → afterToolCall hook
 *   → [LLM] → ... → final text
 * ```
 */
export class AgentRunner {
  private messages: ChatMessage[] = []
  private readonly toolSchemas: ToolSchema[]
  private readonly toolContext: ToolContext
  private readonly config: Required<Omit<AgentRunnerConfig, 'hooks' | 'permissions' | 'sandbox' | 'retry'>> & {
    hooks?: Hooks
    permissions?: PermissionPolicy
    sandbox?: Sandbox
    retry?: RetryConfig
  }
  private eventHandlers = new Map<
    keyof RunnerEvents,
    Array<RunnerEventHandler<keyof RunnerEvents>>
  >()
  /** Aggregated token usage across the runner's lifetime */
  private _sessionUsage: SessionUsage = {
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    llmCalls: 0,
    totalDurationMs: 0,
  }

  constructor(config: AgentRunnerConfig) {
    this.config = {
      ...config,
      maxIterations: config.maxIterations ?? 15,
      temperature: config.temperature ?? 0.2,
      maxTokens: config.maxTokens ?? 4096,
    }

    // Convert tools to LLM-consumable schemas
    this.toolSchemas = config.tools.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.userFacingName(undefined) || t.name,
        parameters: t.inputSchema as Record<string, unknown>,
      },
    }))

    // Default tool context (signal always injected at call time)
    this.toolContext = {
      model: 'unknown',
      tools: config.tools,
      signal: new AbortController().signal, // placeholder; overridden in run()
      messages: [],
    }
  }

  // ── Event System ─────────────────────────────────────────────────────────

  on<K extends keyof RunnerEvents>(
    event: K,
    handler: RunnerEventHandler<K>,
  ): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(
      handler as RunnerEventHandler<keyof RunnerEvents>,
    )
  }

  private emit<K extends keyof RunnerEvents>(
    event: K,
    data: RunnerEvents[K],
  ): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      for (const handler of handlers) handler(data)
    }
  }

  // ── Core Loop ────────────────────────────────────────────────────────────

  /**
   * Run one conversation turn.
   * Sends the user message, loops through tool calls, returns the final response.
   */
  async run(userMessage: string, signal?: AbortSignal): Promise<string> {
    this.messages.push({ role: 'user', content: userMessage })

    let iterations = 0

    while (iterations < this.config.maxIterations) {
      iterations++
      this.emit('iteration', {
        count: iterations,
        maxIterations: this.config.maxIterations,
      })

      // Build full message list with system prompt
      let allMessages: ChatMessage[] = [
        { role: 'system', content: this.config.systemPrompt },
        ...this.messages,
      ]

      this.emit('llm:request', {
        messageCount: allMessages.length,
        toolCount: this.toolSchemas.length,
      })

      // ── beforeLLM hook ──────────────────────────────────────────────────
      allMessages = await dispatchBeforeLLM(this.config.hooks, allMessages)

      // ── LLM call with retry + OTel span ─────────────────────────────────
      const llmStart   = Date.now()
      const llmSpan    = startLLMRequestSpan({
        model:        'unknown', // ChatModel doesn't expose model name
        messageCount: allMessages.length,
        toolCount:    this.toolSchemas.length,
      })
      const retryConfig: RetryConfig = {
        ...this.config.retry,
        signal,
        onRetry: (info) => {
          this.emit('llm:retry', info)
          return this.config.retry?.onRetry?.(info)
        },
      }

      const result = await withRetry(
        () => this.config.model.complete({
          messages: allMessages,
          tools: this.toolSchemas.length > 0 ? this.toolSchemas : undefined,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
          signal,
        }),
        retryConfig,
      )
      const llmDurationMs = Date.now() - llmStart

      // Track session usage
      this._sessionUsage.llmCalls++
      this._sessionUsage.totalDurationMs += llmDurationMs
      if (result.usage) {
        this._sessionUsage.totalPromptTokens  += result.usage.promptTokens
        this._sessionUsage.totalCompletionTokens += result.usage.completionTokens
      }

      this.emit('llm:response', {
        hasToolCalls:  !!result.toolCalls?.length,
        contentLength: result.content?.length ?? 0,
        usage:         result.usage,
        durationMs:    llmDurationMs,
      })
      this.emit('usage', { ...this._sessionUsage })

      // End LLM span
      endLLMRequestSpan(llmSpan, {
        inputTokens:      result.usage?.promptTokens,
        outputTokens:     result.usage?.completionTokens,
        cacheReadTokens:  result.usage?.cacheReadTokens,
        cacheWriteTokens: result.usage?.cacheWriteTokens,
        durationMs:       llmDurationMs,
        hasToolCalls:     !!result.toolCalls?.length,
        finishReason:     result.finishReason,
      })

      // ── afterLLM hook ───────────────────────────────────────────────────
      const afterLlm = await dispatchAfterLLM(this.config.hooks, result, iterations)
      let finalContent = result.content
      if (afterLlm.action === 'override') finalContent = afterLlm.content

      // If the LLM wants to call tools
      if (result.toolCalls && result.toolCalls.length > 0) {
        // Add assistant message with tool calls
        this.messages.push({
          role: 'assistant',
          content: finalContent,
          toolCalls: result.toolCalls,
        })

        // Execute each tool call
        for (const call of result.toolCalls) {
          let parsedArgs: Record<string, unknown>
          try {
            parsedArgs = JSON.parse(call.arguments)
          } catch {
            parsedArgs = {}
          }

          this.emit('tool:call', { name: call.name, arguments: parsedArgs })

          // Start tool span (wraps permission check + execution)
          const toolSpan = startToolCallSpan({ toolName: call.name, args: parsedArgs })

          // ── Permission check ──────────────────────────────────────────
          if (this.config.permissions) {
            const outcome = await this.config.permissions.evaluate(call.name, parsedArgs)
            if (outcome.action === 'deny') {
              const reason = outcome.reason
              this.emit('tool:blocked', { name: call.name, reason })
              endToolCallSpan({ blocked: true, blockReason: reason, durationMs: 0 })
              this.messages.push({
                role: 'tool',
                toolCallId: call.id,
                name: call.name,
                content: JSON.stringify({ error: `Permission denied: ${reason}` }),
              })
              continue
            }
          }

          // ── beforeToolCall hook ───────────────────────────────────────
          const hookCtx = {
            toolName: call.name,
            arguments: parsedArgs,
            messages: this.messages as readonly ChatMessage[],
            iteration: iterations,
          }

          const beforeResult = await dispatchBeforeToolCall(this.config.hooks, hookCtx)
          if (beforeResult.action === 'block') {
            this.emit('tool:blocked', { name: call.name, reason: beforeResult.reason })
            endToolCallSpan({ blocked: true, blockReason: beforeResult.reason, durationMs: 0 })
            this.messages.push({
              role: 'tool',
              toolCallId: call.id,
              name: call.name,
              content: JSON.stringify({ error: `Blocked by hook: ${beforeResult.reason}` }),
            })
            continue
          }

          // If hook modified args, use those
          const effectiveArgs = beforeResult.action === 'modify'
            ? beforeResult.arguments
            : parsedArgs

          const startTime = Date.now()
          let toolResultStr: string
          let sandboxDurationMs: number | undefined

          try {
            const tool = findToolByName(this.config.tools, call.name)
            if (tool) {
              const ctx: ToolContext = {
                ...this.toolContext,
                signal: signal ?? new AbortController().signal,
                messages: this.messages.map(m => ({
                  role: m.role,
                  content: 'content' in m ? m.content : '',
                })),
              }

              // ── Sandbox execution ───────────────────────────────────
              let rawResult: unknown
              const execSpan = startToolExecutionSpan()

              if (this.config.sandbox) {
                try {
                  const sandboxed = await this.config.sandbox.execute(
                    call.name,
                    effectiveArgs,
                    async (args) => tool.call(args, ctx),
                  )
                  rawResult        = sandboxed.value
                  sandboxDurationMs = sandboxed.durationMs
                  endToolExecutionSpan(execSpan, { durationMs: sandboxDurationMs })
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err)
                  endToolExecutionSpan(execSpan, { error: msg })
                  const isSandboxErr = err instanceof Error && err.name === 'SandboxError'
                  if (isSandboxErr) {
                    const sandboxErr = err as { violation?: { type: string; detail: string } }
                    this.emit('tool:sandbox-violation', {
                      name:          call.name,
                      violationType: sandboxErr.violation?.type ?? 'unknown',
                      detail:        sandboxErr.violation?.detail ?? msg,
                    })
                  }
                  throw err
                }
              } else {
                try {
                  rawResult = await tool.call(effectiveArgs, ctx)
                  endToolExecutionSpan(execSpan)
                } catch (err) {
                  endToolExecutionSpan(execSpan, { error: err instanceof Error ? err.message : String(err) })
                  throw err
                }
              }

              const res = rawResult as { data: unknown }
              toolResultStr = typeof res.data === 'string'
                ? res.data
                : JSON.stringify(res.data, null, 2)

              // Truncate if needed
              if (tool.maxResultChars > 0 && toolResultStr.length > tool.maxResultChars) {
                toolResultStr =
                  toolResultStr.slice(0, tool.maxResultChars) +
                  `\n... [truncated, ${toolResultStr.length} chars total]`
              }
            } else {
              toolResultStr = JSON.stringify({ error: `Unknown tool: ${call.name}` })
            }

            const durationMs = sandboxDurationMs ?? (Date.now() - startTime)
            this.emit('tool:result', {
              name:      call.name,
              result:    toolResultStr.slice(0, 200),
              durationMs,
            })

            // ── afterToolCall hook ──────────────────────────────────
            await dispatchAfterToolCall(this.config.hooks, hookCtx, toolResultStr)

            // Close tool call span
            endToolCallSpan({ durationMs })
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err)
            toolResultStr  = JSON.stringify({ error: errorMsg })
            this.emit('tool:error', { name: call.name, error: errorMsg })
            // Close tool call span with error
            endToolCallSpan({ error: errorMsg })
            await dispatchAfterToolCall(
              this.config.hooks,
              hookCtx,
              undefined,
              err instanceof Error ? err : new Error(errorMsg),
            )
          }

          // Add tool result to history
          this.messages.push({
            role: 'tool',
            toolCallId: call.id,
            name: call.name,
            content: toolResultStr,
          })
        }

        // Continue the loop — LLM will process tool results
        continue
      }

      // No tool calls — this is the final response
      const response = finalContent ?? ''
      this.messages.push({ role: 'assistant', content: response })
      return response
    }

    return '[Agent reached maximum iterations without producing a final response]'
  }

  /**
   * Add a message to the conversation history without triggering a run.
   * Useful for injecting context or tool results from external sources.
   * Returns `this` for fluent chaining.
   */
  addMessage(message: ChatMessage): this {
    this.messages.push(message)
    return this
  }

  /** Get the full conversation history */
  getHistory(): readonly ChatMessage[] {
    return this.messages
  }

  /** Get the number of messages in history */
  get messageCount(): number {
    return this.messages.length
  }

  /** Clear conversation history */
  reset(): void {
    this.messages = []
  }

  /** Get aggregated token usage across all LLM calls */
  get sessionUsage(): Readonly<SessionUsage> {
    return { ...this._sessionUsage }
  }

  /** Reset usage counters (e.g. between billing periods) */
  resetUsage(): void {
    this._sessionUsage = {
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      llmCalls: 0,
      totalDurationMs: 0,
    }
  }

  /** Expose the underlying ChatModel for external reuse (e.g. plan-mode planner) */
  get model(): ChatModel {
    return this.config.model
  }
}
