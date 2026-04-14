/**
 * Shared test helpers for the YAAF test suite.
 *
 * - `createMockModel` — stateless mock that returns scripted ChatResult[] in order
 * - `createSpyModel` — records every prompt and returns a canned response
 * - `wait` — tiny async sleep (replaces `new Promise(r => setTimeout(r, ms))` noise)
 * - `collectEvents` — subscribes to a runner event and collects all occurrences
 */

import type { AgentRunner, ChatModel, ChatResult } from '../agents/runner.js'
import type { RunnerEvents } from '../agents/runner.js'

// ── Mock Model ───────────────────────────────────────────────────────────────

/**
 * Creates a mock ChatModel that returns scripted responses in order.
 * When the list is exhausted it returns `[no more responses]`.
 */
export function createMockModel(responses: ChatResult[]): ChatModel & { model: string } {
  let callIndex = 0
  return {
    model: 'test-model',
    async complete() {
      const result =
        responses[callIndex] ?? { content: '[no more responses]', finishReason: 'stop' as const }
      callIndex++
      return result
    },
  }
}

// ── Spy Model ────────────────────────────────────────────────────────────────

export type SpyCall = { messages: { role: string; content: string }[]; callIndex: number }

/**
 * Creates a mock ChatModel that records every prompt sent to it.
 * Used to verify what the Doctor's LLM (or any LLM) receives during a run.
 *
 * @param response - The canned response to return on every call.
 * @returns `{ model, calls }` where `calls` is the recorded prompt array.
 */
export function createSpyModel(response: string = 'Diagnosis complete.') {
  const calls: SpyCall[] = []
  const model: ChatModel & { model: string } = {
    model: 'spy-model',
    async complete(params: any) {
      calls.push({ messages: [...params.messages], callIndex: calls.length })
      return { content: response, finishReason: 'stop' as const }
    },
  }
  return { model, calls }
}

// ── Utilities ────────────────────────────────────────────────────────────────

/**
 * Async sleep helper — replaces `await new Promise(r => setTimeout(r, ms))`.
 */
export function wait(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Subscribe to a runner event and collect all occurrences into an array.
 * Returns the array reference (grows in-place as events arrive).
 */
export function collectEvents<K extends keyof RunnerEvents>(
  runner: AgentRunner,
  event: K,
): Array<RunnerEvents[K]> {
  const collected: Array<RunnerEvents[K]> = []
  runner.on(event, (data) => collected.push(data))
  return collected
}
