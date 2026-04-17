/**
 * Hooks — lifecycle callbacks for the agent execution loop.
 *
 * Hooks intercept every tool call and LLM turn. Unlike events (read-only),
 * hooks can block, modify, or short-circuit the execution.
 *
 * @example
 * ```ts
 * const agent = new Agent({
 * systemPrompt: '...',
 * hooks: {
 * beforeToolCall: async ({ toolName, arguments: args }) => {
 * if (toolName === 'book_trip' && !userConfirmed) {
 * return { action: 'block', reason: 'Awaiting user confirmation' };
 * }
 * return { action: 'continue' };
 * },
 * afterToolCall: async ({ toolName }, result) => {
 * await auditLog.record({ tool: toolName, result });
 * return { action: 'continue' };
 * },
 * },
 * });
 * ```
 */

import type { ChatMessage, ChatResult } from "./agents/runner.js";
import { Logger } from "./utils/logger.js";

const logger = new Logger("hooks");

// ── Hook types ────────────────────────────────────────────────────────────────

export type HookContext = {
  /** Name of the tool being called */
  toolName: string;
  /** Parsed arguments the LLM passed to the tool */
  arguments: Record<string, unknown>;
  /** Full conversation history at time of hook */
  messages: readonly ChatMessage[];
  /** Current iteration (LLM call count) in this agent run */
  iteration: number;
};

export type HookResult =
  | { action: "continue" }
  | { action: "block"; reason: string }
  | { action: "modify"; arguments: Record<string, unknown> };

export type LLMHookResult =
  | { action: "continue" }
  | { action: "override"; content: string }
  /** Stop the agent run immediately. Content is set to the reason message. */
  | { action: "stop"; reason: string };

export type Hooks = {
  /**
   * Called before every tool invocation.
   * Return `block` to prevent the tool from running.
   * Return `modify` to alter the arguments before execution.
   */
  beforeToolCall?: (ctx: HookContext) => Promise<HookResult> | HookResult;

  /**
   * Called after every tool invocation with its result.
   * Return `block` to replace the result with an error.
   * Return `continue` to pass the result through unchanged.
   */
  afterToolCall?: (
    ctx: HookContext,
    result: unknown,
    error?: Error,
  ) => Promise<HookResult> | HookResult;

  /**
   * Called before each LLM API call. Receives the current message list
   * and can return a modified list (e.g. inject context, redact PII).
   * Return void/undefined to use messages unchanged.
   */
  beforeLLM?: (messages: ChatMessage[]) => Promise<ChatMessage[] | void> | ChatMessage[] | void;

  /**
   * Called after each LLM response.
   * Use for logging, cost tracking, or streaming partial output.
   * Return `override` to replace the response content.
   */
  afterLLM?: (
    response: ChatResult,
    iteration: number,
  ) => Promise<LLMHookResult | void> | LLMHookResult | void;
};

// ── Hook dispatcher (used internally by AgentRunner) ─────────────────────────

/** Optional callbacks for the runner to emit events from hook dispatchers. */
export type HookEventCallbacks = {
  onError?: (hookName: string, error: string) => void;
  onBlock?: (hookName: string, toolName: string, reason: string) => void;
};

export async function dispatchBeforeToolCall(
  hooks: Hooks | undefined,
  ctx: HookContext,
  callbacks?: HookEventCallbacks,
): Promise<HookResult> {
  if (!hooks?.beforeToolCall) return { action: "continue" };
  try {
    const result = (await hooks.beforeToolCall(ctx)) ?? { action: "continue" };
    if (result.action === "block") {
      callbacks?.onBlock?.("beforeToolCall", ctx.toolName, result.reason);
    }
    return result;
  } catch (err) {
    // fail-CLOSED for pre-execution hooks — a broken security check
    // should NOT silently allow the tool to proceed.
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("beforeToolCall hook threw — blocking tool call (fail-closed)", { error: msg });
    callbacks?.onError?.("beforeToolCall", msg);
    return { action: "block", reason: `Security hook error: ${msg}` };
  }
}

export async function dispatchAfterToolCall(
  hooks: Hooks | undefined,
  ctx: HookContext,
  result: unknown,
  error?: Error,
  callbacks?: HookEventCallbacks,
): Promise<HookResult> {
  if (!hooks?.afterToolCall) return { action: "continue" };
  try {
    const hookResult = (await hooks.afterToolCall(ctx, result, error)) ?? { action: "continue" };
    if (hookResult.action === "block") {
      callbacks?.onBlock?.("afterToolCall", ctx.toolName, hookResult.reason);
    }
    return hookResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("afterToolCall hook threw", { error: msg });
    callbacks?.onError?.("afterToolCall", msg);
    return { action: "continue" };
  }
}

/**
 * `beforeLLM` now fails CLOSED on error.
 * If a beforeLLM hook throws (e.g. PII redactor, PromptGuard), the LLM call
 * is blocked by re-throwing. This prevents unredacted/unscanned messages from
 * reaching the LLM when a security hook is broken.
 */
export async function dispatchBeforeLLM(
  hooks: Hooks | undefined,
  messages: ChatMessage[],
  callbacks?: HookEventCallbacks,
): Promise<ChatMessage[]> {
  if (!hooks?.beforeLLM) return messages;
  try {
    return (await hooks.beforeLLM(messages)) ?? messages;
  } catch (err) {
    // Fail-closed — a broken security hook (PII redactor,
    // PromptGuard, etc.) must block the LLM call, not silently pass through.
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("beforeLLM hook threw — blocking LLM call (fail-closed)", { error: msg });
    callbacks?.onError?.("beforeLLM", msg);
    throw new Error(`beforeLLM hook failed (fail-closed): ${msg}`);
  }
}

/**
 * `afterLLM` now fails CLOSED on error.
 * If an afterLLM hook throws (e.g. OutputSanitizer, PII redactor), the
 * LLM response is blocked with a 'stop' action. This prevents unsanitized
 * output from reaching the user when a security hook is broken.
 */
export async function dispatchAfterLLM(
  hooks: Hooks | undefined,
  response: ChatResult,
  iteration: number,
  callbacks?: HookEventCallbacks,
): Promise<LLMHookResult> {
  if (!hooks?.afterLLM) return { action: "continue" };
  try {
    return (await hooks.afterLLM(response, iteration)) ?? { action: "continue" };
  } catch (err) {
    // Fail-closed — a broken output sanitizer or PII redactor
    // must block the response, not let unsanitized data through.
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("afterLLM hook threw — blocking response (fail-closed)", { error: msg });
    callbacks?.onError?.("afterLLM", msg);
    return { action: "stop", reason: `afterLLM hook failed (fail-closed): ${msg}` };
  }
}
