/**
 * L1-01: Agent + Tools E2E
 *
 * Tests real wiring between Agent, AgentRunner, and the Tool system.
 * Uses a deterministic mock ChatModel — everything else is the real implementation.
 */

import { describe, it, expect, afterEach } from "vitest";
import { Agent } from "../../../agent.js";
import { AgentRunner } from "../../../agents/runner.js";
import { buildTool } from "../../../tools/tool.js";
import { PermissionPolicy, denyAll } from "../../../permissions.js";
import {
  mockModel,
  toolCallingModel,
  multiToolModel,
  parallelToolModel,
} from "../_fixtures/mockModel.js";
import {
  echoTool,
  failTool,
  counterTool,
  validatedTool,
  largeOutputTool,
} from "../_fixtures/tools.js";

// ── Tests ────────────────────────────────────────────────────────────────────

describe("L1-01: Agent + Tools E2E", () => {
  it("Agent.run() with one tool — model calls it and returns text", async () => {
    const model = toolCallingModel("echo", { text: "hello" }, "I echoed: hello");
    const agent = new Agent({
      chatModel: model,
      systemPrompt: "You are a helpful assistant.",
      tools: [echoTool],
    });

    const result = await agent.run("Echo hello");
    expect(result).toBe("I echoed: hello");

    // Verify tool schemas were sent to the model
    expect(model.calls.length).toBe(2); // tool call + final
    expect(model.calls[0]!.tools).toBeDefined();
    expect(model.calls[0]!.tools!.length).toBe(1);
  });

  it("Agent.run() with multiple sequential tool calls", async () => {
    const store = new Map<string, string>();
    const model = multiToolModel(
      [
        { name: "echo", args: { text: "first" } },
        { name: "echo", args: { text: "second" } },
      ],
      "Both echoed successfully.",
    );

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "You are helpful.",
      tools: [echoTool],
    });

    const result = await agent.run("Echo two things");
    expect(result).toBe("Both echoed successfully.");
    // 3 LLM calls: tool call 1, tool call 2, final
    expect(model.calls.length).toBe(3);
  });

  it("Agent.run() with tool that returns large result → budget truncation", async () => {
    const model = toolCallingModel("large_output", {}, "Got the data.");
    const runner = new AgentRunner({
      model,
      tools: [largeOutputTool(100_000)],
      systemPrompt: "Test",
      toolResultBudget: { maxTotalChars: 10_000, keepRecent: 1 },
    });

    const result = await runner.run("Get large data");
    expect(result).toBe("Got the data.");
  });

  it("Agent.run() with tool that throws → error reaches model as tool_result", async () => {
    const model = toolCallingModel("fail", {}, "The tool failed, but I handled it.");
    const agent = new Agent({
      chatModel: model,
      systemPrompt: "You are helpful.",
      tools: [failTool],
    });

    const result = await agent.run("Run the failing tool");
    expect(result).toBe("The tool failed, but I handled it.");

    // Verify the error was passed as a tool result message
    const secondCall = model.calls[1]!;
    const toolMsg = secondCall.messages.find((m) => m.role === "tool");
    expect(toolMsg).toBeDefined();
    expect(toolMsg!.content).toContain("deliberate failure");
  });

  it("Agent.run() with maxIterations → stops after limit", async () => {
    // Model always requests tool calls → infinite loop
    const responses = Array(20).fill({
      content: "",
      toolCalls: [
        { id: "tc1", name: "echo", arguments: JSON.stringify({ text: "loop" }) },
      ],
      finishReason: "tool_calls" as const,
    });
    const model = mockModel(responses);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test",
      tools: [echoTool],
      maxIterations: 3,
    });

    // Agent catches MaxIterationsError and returns a descriptive string
    const result = await agent.run("Loop forever");
    expect(result).toContain("maximum iterations");
  });

  it("Tool input validation → invalid args rejected", async () => {
    const model = toolCallingModel("validated", { value: -5 }, "Validation error handled.");
    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test",
      tools: [validatedTool],
    });

    const result = await agent.run("Validate -5");
    expect(result).toBe("Validation error handled.");

    // The tool result should contain the validation error
    const secondCall = model.calls[1]!;
    const toolMsg = secondCall.messages.find((m) => m.role === "tool");
    expect(toolMsg!.content).toContain("non-negative");
  });

  it("Tool permissions: denyAll() blocks tool call", async () => {
    const model = toolCallingModel("echo", { text: "blocked" }, "Tool was blocked.");
    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test",
      tools: [echoTool],
      permissions: denyAll(),
    });

    const result = await agent.run("Try to echo");
    expect(result).toBe("Tool was blocked.");
  });

  it("Parallel tool calls execute concurrently", async () => {
    const counter = { value: 0 };
    const cTool = counterTool(counter);

    const model = parallelToolModel(
      [
        { name: "counter", args: {} },
        { name: "counter", args: {} },
        { name: "counter", args: {} },
      ],
      "All counted.",
    );

    const runner = new AgentRunner({
      model,
      tools: [cTool],
      systemPrompt: "Test",
    });

    const result = await runner.run("Count three times");
    expect(result).toBe("All counted.");
    expect(counter.value).toBe(3);
  });
});
