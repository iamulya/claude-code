/**
 * Hooks — lifecycle callbacks for the agent execution loop.
 *
 * Hooks intercept every tool call and LLM turn. Unlike events (read-only),
 * hooks can block, modify, or short-circuit the execution.
 *
 * @example
 * ```ts
 * const agent = new Agent({
 *   systemPrompt: '...',
 *   hooks: {
 *     beforeToolCall: async ({ toolName, arguments: args }) => {
 *       if (toolName === 'book_trip' && !userConfirmed) {
 *         return { action: 'block', reason: 'Awaiting user confirmation' };
 *       }
 *       return { action: 'continue' };
 *     },
 *     afterToolCall: async ({ toolName }, result) => {
 *       await auditLog.record({ tool: toolName, result });
 *       return { action: 'continue' };
 *     },
 *   },
 * });
 * ```
 */

import type { ChatMessage, ChatResult } from './agents/runner.js'
import { Logger } from './utils/logger.js'

const logger = new Logger('hooks')

// ── Hook types ────────────────────────────────────────────────────────────────

export type HookContext = {
  /** Name of the tool being called */
  toolName: string
  /** Parsed arguments the LLM passed to the tool */
  arguments: Record<string, unknown>
  /** Full conversation history at time of hook */
  messages: readonly ChatMessage[]
  /** Current iteration (LLM call count) in this agent run */
  iteration: number
}

export type HookResult =
  | { action: 'continue' }
  | { action: 'block'; reason: string }
  | { action: 'modify'; arguments: Record<string, unknown> }

export type LLMHookResult =
  | { action: 'continue' }
  | { action: 'override'; content: string }

export type Hooks = {
  /**
   * Called before every tool invocation.
   * Return `block` to prevent the tool from running.
   * Return `modify` to alter the arguments before execution.
   */
  beforeToolCall?: (
    ctx: HookContext,
  ) => Promise<HookResult> | HookResult

  /**
   * Called after every tool invocation with its result.
   * Return `block` to replace the result with an error.
   * Return `continue` to pass the result through unchanged.
   */
  afterToolCall?: (
    ctx: HookContext,
    result: unknown,
    error?: Error,
  ) => Promise<HookResult> | HookResult

  /**
   * Called before each LLM API call. Receives the current message list
   * and can return a modified list (e.g. inject context, redact PII).
   * Return void/undefined to use messages unchanged.
   */
  beforeLLM?: (
    messages: ChatMessage[],
  ) => Promise<ChatMessage[] | void> | ChatMessage[] | void

  /**
   * Called after each LLM response.
   * Use for logging, cost tracking, or streaming partial output.
   * Return `override` to replace the response content.
   */
  afterLLM?: (
    response: ChatResult,
    iteration: number,
  ) => Promise<LLMHookResult | void> | LLMHookResult | void
}

// ── Hook dispatcher (used internally by AgentRunner) ─────────────────────────

export async function dispatchBeforeToolCall(
  hooks: Hooks | undefined,
  ctx: HookContext,
): Promise<HookResult> {
  if (!hooks?.beforeToolCall) return { action: 'continue' }
  try {
    return (await hooks.beforeToolCall(ctx)) ?? { action: 'continue' }
  } catch (err) {
    logger.error('beforeToolCall hook threw', { error: err instanceof Error ? err.message : String(err) })
    return { action: 'continue' }
  }
}

export async function dispatchAfterToolCall(
  hooks: Hooks | undefined,
  ctx: HookContext,
  result: unknown,
  error?: Error,
): Promise<HookResult> {
  if (!hooks?.afterToolCall) return { action: 'continue' }
  try {
    return (await hooks.afterToolCall(ctx, result, error)) ?? { action: 'continue' }
  } catch (err) {
    logger.error('afterToolCall hook threw', { error: err instanceof Error ? err.message : String(err) })
    return { action: 'continue' }
  }
}

export async function dispatchBeforeLLM(
  hooks: Hooks | undefined,
  messages: ChatMessage[],
): Promise<ChatMessage[]> {
  if (!hooks?.beforeLLM) return messages
  try {
    return (await hooks.beforeLLM(messages)) ?? messages
  } catch (err) {
    logger.error('beforeLLM hook threw', { error: err instanceof Error ? err.message : String(err) })
    return messages
  }
}

export async function dispatchAfterLLM(
  hooks: Hooks | undefined,
  response: ChatResult,
  iteration: number,
): Promise<LLMHookResult> {
  if (!hooks?.afterLLM) return { action: 'continue' }
  try {
    return (await hooks.afterLLM(response, iteration)) ?? { action: 'continue' }
  } catch (err) {
    logger.error('afterLLM hook threw', { error: err instanceof Error ? err.message : String(err) })
    return { action: 'continue' }
  }
}
