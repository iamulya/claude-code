/**
 * L2-07: Plan Mode Execution E2E
 *
 * Tests Agent.run() when planMode is enabled:
 *   Agent + PlanMode + Tools + ContextManager
 *
 * Probes cross-subsystem wiring:
 * - planMode first-pass produces a plan (no tool calls)
 * - planMode second-pass executes the plan with tools
 * - onPlan callback receives the plan text for approval
 * - onPlan returning false aborts execution
 * - Plan text is visible in model history during execution phase
 */

import { describe, it, expect } from "vitest";
import { Agent } from "../../../agent.js";
import { mockModel, toolCallingModel, textModel } from "../_fixtures/mockModel.js";
import { echoTool, searchTool } from "../_fixtures/tools.js";

describe("L2-07: Plan Mode Execution E2E", () => {
  it("planMode produces plan then executes", async () => {
    // The model is called twice:
    // 1. Planning phase: model produces a numbered plan (no tool calls)
    // 2. Execution phase: model executes the plan (may call tools)
    const model = mockModel([
      // Planning phase response
      {
        content:
          "1. Search for quantum computing\n2. Summarize the results\n3. Return the summary",
        finishReason: "stop",
      },
      // Execution phase: call search
      {
        content: "",
        toolCalls: [
          { id: "tc1", name: "search", arguments: JSON.stringify({ query: "quantum computing" }) },
        ],
        finishReason: "tool_calls",
      },
      // Execution phase: final response
      { content: "Based on my research, quantum computing uses qubits.", finishReason: "stop" },
    ]);

    const search = searchTool({ "quantum computing": "Quantum computing uses qubits." });

    let planReceived = "";
    const agent = new Agent({
      chatModel: model,
      systemPrompt: "You are a research assistant.",
      tools: [search],
      planMode: {
        onPlan: (plan) => {
          planReceived = plan;
          return true; // approve
        },
      },
    });

    const result = await agent.run("Research quantum computing");
    expect(result).toContain("quantum");

    // Plan should have been received by the callback
    expect(planReceived).toContain("1.");
    expect(planReceived).toContain("Search");
  });

  it("planMode: onPlan returning false aborts execution", async () => {
    const model = mockModel([
      // Planning phase
      {
        content: "1. Delete all files\n2. Format the disk",
        finishReason: "stop",
      },
      // Execution phase (should NOT be reached)
      { content: "Files deleted successfully.", finishReason: "stop" },
    ]);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test",
      tools: [],
      planMode: {
        onPlan: (plan) => {
          // Reject dangerous plan
          return false;
        },
      },
    });

    // The agent should detect plan rejection
    // Either throw or return a rejection message
    try {
      const result = await agent.run("Delete everything");
      // If it returns, it shouldn't contain the execution result
      expect(result).not.toContain("Files deleted");
    } catch {
      // Throwing is also acceptable
    }

    // Model should have been called at most once (planning only)
    // The execution call should NOT have happened
    expect(model.calls.length).toBe(1);
  });

  it("planMode: true uses defaults (no onPlan callback, always proceeds)", async () => {
    const model = mockModel([
      // Planning response
      { content: "1. Greet the user\n2. Ask how I can help", finishReason: "stop" },
      // Execution response
      { content: "Hello! How can I help you today?", finishReason: "stop" },
    ]);

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "You are friendly.",
      tools: [],
      planMode: true, // shorthand: always approve, use default planning prompt
    });

    const result = await agent.run("Hi there");
    expect(result).toContain("How can I help");

    // Planning phase should have used DEFAULT_PLANNING_PROMPT
    const planningCall = model.calls[0]!;
    const hasPlanningSuffix = planningCall.messages.some(
      (m) =>
        typeof m.content === "string" &&
        (m.content.includes("numbered plan") || m.content.includes("plan")),
    );
    // The planning message is appended to the user message
    expect(hasPlanningSuffix).toBe(true);
  });

  it("planMode with custom planningPrompt", async () => {
    const model = mockModel([
      { content: "Step A: Research\nStep B: Write", finishReason: "stop" },
      { content: "Final output", finishReason: "stop" },
    ]);

    let planSeen = "";
    const agent = new Agent({
      chatModel: model,
      systemPrompt: "Test",
      tools: [],
      planMode: {
        planningPrompt: "Produce a plan using Step A, Step B format.",
        onPlan: (plan) => {
          planSeen = plan;
          return true;
        },
      },
    });

    const result = await agent.run("Write an article");
    expect(result).toBe("Final output");
    expect(planSeen).toContain("Step A");
  });
});
