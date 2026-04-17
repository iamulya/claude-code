/**
 * L1-14: Streaming Tool Executor E2E
 *
 * Tests real wiring between tool execution, loop detection, and runner events.
 */

import { describe, it, expect } from "vitest";
import { AgentRunner } from "../../../agents/runner.js";
import { ToolLoopDetector } from "../../../tools/loopDetector.js";
import { mockModel, parallelToolModel } from "../_fixtures/mockModel.js";
import { echoTool, failTool } from "../_fixtures/tools.js";
import { collectEvents } from "../_fixtures/helpers.js";

describe("L1-14: Streaming Tool Executor E2E", () => {
  it("Concurrent tool execution: 3 tools run in parallel", async () => {
    const model = parallelToolModel(
      [
        { name: "echo", args: { text: "a" } },
        { name: "echo", args: { text: "b" } },
        { name: "echo", args: { text: "c" } },
      ],
      "All three done.",
    );

    const runner = new AgentRunner({
      model,
      tools: [echoTool],
      systemPrompt: "Test",
    });

    const result = await runner.run("Execute three tools");
    expect(result).toBe("All three done.");
  });

  it("One tool fails, others succeed → partial results", async () => {
    const model = mockModel([
      {
        content: "",
        toolCalls: [
          { id: "tc1", name: "echo", arguments: JSON.stringify({ text: "ok" }) },
          { id: "tc2", name: "fail", arguments: "{}" },
        ],
        finishReason: "tool_calls" as const,
      },
      { content: "One failed, one succeeded.", finishReason: "stop" as const },
    ]);

    const runner = new AgentRunner({
      model,
      tools: [echoTool, failTool],
      systemPrompt: "Test",
    });

    const result = await runner.run("Mixed results");
    expect(result).toBe("One failed, one succeeded.");
  });

  it("ToolLoopDetector detects exact-repeat patterns", () => {
    const detector = new ToolLoopDetector({ threshold: 3, windowSize: 10 });

    // Record same tool 3 times
    detector.record("search", { q: "test" });
    expect(detector.isLooping()).toBe(false);
    detector.record("search", { q: "test" });
    expect(detector.isLooping()).toBe(false);
    detector.record("search", { q: "test" });

    // Now should detect a loop
    expect(detector.isLooping()).toBe(true);

    const info = detector.detect();
    expect(info.type).toBe("exact-repeat");
    expect(info.tools).toContain("search");
    expect(info.count).toBe(3);
  });

  it("ToolLoopDetector resets after different tool call", () => {
    const detector = new ToolLoopDetector({ threshold: 3, windowSize: 10 });

    detector.record("search", { q: "a" });
    detector.record("search", { q: "a" });
    // Different tool call breaks the pattern
    detector.record("echo", { text: "break" });
    // Same tool again — but the window contains the different call
    detector.record("search", { q: "a" });

    // Not looping — the "echo" call broke the exact-repeat sequence
    expect(detector.isLooping()).toBe(false);
  });

  it("ToolLoopDetector.getWarning() produces a warning string", () => {
    const detector = new ToolLoopDetector({ threshold: 2 });
    detector.record("search", { q: "test" });
    detector.record("search", { q: "test" });

    const warning = detector.getWarning();
    expect(warning).toContain("Loop detected");
    expect(warning).toContain("search");
  });

  it("ToolLoopDetector.reset() clears history", () => {
    const detector = new ToolLoopDetector({ threshold: 2 });
    detector.record("search", { q: "test" });
    detector.record("search", { q: "test" });
    expect(detector.isLooping()).toBe(true);

    detector.reset();
    expect(detector.isLooping()).toBe(false);
    expect(detector.length).toBe(0);
  });

  it("Runner emits tool:call and tool:result events", async () => {
    const model = mockModel([
      {
        content: "",
        toolCalls: [
          { id: "tc1", name: "echo", arguments: JSON.stringify({ text: "test" }) },
        ],
        finishReason: "tool_calls" as const,
      },
      { content: "Done.", finishReason: "stop" as const },
    ]);

    const runner = new AgentRunner({
      model,
      tools: [echoTool],
      systemPrompt: "Test",
    });

    const toolCalls = collectEvents(runner, "tool:call");
    const toolResults = collectEvents(runner, "tool:result");

    await runner.run("Echo test");

    expect(toolCalls.length).toBe(1);
    expect(toolCalls[0]!.name).toBe("echo");
    expect(toolResults.length).toBe(1);
    expect(toolResults[0]!.name).toBe("echo");
  });
});
