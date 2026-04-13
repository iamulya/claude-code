/**
 * Stream Adapter — Bridges AgentRunner stream events to runtime events.
 *
 * The AgentRunner yields detailed internal events (RunnerStreamEvent):
 *   text_delta, tool_call_start, tool_call_result, llm_request, iteration, etc.
 *
 * The runtime harnesses (createCLI, createServer, createWorker) expect
 * simplified events (RuntimeStreamEvent):
 *   text_delta, tool_call_start, tool_call_end, error, done
 *
 * This adapter bridges the gap, allowing `Agent` to be passed directly
 * to any runtime harness:
 *
 * @example
 * ```ts
 * import { Agent } from 'yaaf';
 * import { adaptStream, toStreamableAgent } from 'yaaf';
 * import { createCLI } from 'yaaf/cli-runtime';
 *
 * const agent = new Agent({ ... });
 *
 * // Option 1: Wrap the entire agent
 * createCLI(toStreamableAgent(agent), { streaming: true });
 *
 * // Option 2: Adapt a single stream
 * for await (const event of adaptStream(agent.runStream('Hello'))) {
 *   console.log(event);
 * }
 * ```
 *
 * @module runtime/adapter
 */

import type { RunnerStreamEvent } from '../agents/runner.js'

// ── Unified Runtime Stream Event ─────────────────────────────────────────────

/**
 * Simplified stream event for runtime consumers (CLI, server, worker).
 *
 * This is the common event type accepted by createCLI, createServer,
 * and createWorker. It strips internal details (iteration counts,
 * LLM request metadata) and provides a clean consumer-facing interface.
 */
export type RuntimeStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call_start'; toolName: string; args?: Record<string, unknown> }
  | { type: 'tool_call_end'; toolName: string; durationMs?: number; error?: boolean }
  | { type: 'tool_blocked'; toolName: string; reason: string }
  | { type: 'error'; text: string }
  | { type: 'usage'; promptTokens: number; completionTokens: number; totalCalls: number }
  | { type: 'done'; text: string }

// ── Stream Adapter ───────────────────────────────────────────────────────────

/**
 * Adapts a RunnerStreamEvent async iterable into RuntimeStreamEvent.
 *
 * Filters out internal-only events (iteration, llm_request, llm_response)
 * and maps the rest to the simplified runtime format.
 */
export async function* adaptStream(
  source: AsyncIterable<RunnerStreamEvent>,
): AsyncGenerator<RuntimeStreamEvent, void, undefined> {
  let fullText = ''

  for await (const event of source) {
    switch (event.type) {
      case 'text_delta':
        fullText += event.content
        yield { type: 'text_delta', text: event.content }
        break

      case 'tool_call_start':
        yield {
          type: 'tool_call_start',
          toolName: event.name,
          args: event.arguments,
        }
        break

      case 'tool_call_result':
        yield {
          type: 'tool_call_end',
          toolName: event.name,
          durationMs: event.durationMs,
          error: event.error,
        }
        break

      case 'tool_blocked':
        yield {
          type: 'tool_blocked',
          toolName: event.name,
          reason: event.reason,
        }
        break

      case 'usage':
        yield {
          type: 'usage',
          promptTokens: event.usage.totalPromptTokens,
          completionTokens: event.usage.totalCompletionTokens,
          totalCalls: event.usage.llmCalls,
        }
        break

      case 'final_response':
        fullText = event.content
        break

      // Skip internal events: iteration, llm_request, llm_response
    }
  }

  yield { type: 'done', text: fullText }
}

// ── Agent Wrapper ────────────────────────────────────────────────────────────

/**
 * The interface expected by runtime harnesses.
 * Matches the CLIAgent / ServerAgent / WorkerAgent shape.
 */
export type StreamableAgent = {
  run(input: string, signal?: AbortSignal): Promise<string>
  runStream(input: string, signal?: AbortSignal): AsyncIterable<RuntimeStreamEvent>
}

/**
 * Wraps a YAAF Agent (which yields RunnerStreamEvent) into a
 * StreamableAgent (which yields RuntimeStreamEvent) compatible
 * with all runtime harnesses.
 *
 * @example
 * ```ts
 * import { Agent } from 'yaaf';
 * import { toStreamableAgent } from 'yaaf';
 * import { createCLI } from 'yaaf/cli-runtime';
 *
 * const agent = new Agent({
 *   systemPrompt: 'You are a helpful assistant.',
 *   tools: myTools,
 * });
 *
 * createCLI(toStreamableAgent(agent), {
 *   name: 'my-assistant',
 *   streaming: true,
 * });
 * ```
 */
export function toStreamableAgent(
  agent: {
    run(input: string, signal?: AbortSignal): Promise<string>
    runStream(input: string, signal?: AbortSignal): AsyncIterable<RunnerStreamEvent>
  },
): StreamableAgent {
  return {
    run: (input: string, signal?: AbortSignal) => agent.run(input, signal),

    runStream: (input: string, signal?: AbortSignal) =>
      adaptStream(agent.runStream(input, signal)),
  }
}
