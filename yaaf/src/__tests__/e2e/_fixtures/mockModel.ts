/**
 * Shared mock ChatModel for E2E tests.
 *
 * Provides deterministic, scriptable LLM responses so tests are:
 * - Free (no API calls)
 * - Fast (no network I/O)
 * - Reproducible (same responses every time)
 */

import type {
  ChatModel,
  ChatResult,
  ChatMessage,
  StreamingChatModel,
  ChatDelta,
} from "../../../agents/runner.js";

// ── Types ────────────────────────────────────────────────────────────────────

export type RecordedCall = {
  messages: ChatMessage[];
  tools?: unknown[];
  callIndex: number;
};

// ── Mock Model ───────────────────────────────────────────────────────────────

/**
 * Creates a mock ChatModel that returns scripted responses in order
 * and records every call for assertion.
 */
export function mockModel(responses: ChatResult[]): ChatModel & {
  model: string;
  calls: RecordedCall[];
} {
  let callIndex = 0;
  const calls: RecordedCall[] = [];
  return {
    model: "mock-e2e-model",
    calls,
    async complete(params) {
      calls.push({
        messages: [...params.messages],
        tools: params.tools ? [...params.tools] : undefined,
        callIndex: calls.length,
      });
      const result = responses[callIndex] ?? {
        content: "[no more responses]",
        finishReason: "stop" as const,
      };
      callIndex++;
      return result;
    },
  };
}

/**
 * Convenience: model that returns text responses in sequence.
 */
export function textModel(...texts: string[]): ChatModel & {
  model: string;
  calls: RecordedCall[];
} {
  return mockModel(
    texts.map((t) => ({ content: t, finishReason: "stop" as const })),
  );
}

/**
 * Convenience: model that requests a tool call, then returns final text.
 */
export function toolCallingModel(
  toolName: string,
  args: Record<string, unknown>,
  finalText: string,
): ChatModel & { model: string; calls: RecordedCall[] } {
  return mockModel([
    {
      content: "",
      toolCalls: [
        {
          id: `tc_${toolName}_1`,
          name: toolName,
          arguments: JSON.stringify(args),
        },
      ],
      finishReason: "tool_calls",
    },
    { content: finalText, finishReason: "stop" },
  ]);
}

/**
 * Model that calls multiple tools in sequence (one per turn),
 * then returns final text.
 */
export function multiToolModel(
  calls: Array<{ name: string; args: Record<string, unknown> }>,
  finalText: string,
): ChatModel & { model: string; calls: RecordedCall[] } {
  const responses: ChatResult[] = calls.map((c, i) => ({
    content: "",
    toolCalls: [
      {
        id: `tc_${c.name}_${i}`,
        name: c.name,
        arguments: JSON.stringify(c.args),
      },
    ],
    finishReason: "tool_calls" as const,
  }));
  responses.push({ content: finalText, finishReason: "stop" });
  return mockModel(responses);
}

/**
 * Model that calls N tools in parallel (all in one response),
 * then returns final text.
 */
export function parallelToolModel(
  calls: Array<{ name: string; args: Record<string, unknown> }>,
  finalText: string,
): ChatModel & { model: string; calls: RecordedCall[] } {
  return mockModel([
    {
      content: "",
      toolCalls: calls.map((c, i) => ({
        id: `tc_${c.name}_${i}`,
        name: c.name,
        arguments: JSON.stringify(c.args),
      })),
      finishReason: "tool_calls",
    },
    { content: finalText, finishReason: "stop" },
  ]);
}

// ── Streaming Mock Model ─────────────────────────────────────────────────────

export function streamingMockModel(
  responses: ChatResult[],
): StreamingChatModel & { model: string; calls: RecordedCall[] } {
  let callIndex = 0;
  const calls: RecordedCall[] = [];
  return {
    model: "mock-e2e-streaming",
    calls,
    async complete(params) {
      calls.push({
        messages: [...params.messages],
        tools: params.tools ? [...params.tools] : undefined,
        callIndex: calls.length,
      });
      const result = responses[callIndex] ?? {
        content: "[no more responses]",
        finishReason: "stop" as const,
      };
      callIndex++;
      return result;
    },
    async *stream(params) {
      calls.push({
        messages: [...params.messages],
        tools: params.tools ? [...params.tools] : undefined,
        callIndex: calls.length,
      });
      const result = responses[callIndex] ?? {
        content: "[no more responses]",
        finishReason: "stop" as const,
      };
      callIndex++;
      if (result.content) {
        for (const char of result.content) {
          yield { content: char } as ChatDelta;
        }
      }
      if (result.toolCalls) {
        for (let i = 0; i < result.toolCalls.length; i++) {
          const tc = result.toolCalls[i]!;
          yield {
            toolCallDelta: {
              index: i,
              id: tc.id,
              name: tc.name,
              arguments: tc.arguments,
            },
          } as ChatDelta;
        }
      }
      yield { finishReason: result.finishReason ?? "stop" } as ChatDelta;
    },
  };
}
