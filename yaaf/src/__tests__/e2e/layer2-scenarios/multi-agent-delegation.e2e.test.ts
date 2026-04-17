/**
 * L2-04: Multi-Agent Delegation E2E
 *
 * A coordinator agent delegates sub-tasks to worker agents via agentTool().
 *
 * Probes cross-subsystem wiring:
 * - agentTool wraps an AgentRunner as a Tool correctly
 * - Parent agent receives child agent's output as tool result
 * - Worker agents get their own system prompt and tools
 * - Multi-agent chain: coordinator → researcher → writer
 * - Worker agent errors are captured as tool errors (not crashes)
 * - transformResult callback on agentTool works
 */

import { describe, it, expect } from "vitest";
import { AgentRunner } from "../../../agents/runner.js";
import { Agent } from "../../../agent.js";
import { agentTool, agentTools } from "../../../tools/agentTool.js";
import { mockModel, toolCallingModel, multiToolModel } from "../_fixtures/mockModel.js";
import { searchTool } from "../_fixtures/tools.js";

describe("L2-04: Multi-Agent Delegation E2E", () => {
  it("Coordinator calls researcher agent via agentTool", async () => {
    // Worker: researcher with search tool
    const researcherSearch = searchTool({
      "AI trends 2025":
        "Key AI trends include multimodal models, agent frameworks, and on-device inference.",
    });
    const researcherModel = toolCallingModel(
      "search",
      { query: "AI trends 2025" },
      "The key AI trends for 2025 are multimodal models, agent frameworks, and on-device inference.",
    );
    const researcher = new AgentRunner({
      model: researcherModel,
      tools: [researcherSearch],
      systemPrompt: "You are a research assistant. Search for accurate information.",
    });

    // Wrap as tool
    const researchTool = agentTool(researcher, {
      name: "research",
      description: "Research a topic using web search",
    });

    // Coordinator uses the research tool
    const coordModel = toolCallingModel(
      "research",
      { query: "What are the key AI trends for 2025?" },
      "Based on research, the key AI trends for 2025 are multimodal models, agent frameworks, and on-device inference.",
    );

    const coordinator = new Agent({
      chatModel: coordModel,
      systemPrompt: "You are a coordinator. Use the research tool to find information.",
      tools: [researchTool],
    });

    const result = await coordinator.run("What are the key AI trends for 2025?");
    expect(result).toContain("multimodal");
    expect(result).toContain("agent frameworks");

    // Verify the coordinator saw the research result
    const call2 = coordModel.calls[1]!;
    const toolResultMsg = call2.messages.find(
      (m) => m.role === "tool" && typeof m.content === "string",
    );
    expect(toolResultMsg).toBeDefined();
    expect(String(toolResultMsg!.content)).toContain("multimodal");
  });

  it("agentTools() creates multiple agent tools from a registry", async () => {
    const researcherModel = mockModel([
      { content: "Research result: AI is evolving rapidly.", finishReason: "stop" },
    ]);
    const researcher = new AgentRunner({
      model: researcherModel,
      tools: [],
      systemPrompt: "Research assistant",
    });

    const writerModel = mockModel([
      { content: "Report: AI evolution is accelerating in 2025.", finishReason: "stop" },
    ]);
    const writer = new AgentRunner({
      model: writerModel,
      tools: [],
      systemPrompt: "Writing assistant",
    });

    const tools = agentTools({
      research: {
        agent: researcher,
        description: "Research a topic",
      },
      write_report: {
        agent: writer,
        description: "Write a report based on research",
      },
    });

    expect(tools).toHaveLength(2);
    expect(tools[0]!.name).toBe("research");
    expect(tools[1]!.name).toBe("write_report");
  });

  it("Coordinator → researcher → writer chain", async () => {
    // Researcher agent
    const researcherModel = mockModel([
      {
        content: "Research findings: Rust adoption grew 40% in systems programming during 2025.",
        finishReason: "stop",
      },
    ]);
    const researcher = new AgentRunner({
      model: researcherModel,
      tools: [],
      systemPrompt: "Research assistant",
    });

    // Writer agent
    const writerModel = mockModel([
      {
        content: "## Rust in 2025\n\nRust adoption grew 40% in systems programming, making it a top choice.",
        finishReason: "stop",
      },
    ]);
    const writerAgent = new AgentRunner({
      model: writerModel,
      tools: [],
      systemPrompt: "Technical writer",
    });

    const researchAgentTool = agentTool(researcher, {
      name: "research",
      description: "Research a topic",
    });
    const writeAgentTool = agentTool(writerAgent, {
      name: "write_report",
      description: "Write a report",
    });

    // Coordinator calls research, then write_report
    const coordModel = multiToolModel(
      [
        { name: "research", args: { query: "Rust programming language in 2025" } },
        {
          name: "write_report",
          args: { query: "Write a report on Rust adoption based on: Rust adoption grew 40%" },
        },
      ],
      "Here is the final report on Rust adoption in 2025.",
    );

    const coordinator = new Agent({
      chatModel: coordModel,
      systemPrompt: "Coordinate research and writing.",
      tools: [researchAgentTool, writeAgentTool],
    });

    const result = await coordinator.run("Research Rust and write a report");
    expect(result).toContain("final report");

    // Verify both worker agents were called
    expect(researcherModel.calls.length).toBe(1);
    expect(writerModel.calls.length).toBe(1);
  });

  it("Worker agent error is captured as tool error, not a crash", async () => {
    // Worker agent that always throws
    const brokenModel = mockModel([]);
    // Empty responses → MockModel returns "[no more responses]"
    const brokenWorker = new AgentRunner({
      model: brokenModel,
      tools: [],
      systemPrompt: "Broken",
      maxIterations: 1,
    });

    const brokenTool = agentTool(brokenWorker, {
      name: "broken_agent",
      description: "An agent that fails",
    });

    // Coordinator calls broken agent, then responds
    const coordModel = toolCallingModel(
      "broken_agent",
      { query: "Do something" },
      "The sub-agent encountered an error, but I handled it gracefully.",
    );

    const coordinator = new Agent({
      chatModel: coordModel,
      systemPrompt: "Coordinator",
      tools: [brokenTool],
    });

    // Should not throw — error should be captured as tool result
    const result = await coordinator.run("Call the broken agent");
    expect(result).toContain("handled it gracefully");
  });

  it("agentTool with transformResult post-processes worker output", async () => {
    const workerModel = mockModel([
      {
        content: "Full verbose research output with lots of detail about quantum computing.",
        finishReason: "stop",
      },
    ]);
    const worker = new AgentRunner({
      model: workerModel,
      tools: [],
      systemPrompt: "Research worker",
    });

    const transformedTool = agentTool(worker, {
      name: "research",
      description: "Research a topic",
      transformResult: (output) => {
        // Truncate to first 20 chars + "..."
        return output.slice(0, 20) + "...";
      },
    });

    // Verify the transform is applied by calling the tool directly
    const toolResult = await transformedTool.call({ query: "quantum computing" }, {
      signal: undefined,
      toolName: "research",
      toolCallId: "tc_1",
    } as any);
    // The result should be truncated to first 20 chars + "..."
    // "Full verbose research output with..." → slice(0, 20) = "Full verbose researc"
    expect(toolResult.data.result).toBe("Full verbose researc...");
    expect(toolResult.data.result.length).toBe(23);
  });
});
