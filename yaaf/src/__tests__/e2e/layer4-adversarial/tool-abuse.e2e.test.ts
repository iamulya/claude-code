/**
 * L4-02: Tool Abuse — Adversarial & Chaos
 *
 * Validates that tool execution boundaries are enforced:
 * - maxIterations cap prevents infinite tool loops
 * - Tool result budget truncates oversized output
 * - Tool errors don't crash the runner
 * - Tool input validation rejects malformed arguments
 * - MaxIterationsError is thrown when cap is reached
 */

import { describe, it, expect, afterEach } from "vitest";
import { AgentRunner, type ChatModel, type ChatResult } from "../../../agents/runner.js";
import { buildTool, type Tool } from "../../../tools/tool.js";
import { MaxIterationsError } from "../../../errors.js";
import { mockModel, toolCallingModel, textModel } from "../_fixtures/mockModel.js";
import { echoTool, failTool, largeOutputTool, validatedTool, counterTool } from "../_fixtures/tools.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Model that repeatedly calls the same tool forever (until maxIterations). */
function infiniteLoopModel(toolName: string): ChatModel & { model: string } {
  return {
    model: "infinite-loop",
    async complete() {
      return {
        content: "",
        toolCalls: [{ id: `tc_${Date.now()}`, name: toolName, arguments: "{}" }],
        finishReason: "tool_calls" as const,
      };
    },
  };
}

/** Model that calls a tool N times (each call in its own turn), then returns text. */
function repeatToolModel(
  toolName: string,
  args: Record<string, unknown>,
  repeatCount: number,
  finalText: string,
): ChatModel & { model: string } {
  let callIndex = 0;
  return {
    model: "repeat-tool",
    async complete() {
      if (callIndex < repeatCount) {
        callIndex++;
        return {
          content: "",
          toolCalls: [
            { id: `tc_${callIndex}`, name: toolName, arguments: JSON.stringify(args) },
          ],
          finishReason: "tool_calls" as const,
        };
      }
      return { content: finalText, finishReason: "stop" as const };
    },
  };
}

