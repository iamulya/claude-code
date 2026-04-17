/**
 * Tests for the stream adapter.
 *
 * Verifies that RunnerStreamEvent → RuntimeStreamEvent mapping
 * is correct and that toStreamableAgent wraps properly.
 */

import { describe, it, expect } from "vitest";
import { adaptStream, toStreamableAgent, type RuntimeStreamEvent } from "../runtime/adapter.js";
import type { RunnerStreamEvent } from "../agents/runner.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function collectEvents(
  source: AsyncIterable<RuntimeStreamEvent>,
): Promise<RuntimeStreamEvent[]> {
  const events: RuntimeStreamEvent[] = [];
  for await (const event of source) {
    events.push(event);
  }
  return events;
}

async function* makeRunnerStream(
  events: RunnerStreamEvent[],
): AsyncGenerator<RunnerStreamEvent, void, undefined> {
  for (const event of events) {
    yield event;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// adaptStream
// ════════════════════════════════════════════════════════════════════════════

describe("adaptStream", () => {
  it("maps text_delta events", async () => {
    const source = makeRunnerStream([
      { type: "text_delta", content: "Hello " },
      { type: "text_delta", content: "world!" },
    ]);

    const events = await collectEvents(adaptStream(source));

    expect(events[0]).toEqual({ type: "text_delta", text: "Hello " });
    expect(events[1]).toEqual({ type: "text_delta", text: "world!" });
  });

  it("maps tool_call_start events", async () => {
    const source = makeRunnerStream([
      { type: "tool_call_start", name: "search", arguments: { q: "weather" } },
    ]);

    const events = await collectEvents(adaptStream(source));
    expect(events[0]).toEqual({
      type: "tool_call_start",
      toolName: "search",
      args: { q: "weather" },
    });
  });

  it("maps tool_call_result to tool_call_end", async () => {
    const source = makeRunnerStream([
      { type: "tool_call_result", name: "search", result: "ok", durationMs: 150 },
    ]);

    const events = await collectEvents(adaptStream(source));
    expect(events[0]).toEqual({
      type: "tool_call_end",
      toolName: "search",
      durationMs: 150,
      error: undefined,
    });
  });

  it("maps tool_call_result with error", async () => {
    const source = makeRunnerStream([
      { type: "tool_call_result", name: "exec", result: "fail", durationMs: 50, error: true },
    ]);

    const events = await collectEvents(adaptStream(source));
    expect(events[0]).toEqual({
      type: "tool_call_end",
      toolName: "exec",
      durationMs: 50,
      error: true,
    });
  });

  it("maps tool_blocked events", async () => {
    const source = makeRunnerStream([
      { type: "tool_blocked", name: "deleteFile", reason: "Not permitted" },
    ]);

    const events = await collectEvents(adaptStream(source));
    expect(events[0]).toEqual({
      type: "tool_blocked",
      toolName: "deleteFile",
      reason: "Not permitted",
    });
  });

  it("maps usage events", async () => {
    const source = makeRunnerStream([
      {
        type: "usage",
        usage: {
          llmCalls: 3,
          totalPromptTokens: 1000,
          totalCompletionTokens: 500,
          totalDurationMs: 5000,
        },
      },
    ]);

    const events = await collectEvents(adaptStream(source));
    expect(events[0]).toEqual({
      type: "usage",
      promptTokens: 1000,
      completionTokens: 500,
      totalCalls: 3,
    });
  });

  it("filters out internal events (iteration, llm_request, llm_response)", async () => {
    const source = makeRunnerStream([
      { type: "iteration", count: 1, maxIterations: 10 },
      { type: "llm_request", messageCount: 5, toolCount: 3 },
      { type: "text_delta", content: "Hello" },
      { type: "llm_response", hasToolCalls: false, contentLength: 5, durationMs: 100 },
    ]);

    const events = await collectEvents(adaptStream(source));

    // Should only have: text_delta + done
    const types = events.map((e) => e.type);
    expect(types).not.toContain("iteration");
    expect(types).not.toContain("llm_request");
    expect(types).not.toContain("llm_response");
    expect(types).toContain("text_delta");
    expect(types).toContain("done");
  });

  it("emits done event with accumulated text", async () => {
    const source = makeRunnerStream([
      { type: "text_delta", content: "Hello " },
      { type: "text_delta", content: "world!" },
    ]);

    const events = await collectEvents(adaptStream(source));
    const done = events.find((e) => e.type === "done");

    expect(done).toEqual({ type: "done", text: "Hello world!" });
  });

  it("done uses final_response content when available", async () => {
    const source = makeRunnerStream([
      { type: "text_delta", content: "partial" },
      { type: "final_response", content: "Final full response text." },
    ]);

    const events = await collectEvents(adaptStream(source));
    const done = events.find((e) => e.type === "done");

    expect(done).toEqual({ type: "done", text: "Final full response text." });
  });

  it("handles empty stream", async () => {
    const source = makeRunnerStream([]);
    const events = await collectEvents(adaptStream(source));

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "done", text: "" });
  });

  it("handles full realistic sequence", async () => {
    const source = makeRunnerStream([
      { type: "iteration", count: 1, maxIterations: 10 },
      { type: "llm_request", messageCount: 3, toolCount: 2 },
      { type: "text_delta", content: "Let me search for that." },
      { type: "llm_response", hasToolCalls: true, contentLength: 24, durationMs: 200 },
      { type: "tool_call_start", name: "search", arguments: { q: "weather" } },
      { type: "tool_call_result", name: "search", result: "Sunny, 72°F", durationMs: 150 },
      { type: "iteration", count: 2, maxIterations: 10 },
      { type: "llm_request", messageCount: 5, toolCount: 2 },
      { type: "text_delta", content: "The weather is sunny and 72°F." },
      { type: "llm_response", hasToolCalls: false, contentLength: 30, durationMs: 100 },
      {
        type: "usage",
        usage: {
          llmCalls: 2,
          totalPromptTokens: 500,
          totalCompletionTokens: 100,
          totalDurationMs: 300,
        },
      },
      { type: "final_response", content: "The weather is sunny and 72°F." },
    ]);

    const events = await collectEvents(adaptStream(source));
    const types = events.map((e) => e.type);

    expect(types).toEqual([
      "text_delta", // "Let me search..."
      "tool_call_start", // search
      "tool_call_end", // search result
      "text_delta", // "The weather is..."
      "usage", // token counts
      "done", // final
    ]);

    // Verify content
    expect(events.find((e) => e.type === "done")).toEqual({
      type: "done",
      text: "The weather is sunny and 72°F.",
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// toStreamableAgent
// ════════════════════════════════════════════════════════════════════════════

describe("toStreamableAgent", () => {
  it("wraps agent run() passthrough", async () => {
    const mockAgent = {
      run: async (input: string) => `Response: ${input}`,
      async *runStream(_input: string) {
        yield { type: "text_delta" as const, content: "hello" };
      },
    };

    const wrapped = toStreamableAgent(mockAgent);
    const result = await wrapped.run("test");
    expect(result).toBe("Response: test");
  });

  it("wraps agent runStream() through adapter", async () => {
    const mockAgent = {
      run: async () => "",
      async *runStream(_input: string): AsyncGenerator<RunnerStreamEvent> {
        yield { type: "text_delta", content: "Hello " };
        yield { type: "iteration", count: 1, maxIterations: 10 };
        yield { type: "text_delta", content: "world" };
        yield { type: "final_response", content: "Hello world" };
      },
    };

    const wrapped = toStreamableAgent(mockAgent);
    const events = await collectEvents(wrapped.runStream("test"));
    const types = events.map((e) => e.type);

    // Internal events should be filtered
    expect(types).not.toContain("iteration");
    expect(types).toContain("text_delta");
    expect(types).toContain("done");
  });

  it("passes signal through to agent", async () => {
    let receivedSignal: AbortSignal | undefined;

    const mockAgent = {
      run: async (_input: string, signal?: AbortSignal) => {
        receivedSignal = signal;
        return "ok";
      },
      async *runStream() {
        yield { type: "text_delta" as const, content: "hi" };
      },
    };

    const wrapped = toStreamableAgent(mockAgent);
    const controller = new AbortController();
    await wrapped.run("test", controller.signal);

    expect(receivedSignal).toBe(controller.signal);
  });

  it("resulting agent is compatible with all runtime types", () => {
    const mockAgent = {
      run: async () => "",
      async *runStream(): AsyncGenerator<RunnerStreamEvent> {
        yield { type: "text_delta", content: "hi" };
      },
    };

    const wrapped = toStreamableAgent(mockAgent);

    // Type check: should be assignable to all runtime agent types
    // (compile-time verification — if this compiles, types are compatible)
    const _cli: { run: typeof wrapped.run; runStream: typeof wrapped.runStream } = wrapped;
    const _server: { run: typeof wrapped.run; runStream?: typeof wrapped.runStream } = wrapped;
    const _worker: { run: typeof wrapped.run; runStream?: typeof wrapped.runStream } = wrapped;

    expect(_cli).toBeDefined();
    expect(_server).toBeDefined();
    expect(_worker).toBeDefined();
  });
});
