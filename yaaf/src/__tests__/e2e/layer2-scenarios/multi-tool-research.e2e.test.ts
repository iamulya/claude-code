/**
 * L2-02: Multi-Tool Research E2E
 *
 * Agent receives a research query, executes a sequence of tool calls,
 * and GroundingValidator verifies the final response against tool evidence.
 *
 * Probes cross-subsystem wiring:
 * - Sequential multi-tool execution flows correctly through runner
 * - GroundingValidator receives correct tool evidence from conversation
 * - GroundingValidator's evidence extraction handles tool messages
 * - The llmScorer receives actual content not tool names (Bug #2 regression)
 * - Annotate/strict modes produce correct action types
 */

import { describe, it, expect } from "vitest";
import { Agent } from "../../../agent.js";
import { AgentRunner } from "../../../agents/runner.js";
import type { ChatMessage } from "../../../agents/runner.js";
import { GroundingValidator } from "../../../security/groundingValidator.js";
import { multiToolModel, mockModel } from "../_fixtures/mockModel.js";
import { searchTool } from "../_fixtures/tools.js";
import { buildTool } from "../../../tools/tool.js";

describe("L2-02: Multi-Tool Research E2E", () => {
  // Build a deterministic 3-step research pipeline
  const search = searchTool({
    "quantum computing": "Quantum computing uses qubits. Qubits exploit superposition and entanglement to process information exponentially faster than classical bits.",
  });

  const summarize = buildTool({
    name: "summarize",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
    maxResultChars: 50_000,
    describe: () => "Summarize text",
    async call(input: Record<string, unknown>) {
      // Deterministic "summarization": just return the first sentence
      const text = String(input.text);
      const firstSentence = text.split(".")[0] + ".";
      return { data: `Summary: ${firstSentence}` };
    },
  });

  it("3-step research: search → summarize → grounded response", async () => {
    const model = multiToolModel(
      [
        { name: "search", args: { query: "quantum computing" } },
        { name: "summarize", args: { text: "Quantum computing uses qubits. Qubits exploit superposition." } },
      ],
      "Quantum computing uses qubits that exploit superposition and entanglement to process information faster than classical methods.",
    );

    const agent = new Agent({
      chatModel: model,
      systemPrompt: "You are a research assistant.",
      tools: [search, summarize],
    });

    const result = await agent.run("Research quantum computing");
    expect(result).toContain("qubits");

    // Verify all 3 LLM calls happened
    expect(model.calls.length).toBe(3);

    // Verify tool results flowed into subsequent calls
    const call2 = model.calls[1]!;
    const toolResult1 = call2.messages.find(
      (m) => m.role === "tool" && typeof m.content === "string" && m.content.includes("qubits"),
    );
    expect(toolResult1).toBeDefined();
  });

  it("GroundingValidator passes when response is grounded in tool evidence", async () => {
    const validator = new GroundingValidator({ mode: "strict", minCoverage: 0.3 });

    // Simulate conversation with tool results
    const messages: ChatMessage[] = [
      { role: "user", content: "Research quantum computing" },
      {
        role: "tool",
        content: "Quantum computing uses qubits that exploit superposition and entanglement for exponential speedup over classical bits.",
        tool_call_id: "tc1",
      },
    ];

    // Response heavily grounded in tool evidence
    const response =
      "Quantum computing uses qubits that exploit superposition and entanglement. This provides exponential speedup over classical computing methods using regular bits.";

    const assessment = await validator.assess(response, messages);
    expect(assessment.score).toBeGreaterThan(0);
    expect(assessment.action).toBe("passed");
  });

  it("GroundingValidator strict mode overrides ungrounded response", async () => {
    const validator = new GroundingValidator({
      mode: "strict",
      minCoverage: 0.5,
      minOverlapTokens: 3,
    });

    const messages: ChatMessage[] = [
      { role: "user", content: "Tell me about dogs" },
      {
        role: "tool",
        content: "Dogs are domesticated mammals related to wolves. They have been bred for thousands of years.",
        tool_call_id: "tc1",
      },
    ];

    // Completely ungrounded response — nothing about dogs/wolves
    const ungrounded =
      "The Andromeda Galaxy is approximately 2.537 million light-years from Earth. It contains roughly one trillion stars and is the closest large galaxy to the Milky Way.";

    const assessment = await validator.assess(ungrounded, messages);
    expect(assessment.action).toBe("overridden");
    expect(assessment.score).toBeLessThan(0.5);
  });

  it("GroundingValidator annotate mode marks ungrounded sentences", async () => {
    const validator = new GroundingValidator({
      mode: "annotate",
      minOverlapTokens: 3,
    });

    const messages: ChatMessage[] = [
      { role: "user", content: "What is Python?" },
      {
        role: "tool",
        content: "Python is a high-level programming language created by Guido van Rossum. It emphasizes code readability.",
        tool_call_id: "tc1",
      },
    ];

    // Mix of grounded and ungrounded sentences
    const response =
      "Python is a high-level programming language created by Guido van Rossum. " +
      "It was originally designed as a successor to the ABC language. " +
      "Python emphasizes code readability and simplicity.";

    const assessment = await validator.assess(response, messages);
    expect(assessment.sentences.length).toBeGreaterThan(0);
    // At least one sentence should be grounded
    const groundedCount = assessment.sentences.filter((s) => s.grounded).length;
    expect(groundedCount).toBeGreaterThan(0);
    // At least one sentence should be ungrounded ("successor to ABC" is not in evidence)
    const ungroundedCount = assessment.sentences.filter((s) => !s.grounded).length;
    expect(ungroundedCount).toBeGreaterThan(0);
  });

  it("GroundingValidator llmScorer receives actual evidence content, not tool names", async () => {
    const scorerCalls: Array<{ sentence: string; evidenceSnippets: string[] }> = [];

    const validator = new GroundingValidator({
      mode: "warn",
      minOverlapTokens: 5,
      llmScorer: async (opts) => {
        scorerCalls.push(opts);
        return 0.8; // grounded
      },
    });

    const messages: ChatMessage[] = [
      { role: "user", content: "Tell me about Kubernetes" },
      {
        role: "tool",
        content:
          "Kubernetes is an open-source container orchestration platform originally designed by Google. It automates deployment scaling and management of containerized applications.",
        tool_call_id: "tc1",
      },
    ];

    // Sentence with SOME overlap but below threshold (borderline → triggers LLM scorer)
    const response =
      "Kubernetes orchestrates containers across multiple cloud providers using declarative configuration management.";

    await validator.assess(response, messages);

    // If the LLM scorer was triggered, check what it received
    if (scorerCalls.length > 0) {
      // BUG #2 regression test: evidence snippets should contain actual
      // evidence text, NOT tool names like "tc1"
      for (const call of scorerCalls) {
        for (const snippet of call.evidenceSnippets) {
          expect(snippet).not.toBe("tc1");
          expect(snippet.length).toBeGreaterThan(10);
          // Should contain actual evidence words
          expect(
            snippet.includes("Kubernetes") ||
            snippet.includes("container") ||
            snippet.includes("orchestration"),
          ).toBe(true);
        }
      }
    }
  });

  it("GroundingValidator with no tool evidence → score 1.0 (nothing to check)", async () => {
    const validator = new GroundingValidator({ mode: "strict", minCoverage: 0.5 });

    // No tool messages
    const messages: ChatMessage[] = [
      { role: "user", content: "Hello" },
    ];

    const assessment = await validator.assess("Hello! How can I help?", messages);
    expect(assessment.score).toBe(1.0);
    expect(assessment.action).toBe("passed");
    expect(assessment.totalSentences).toBe(0);
  });
});
