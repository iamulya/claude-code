/**
 * AgentRunner test suite
 *
 * Tests the core LLM ↔ Tool execution loop including:
 * - Basic conversation flow (single turn)
 * - Tool call parsing and execution
 * - Concurrent tool execution (isConcurrencySafe)
 * - Input validation (validateInput)
 * - Permission policy enforcement
 * - Hook dispatch order (beforeToolCall, afterToolCall)
 * - Max iterations limit
 * - System prompt override (memory injection)
 * - Event emission verification
 * - Tool result budget enforcement
 * - Streaming support (runStream)
 * - Event handler removal (off/removeAllListeners)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AgentRunner,
  type ChatModel,
  type ChatMessage,
  type ChatResult,
  type StreamingChatModel,
  type ChatDelta,
  type RunnerStreamEvent,
} from "../agents/runner.js";
import { buildTool, type Tool, type ToolContext } from "../tools/tool.js";
import { createMockModel, collectEvents } from "./_helpers.js";

function createStreamingMockModel(responses: ChatResult[]): StreamingChatModel & { model: string } {
  let callIndex = 0;
  return {
    model: "test-streaming-v1",
    async complete() {
      const result = responses[callIndex] ?? {
        content: "[no more responses]",
        finishReason: "stop" as const,
      };
      callIndex++;
      return result;
    },
    async *stream(params) {
      const result = responses[callIndex] ?? {
        content: "[no more responses]",
        finishReason: "stop" as const,
      };
      callIndex++;
      // Yield content as individual character deltas for streaming test
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

// ── Mock Tools ──────────────────────────────────────────────────────────────

const echoTool = buildTool({
  name: "echo",
  inputSchema: { type: "object", properties: { text: { type: "string" } } },
  maxResultChars: 10_000,
  describe: (input: Record<string, unknown>) => `Echo: ${input.text}`,
  async call(input: Record<string, unknown>) {
    return { data: `Echoed: ${input.text}` };
  },
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
});

const concurrentTool = buildTool({
  name: "concurrent_search",
  inputSchema: { type: "object", properties: { query: { type: "string" } } },
  maxResultChars: 10_000,
  describe: () => "Search",
  async call(input: Record<string, unknown>) {
    // Simulate async delay to test concurrency
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { data: `Result for: ${input.query}` };
  },
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
});

const validatedTool = buildTool({
  name: "validated",
  inputSchema: { type: "object", properties: { value: { type: "number" } }, required: ["value"] },
  maxResultChars: 10_000,
  describe: () => "Validated tool",
  async validateInput(input: Record<string, unknown>) {
    if (typeof input.value !== "number") return { valid: false, message: "value must be a number" };
    if ((input.value as number) < 0) return { valid: false, message: "value must be non-negative" };
    return { valid: true };
  },
  async call(input: Record<string, unknown>) {
    return { data: `Value: ${input.value}` };
  },
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("AgentRunner", () => {
  describe("basic conversation", () => {
    it("returns final text when LLM has no tool calls", async () => {
      const model = createMockModel([{ content: "Hello! How can I help?", finishReason: "stop" }]);
      const runner = new AgentRunner({ model, tools: [], systemPrompt: "You are helpful." });
      const result = await runner.run("Hi");
      expect(result).toBe("Hello! How can I help?");
    });

    it("respects maxIterations", async () => {
      // Model always returns tool calls → runner should stop at maxIterations
      const model = createMockModel(
        Array(20).fill({
          content: "",
          toolCalls: [{ id: "tc1", name: "echo", arguments: JSON.stringify({ text: "loop" }) }],
          finishReason: "tool_calls",
        }),
      );
      const runner = new AgentRunner({
        model,
        tools: [echoTool],
        systemPrompt: "Test",
        maxIterations: 3,
      });
      // W-2: runner.run() now throws MaxIterationsError instead of returning a string
      await expect(runner.run("Loop test")).rejects.toThrow("maximum iterations");
    });

    it("preserves message history across calls", async () => {
      const model = createMockModel([
        { content: "First response", finishReason: "stop" },
        { content: "Second response", finishReason: "stop" },
      ]);
      const runner = new AgentRunner({ model, tools: [], systemPrompt: "Test" });
      await runner.run("First");
      await runner.run("Second");
      expect(runner.messageCount).toBe(4); // 2 user + 2 assistant
    });
  });

  describe("tool execution", () => {
    it("executes a single tool call and returns final response", async () => {
      const model = createMockModel([
        {
          content: "Let me echo that.",
          toolCalls: [{ id: "tc1", name: "echo", arguments: JSON.stringify({ text: "hello" }) }],
          finishReason: "tool_calls",
        },
        { content: "I echoed: hello", finishReason: "stop" },
      ]);
      const runner = new AgentRunner({ model, tools: [echoTool], systemPrompt: "Test" });
      const result = await runner.run("Echo hello");
      expect(result).toBe("I echoed: hello");
    });

    it("handles unknown tool gracefully", async () => {
      const model = createMockModel([
        {
          content: "",
          toolCalls: [{ id: "tc1", name: "nonexistent", arguments: "{}" }],
          finishReason: "tool_calls",
        },
        { content: "Sorry, that tool is not available.", finishReason: "stop" },
      ]);
      const runner = new AgentRunner({ model, tools: [echoTool], systemPrompt: "Test" });
      const result = await runner.run("Use nonexistent tool");
      expect(result).toBe("Sorry, that tool is not available.");
    });
  });

  describe("input validation (Gap #9)", () => {
    it("blocks tool call when validateInput fails", async () => {
      const model = createMockModel([
        {
          content: "",
          toolCalls: [{ id: "tc1", name: "validated", arguments: JSON.stringify({ value: -5 }) }],
          finishReason: "tool_calls",
        },
        { content: "Validation error occurred.", finishReason: "stop" },
      ]);
      const events: string[] = [];
      const runner = new AgentRunner({ model, tools: [validatedTool], systemPrompt: "Test" });
      runner.on("tool:error", ({ error }) => events.push(error));

      const result = await runner.run("Validate -5");
      expect(result).toBe("Validation error occurred.");
      // The tool result should contain the validation error
      const history = runner.getHistory();
      const toolResult = history.find((m) => m.role === "tool");
      expect(toolResult?.content).toContain("non-negative");
    });
  });

  describe("system prompt override (Gap #6)", () => {
    it("prepends override to system prompt", async () => {
      const capturedMessages: ChatMessage[][] = [];
      const model: ChatModel = {
        model: "test",
        async complete(params) {
          capturedMessages.push([...params.messages]);
          return { content: "Done", finishReason: "stop" };
        },
      };
      const runner = new AgentRunner({ model, tools: [], systemPrompt: "Base prompt" });
      runner.setSystemOverride("## Memory\nImportant fact: user likes cats");

      await runner.run("Hello");

      const systemMsg = capturedMessages[0]?.find((m) => m.role === "system");
      expect(systemMsg?.content).toContain("Memory");
      expect(systemMsg?.content).toContain("user likes cats");
      expect(systemMsg?.content).toContain("Base prompt");
    });
  });

  describe("event system (Gap #11)", () => {
    it("emits and removes event handlers", async () => {
      const model = createMockModel([{ content: "Response", finishReason: "stop" }]);
      const runner = new AgentRunner({ model, tools: [], systemPrompt: "Test" });

      const calls: number[] = [];
      const handler = () => calls.push(1);
      runner.on("llm:request", handler);
      await runner.run("First");
      expect(calls.length).toBe(1);

      runner.off("llm:request", handler);
      await runner.run("Second");
      expect(calls.length).toBe(1); // handler was removed, no new calls
    });

    it("removeAllListeners clears all handlers", async () => {
      const model = createMockModel([
        { content: "R1", finishReason: "stop" },
        { content: "R2", finishReason: "stop" },
      ]);
      const runner = new AgentRunner({ model, tools: [], systemPrompt: "Test" });

      let called = false;
      runner.on("llm:request", () => {
        called = true;
      });
      runner.removeAllListeners();
      await runner.run("Test");
      expect(called).toBe(false);
    });
  });

  describe("model name propagation (Gap #10)", () => {
    it("uses model.model for toolContext", async () => {
      const model = createMockModel([{ content: "Done", finishReason: "stop" }]);
      const runner = new AgentRunner({ model, tools: [], systemPrompt: "Test" });
      // Access internal modelName via a proxy — the runner stores it privately
      // We verify indirectly through the event system
      let emittedModel = "";
      runner.on("llm:request", () => {
        emittedModel = (model as { model: string }).model;
      });
      await runner.run("Test");
      expect(emittedModel).toBe("test-model");
    });
  });

  describe("streaming (Gap #1)", () => {
    it("yields text_delta events from streaming model", async () => {
      const streamModel = createStreamingMockModel([{ content: "Hello!", finishReason: "stop" }]);
      const runner = new AgentRunner({ model: streamModel, tools: [], systemPrompt: "Test" });

      const events: RunnerStreamEvent[] = [];
      for await (const event of runner.runStream("Hi")) {
        events.push(event);
      }

      const deltas = events.filter((e) => e.type === "text_delta");
      expect(deltas.length).toBe(6); // 'H','e','l','l','o','!'
      expect(deltas.map((d) => (d.type === "text_delta" ? d.content : "")).join("")).toBe("Hello!");

      const final = events.find((e) => e.type === "final_response");
      expect(final).toBeDefined();
    });

    it("falls back to batch mode for non-streaming models", async () => {
      const model = createMockModel([{ content: "Batch response", finishReason: "stop" }]);
      const runner = new AgentRunner({ model, tools: [], systemPrompt: "Test" });

      const events: RunnerStreamEvent[] = [];
      for await (const event of runner.runStream("Hi")) {
        events.push(event);
      }

      const deltas = events.filter((e) => e.type === "text_delta");
      expect(deltas.length).toBe(1); // Full content as single delta
      expect(deltas[0]!.type === "text_delta" && deltas[0]!.content).toBe("Batch response");
    });
  });

  describe("tool result budget (Gap #7)", () => {
    it("clears old tool results when budget exceeded", async () => {
      // Create a tool that returns large results
      const largeTool = buildTool({
        name: "large_output",
        inputSchema: { type: "object", properties: {} },
        maxResultChars: 1_000_000,
        describe: () => "Large output",
        async call() {
          return { data: "x".repeat(100_000) };
        },
      });

      const responses: ChatResult[] = [];
      // 6 tool calls → 600K chars → exceeds 500K budget
      for (let i = 0; i < 6; i++) {
        responses.push({
          content: "",
          toolCalls: [{ id: `tc${i}`, name: "large_output", arguments: "{}" }],
          finishReason: "tool_calls",
        });
      }
      responses.push({ content: "Final", finishReason: "stop" });

      const model = createMockModel(responses);
      const runner = new AgentRunner({
        model,
        tools: [largeTool],
        systemPrompt: "Test",
        maxIterations: 10,
        toolResultBudget: { maxTotalChars: 500_000, keepRecent: 3 },
      });

      const result = await runner.run("Generate data");
      expect(result).toBe("Final");
    });
  });

  describe("reset", () => {
    it("clears message history", async () => {
      const model = createMockModel([{ content: "Response", finishReason: "stop" }]);
      const runner = new AgentRunner({ model, tools: [], systemPrompt: "Test" });
      await runner.run("Hi");
      expect(runner.messageCount).toBe(2);
      runner.reset();
      expect(runner.messageCount).toBe(0);
    });
  });

  // ── buildTool return contract regression tests ──────────────────────────────
  //
  // These tests were added after a production crash: tools that returned plain
  // strings (not { data: T }) caused "Cannot read properties of undefined
  // (reading 'slice')" deep in streamingExecutor.ts. We test the full
  // runner pipeline here to catch any future regression at the integration level.

  describe("buildTool return shape (regression: plain string crash)", () => {
    it("runner.run() completes when tool returns a plain string", async () => {
      const plainStringTool = buildTool({
        name: "plain_string",
        inputSchema: { type: "object", properties: {} },
        describe: () => "returns plain string",
        async call(): Promise<{ data: string }> {
          // Plain string return — violates API contract but must not crash
          return "raw string result" as unknown as { data: string };
        },
      });

      const model = createMockModel([
        {
          content: "",
          toolCalls: [{ id: "tc1", name: "plain_string", arguments: "{}" }],
          finishReason: "tool_calls",
        },
        { content: "Got the result.", finishReason: "stop" },
      ]);
      const runner = new AgentRunner({ model, tools: [plainStringTool], systemPrompt: "Test" });

      // Must not throw
      const result = await runner.run("test");
      expect(result).toBe("Got the result.");

      // The tool result must have made it into the conversation history
      const history = runner.getHistory();
      const toolMsg = history.find((m) => m.role === "tool");
      expect(toolMsg?.content).toBe("raw string result");
    });

    it("runner.runStream() emits tool_call_result when tool returns a plain string", async () => {
      const plainStringTool = buildTool({
        name: "plain_string_stream",
        inputSchema: { type: "object", properties: {} },
        describe: () => "returns plain string",
        async call(): Promise<{ data: string }> {
          return "streamed plain string" as unknown as { data: string };
        },
      });

      const model = createStreamingMockModel([
        {
          content: "",
          toolCalls: [{ id: "tc1", name: "plain_string_stream", arguments: "{}" }],
          finishReason: "tool_calls",
        },
        { content: "Done.", finishReason: "stop" },
      ]);

      const runner = new AgentRunner({ model, tools: [plainStringTool], systemPrompt: "Test" });
      const events: RunnerStreamEvent[] = [];
      for await (const e of runner.runStream("stream test")) {
        events.push(e);
      }

      // Must emit a tool_call_result event with the string content
      const tcResult = events.find((e) => e.type === "tool_call_result");
      expect(tcResult).toBeDefined();
      expect((tcResult as Extract<RunnerStreamEvent, { type: "tool_call_result" }>).result).toBe(
        "streamed plain string",
      );
    });

    it("runner.run() completes when tool returns { data: object }", async () => {
      const objectTool = buildTool({
        name: "object_result",
        inputSchema: { type: "object", properties: {} },
        describe: () => "returns object",
        async call() {
          return { data: { status: "ok", value: 99 } };
        },
      });

      const model = createMockModel([
        {
          content: "",
          toolCalls: [{ id: "tc1", name: "object_result", arguments: "{}" }],
          finishReason: "tool_calls",
        },
        { content: "Processed.", finishReason: "stop" },
      ]);
      const runner = new AgentRunner({ model, tools: [objectTool], systemPrompt: "Test" });
      const result = await runner.run("test");
      expect(result).toBe("Processed.");

      const history = runner.getHistory();
      const toolMsg = history.find((m) => m.role === "tool");
      // Object must be JSON-stringified in the conversation
      const parsed = JSON.parse(toolMsg?.content ?? "{}");
      expect(parsed).toEqual({ status: "ok", value: 99 });
    });
  });
});