describe("L4-02: Tool Abuse", () => {
  // ── maxIterations Enforcement ───────────────────────────────────────────────

  it("maxIterations stops infinite tool loops", async () => {
    const counter = { value: 0 };
    const runner = new AgentRunner({
      model: infiniteLoopModel("counter"),
      tools: [counterTool(counter)],
      systemPrompt: "test",
      maxIterations: 5,
    });

    await expect(runner.run("Count forever")).rejects.toThrow(MaxIterationsError);

    // Counter should be exactly 5 (one per iteration)
    expect(counter.value).toBe(5);
  });

  it("maxIterations=1 allows only one tool call", async () => {
    const runner = new AgentRunner({
      model: toolCallingModel("echo", { text: "hello" }, "Final response"),
      tools: [echoTool],
      systemPrompt: "test",
      maxIterations: 1,
    });

    // With maxIterations=1: tool call → need another iteration to get final text → throws
    await expect(runner.run("Call echo")).rejects.toThrow(MaxIterationsError);
  });

  it("exactly maxIterations tool calls succeeds if model stops at the boundary", async () => {
    const runner = new AgentRunner({
      model: repeatToolModel("echo", { text: "ping" }, 3, "Done after 3 calls"),
      tools: [echoTool],
      systemPrompt: "test",
      maxIterations: 5,
    });

    const result = await runner.run("Echo 3 times");
    expect(result).toBe("Done after 3 calls");
  });

  // ── Tool Error Handling ─────────────────────────────────────────────────────

  it("tool that throws returns error message to model (no crash)", async () => {
    const model = mockModel([
      {
        content: "",
        toolCalls: [{ id: "tc_fail", name: "fail", arguments: "{}" }],
        finishReason: "tool_calls",
      },
      { content: "I handled the tool error gracefully.", finishReason: "stop" },
    ]);

    const runner = new AgentRunner({
      model,
      tools: [failTool],
      systemPrompt: "test",
    });

    const result = await runner.run("Use the fail tool");
    expect(result).toBe("I handled the tool error gracefully.");

    // Model should have seen the error in its second call
    const secondCall = model.calls[1];
    expect(secondCall).toBeDefined();
    const toolResultMsg = secondCall!.messages.find(
      (m) => m.role === "tool" || m.role === "tool_result",
    );
    expect(toolResultMsg).toBeDefined();
    expect(typeof toolResultMsg!.content === "string" && toolResultMsg!.content.includes("deliberate failure")).toBe(true);
  });

  it("tool throwing non-Error object doesn't crash", async () => {
    const weirdTool = buildTool({
      name: "weird_error",
      inputSchema: { type: "object", properties: {} },
      describe: () => "Throws a non-Error",
      async call() {
        throw "string error, not an Error object";
      },
    });

    const model = mockModel([
      {
        content: "",
        toolCalls: [{ id: "tc1", name: "weird_error", arguments: "{}" }],
        finishReason: "tool_calls",
      },
      { content: "Recovered from weird error.", finishReason: "stop" },
    ]);

    const runner = new AgentRunner({
      model,
      tools: [weirdTool],
      systemPrompt: "test",
    });

    const result = await runner.run("Use the weird tool");
    expect(result).toBe("Recovered from weird error.");
  });

  // ── Large Tool Results ──────────────────────────────────────────────────────

  it("tool with maxResultChars truncates large output", async () => {
    const smallOutputTool = buildTool({
      name: "big_output",
      inputSchema: { type: "object", properties: {} },
      maxResultChars: 100,
      describe: () => "Returns big output, limited to 100 chars",
      async call() {
        return { data: "x".repeat(10_000) };
      },
    });

    const model = mockModel([
      {
        content: "",
        toolCalls: [{ id: "tc1", name: "big_output", arguments: "{}" }],
        finishReason: "tool_calls",
      },
      { content: "Got the truncated result.", finishReason: "stop" },
    ]);

    const runner = new AgentRunner({
      model,
      tools: [smallOutputTool],
      systemPrompt: "test",
    });

    const result = await runner.run("Get big output");
    expect(result).toBe("Got the truncated result.");

    // The tool result passed to the model should be truncated
    const toolResultMsg = model.calls[1]?.messages.find(
      (m) => (m.role === "tool" || m.role === "tool_result") && typeof m.content === "string",
    );
    expect(toolResultMsg).toBeDefined();
    // maxResultChars should limit the content length
    expect((toolResultMsg!.content as string).length).toBeLessThan(500);
  });

  // ── Input Validation ────────────────────────────────────────────────────────

  it("tool input validation rejects invalid arguments", async () => {
    const model = mockModel([
      {
        content: "",
        toolCalls: [
          { id: "tc1", name: "validated", arguments: JSON.stringify({ value: -5 }) },
        ],
        finishReason: "tool_calls",
      },
      { content: "Handled the validation error.", finishReason: "stop" },
    ]);

    const runner = new AgentRunner({
      model,
      tools: [validatedTool],
      systemPrompt: "test",
    });

    const result = await runner.run("Use validated tool with -5");
    expect(result).toBe("Handled the validation error.");

    // Model should see validation error
    const toolResultMsg = model.calls[1]?.messages.find(
      (m) => (m.role === "tool" || m.role === "tool_result") && typeof m.content === "string",
    );
    expect(toolResultMsg).toBeDefined();
    const content = toolResultMsg!.content as string;
    expect(content.toLowerCase()).toContain("non-negative");
  });

  // ── Unknown Tool Call ───────────────────────────────────────────────────────

  it("model calling non-existent tool returns error to model (no crash)", async () => {
    const model = mockModel([
      {
        content: "",
        toolCalls: [{ id: "tc1", name: "nonexistent_tool", arguments: "{}" }],
        finishReason: "tool_calls",
      },
      { content: "Tool not found, answering directly.", finishReason: "stop" },
    ]);

    const runner = new AgentRunner({
      model,
      tools: [echoTool],
      systemPrompt: "test",
    });

    const result = await runner.run("Use nonexistent tool");
    expect(result).toBe("Tool not found, answering directly.");
  });

  // ── Malformed JSON Arguments ────────────────────────────────────────────────

  it("tool call with malformed JSON arguments returns error to model", async () => {
    const model = mockModel([
      {
        content: "",
        toolCalls: [{ id: "tc1", name: "echo", arguments: "{invalid json!!!" }],
        finishReason: "tool_calls",
      },
      { content: "Recovered from bad JSON.", finishReason: "stop" },
    ]);

    const runner = new AgentRunner({
      model,
      tools: [echoTool],
      systemPrompt: "test",
    });

    const result = await runner.run("Bad json args");
    expect(result).toBe("Recovered from bad JSON.");
  });

  // ── Concurrent Tool Safety ──────────────────────────────────────────────────

  it("multiple concurrent runner.run() calls complete without interference", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) => {
        const model = textModel(`Response ${i}`);
        const runner = new AgentRunner({
          model,
          tools: [],
          systemPrompt: `test ${i}`,
        });
        return runner.run(`Query ${i}`);
      }),
    );

    // Each run should return its own response
    for (let i = 0; i < 5; i++) {
      expect(results[i]).toBe(`Response ${i}`);
    }
  });
});
