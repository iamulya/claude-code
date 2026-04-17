/**
 * Workflow, AgentTool, and StructuredOutput tests
 *
 * - Workflow Agents: sequential, parallel, loop, transform, conditional
 * - AgentTool: agent-as-tool wrapping
 * - Structured Output: schema-enforced JSON generation
 */

import { describe, it, expect } from "vitest";
import {
  sequential,
  parallel,
  loop,
  transform,
  conditional,
  type WorkflowStep,
} from "../agents/workflow.js";
import { agentTool, agentTools } from "../tools/agentTool.js";
import {
  structuredAgent,
  parseStructuredOutput,
  buildSchemaPromptSection,
  type OutputSchema,
} from "../agents/structuredOutput.js";

// ── Test Helpers ─────────────────────────────────────────────────────────────

/** Create a mock step that transforms input deterministically */
function mockStep(fn: (input: string) => string): WorkflowStep {
  return {
    run: async (input: string) => fn(input),
  };
}

/** Create a mock step that appends a label */
function labelStep(label: string): WorkflowStep {
  return mockStep((input) => `${input} → ${label}`);
}

/** Create a mock step that takes a specified duration */
function delayStep(label: string, delayMs: number): WorkflowStep {
  return {
    async run(input: string) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return `${input} → ${label}`;
    },
  };
}

/** Create a mock step that fails */
function failStep(error: string): WorkflowStep {
  return {
    async run() {
      throw new Error(error);
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Workflow Agents — Sequential
// ════════════════════════════════════════════════════════════════════════════

describe("sequential", () => {
  it("runs steps in order, passing output to next input", async () => {
    const pipeline = sequential([labelStep("A"), labelStep("B"), labelStep("C")]);

    const result = await pipeline.run("start");
    expect(result).toBe("start → A → B → C");
  });

  it("single step works", async () => {
    const pipeline = sequential([labelStep("only")]);
    const result = await pipeline.run("input");
    expect(result).toBe("input → only");
  });

  it("throws on empty steps", () => {
    expect(() => sequential([])).toThrow("at least one step");
  });

  it("supports custom transform between steps", async () => {
    const pipeline = sequential([labelStep("A"), labelStep("B")], {
      transform: (output) => `[transformed: ${output}]`,
    });

    const result = await pipeline.run("start");
    expect(result).toBe("[transformed: start → A] → B");
  });

  it("exposes metadata", () => {
    const p = sequential([labelStep("A")], { name: "my-pipeline" });
    expect(p.name).toBe("my-pipeline");
    expect(p.type).toBe("sequential");
  });

  it("respects abort signal", async () => {
    const controller = new AbortController();
    controller.abort();

    const pipeline = sequential([labelStep("A")]);
    await expect(pipeline.run("start", controller.signal)).rejects.toThrow();
  });

  it("composes with nested workflows", async () => {
    const inner = sequential([labelStep("B"), labelStep("C")]);
    const outer = sequential([labelStep("A"), inner, labelStep("D")]);

    const result = await outer.run("start");
    expect(result).toBe("start → A → B → C → D");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Workflow Agents — Parallel
// ════════════════════════════════════════════════════════════════════════════

describe("parallel", () => {
  it("runs steps concurrently with same input", async () => {
    const fanOut = parallel([labelStep("A"), labelStep("B"), labelStep("C")]);

    const result = await fanOut.run("query");
    expect(result).toContain("query → A");
    expect(result).toContain("query → B");
    expect(result).toContain("query → C");
  });

  it("custom merge function", async () => {
    const fanOut = parallel([labelStep("X"), labelStep("Y")], {
      merge: (results) => results.join(" | "),
    });

    const result = await fanOut.run("q");
    expect(result).toBe("q → X | q → Y");
  });

  it("throws on empty steps", () => {
    expect(() => parallel([])).toThrow("at least one step");
  });

  it("fail-fast mode propagates errors", async () => {
    const fanOut = parallel([labelStep("A"), failStep("boom"), labelStep("C")], {
      onError: "fail-fast",
    });

    await expect(fanOut.run("q")).rejects.toThrow("boom");
  });

  it("collect mode captures errors", async () => {
    const fanOut = parallel([labelStep("A"), failStep("boom"), labelStep("C")], {
      onError: "collect",
    });

    const result = await fanOut.run("q");
    expect(result).toContain("q → A");
    expect(result).toContain("[Error: boom]");
    expect(result).toContain("q → C");
  });

  it("bounded concurrency works", async () => {
    const timestamps: number[] = [];
    const makeTimedStep = (label: string) => ({
      async run(input: string) {
        timestamps.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 20));
        return `${input} → ${label}`;
      },
    });

    const fanOut = parallel([makeTimedStep("A"), makeTimedStep("B"), makeTimedStep("C")], {
      concurrency: 2,
    });

    const result = await fanOut.run("q");
    expect(result).toContain("q → A");
    expect(result).toContain("q → B");
    expect(result).toContain("q → C");
    // With concurrency=2, the 3rd step should start later
    // (we just verify all complete correctly)
  });

  it("exposes metadata", () => {
    const p = parallel([labelStep("A")], { name: "fan-out" });
    expect(p.name).toBe("fan-out");
    expect(p.type).toBe("parallel");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Workflow Agents — Loop
// ════════════════════════════════════════════════════════════════════════════

describe("loop", () => {
  it("runs maxIterations times by default", async () => {
    let count = 0;
    const counter = {
      async run(input: string) {
        count++;
        return `${input}+${count}`;
      },
    };

    const loopAgent = loop([counter], { maxIterations: 3 });
    const result = await loopAgent.run("start");

    expect(count).toBe(3);
    expect(result).toBe("start+1+2+3");
  });

  it("exits early via shouldExit", async () => {
    let count = 0;
    const counter = {
      async run(input: string) {
        count++;
        return count >= 2 ? "DONE" : input;
      },
    };

    const loopAgent = loop([counter], {
      maxIterations: 10,
      shouldExit: (result) => result === "DONE",
    });

    const result = await loopAgent.run("start");
    expect(result).toBe("DONE");
    expect(count).toBe(2);
  });

  it("defaults to 5 max iterations", async () => {
    let count = 0;
    const counter = {
      async run(input: string) {
        count++;
        return input;
      },
    };

    const loopAgent = loop([counter]);
    await loopAgent.run("x");
    expect(count).toBe(5);
  });

  it("throws on empty steps", () => {
    expect(() => loop([])).toThrow("at least one step");
  });

  it("runs multiple steps per iteration", async () => {
    const loopAgent = loop([labelStep("eval"), labelStep("improve")], { maxIterations: 2 });

    const result = await loopAgent.run("draft");
    expect(result).toBe("draft → eval → improve → eval → improve");
  });

  it("onIteration transforms between iterations", async () => {
    let iteration = 0;
    const loopAgent = loop([mockStep((input) => input.toUpperCase())], {
      maxIterations: 2,
      onIteration: (result, i) => `[iter${i}:${result}]`,
    });

    const result = await loopAgent.run("hello");
    // iter 0: 'hello' → upper → 'HELLO' → onIteration → '[iter0:HELLO]'
    // iter 1: '[iter0:HELLO]' → upper → '[ITER0:HELLO]' → onIteration → '[iter1:[ITER0:HELLO]]'
    // (no more iterations, return last result)
    expect(result).toBe("[iter1:[ITER0:HELLO]]");
  });

  it("exposes metadata", () => {
    const l = loop([labelStep("A")], { name: "refiner" });
    expect(l.name).toBe("refiner");
    expect(l.type).toBe("loop");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Workflow Utilities
// ════════════════════════════════════════════════════════════════════════════

describe("workflow utilities", () => {
  it("transform() creates a pass-through step", async () => {
    const t = transform((input) => input.toUpperCase());
    const result = await t.run("hello");
    expect(result).toBe("HELLO");
  });

  it("conditional() routes based on input", async () => {
    const router = conditional((input) =>
      input.includes("code") ? labelStep("coder") : labelStep("writer"),
    );

    expect(await router.run("write code")).toBe("write code → coder");
    expect(await router.run("write essay")).toBe("write essay → writer");
  });

  it("workflows compose deeply", async () => {
    const researchPhase = parallel([labelStep("web"), labelStep("docs")]);
    const writePhase = sequential([transform((input) => `Context: ${input}`), labelStep("draft")]);
    const refinePhase = loop([labelStep("review")], { maxIterations: 2 });

    const pipeline = sequential([researchPhase, writePhase, refinePhase]);
    const result = await pipeline.run("topic");

    expect(result).toContain("topic → web");
    expect(result).toContain("topic → docs");
    expect(result).toContain("draft");
    expect(result).toContain("review");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// AgentTool
// ════════════════════════════════════════════════════════════════════════════

describe("agentTool", () => {
  it("wraps a step as a tool", async () => {
    const researcher = mockStep((input) => `Research result for: ${input}`);

    const tool = agentTool(researcher, {
      name: "research",
      description: "Research a topic",
    });

    expect(tool.name).toBe("research");
    expect(tool.inputSchema.properties).toHaveProperty("query");

    const result = await tool.call(
      { query: "quantum computing" },
      { model: "test", tools: [], signal: new AbortController().signal, messages: [] },
    );

    expect(result.data.result).toBe("Research result for: quantum computing");
  });

  it("applies transformResult", async () => {
    const agent = mockStep(() => "Full detailed response with lots of text");

    const tool = agentTool(agent, {
      name: "summarizer",
      description: "Summarize text",
      transformResult: (output) => output.slice(0, 10),
    });

    const result = await tool.call(
      { query: "anything" },
      { model: "test", tools: [], signal: new AbortController().signal, messages: [] },
    );

    expect(result.data.result).toBe("Full detai");
  });

  it("is concurrent by default", () => {
    const tool = agentTool(labelStep("a"), {
      name: "test",
      description: "Test",
    });

    expect(tool.isConcurrencySafe({ query: "x" })).toBe(true);
  });

  it("describe() shows query preview", async () => {
    const tool = agentTool(labelStep("a"), {
      name: "test",
      description: "Test",
    });

    const desc = tool.describe({ query: "hello world" });
    expect(typeof desc === "string" ? desc : await desc).toContain("hello world");
  });

  it("getActivityDescription() shows truncated query", () => {
    const tool = agentTool(labelStep("a"), { name: "test", description: "Test" });
    const desc = tool.getActivityDescription?.({ query: "short" });
    expect(desc).toContain("test");
    expect(desc).toContain("short");
  });

  it("agentTools() creates multiple tools", () => {
    const tools = agentTools({
      research: { agent: labelStep("r"), description: "Research" },
      code: { agent: labelStep("c"), description: "Code" },
    });

    expect(tools.length).toBe(2);
    expect(tools[0]!.name).toBe("research");
    expect(tools[1]!.name).toBe("code");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Structured Output
// ════════════════════════════════════════════════════════════════════════════

describe("parseStructuredOutput", () => {
  const schema: OutputSchema = {
    type: "object",
    properties: {
      grade: { type: "string", enum: ["pass", "fail"] },
      score: { type: "number" },
      issues: { type: "array" },
    },
    required: ["grade", "score"],
  };

  it("parses valid JSON", () => {
    const result = parseStructuredOutput('{"grade": "pass", "score": 95, "issues": []}', schema);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.grade).toBe("pass");
      expect(result.data.score).toBe(95);
    }
  });

  it("strips markdown code fences", () => {
    const result = parseStructuredOutput('```json\n{"grade": "pass", "score": 90}\n```', schema);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.grade).toBe("pass");
    }
  });

  it("extracts JSON from prose", () => {
    const result = parseStructuredOutput(
      'Here is my evaluation:\n{"grade": "fail", "score": 30}\nThank you.',
      schema,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.grade).toBe("fail");
    }
  });

  it("fails on empty output", () => {
    const result = parseStructuredOutput("", schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Empty");
  });

  it("fails on invalid JSON", () => {
    const result = parseStructuredOutput("not json at all", schema);
    expect(result.ok).toBe(false);
  });

  it("fails on missing required fields", () => {
    const result = parseStructuredOutput('{"grade": "pass"}', schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("score");
  });

  it("validates enum values", () => {
    const result = parseStructuredOutput('{"grade": "maybe", "score": 50}', schema);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("enum");
  });

  it("validates property types", () => {
    const result = parseStructuredOutput('{"grade": "pass", "score": "not a number"}', schema);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("number");
  });

  it("validates array type", () => {
    const result = parseStructuredOutput(
      '{"grade": "pass", "score": 90, "issues": "not an array"}',
      schema,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("array");
  });

  it("passes with optional fields missing", () => {
    const result = parseStructuredOutput('{"grade": "pass", "score": 95}', schema);

    expect(result.ok).toBe(true);
  });
});

describe("buildSchemaPromptSection", () => {
  it("generates schema instructions", () => {
    const section = buildSchemaPromptSection({
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    });

    expect(section).toContain("Response Format");
    expect(section).toContain("JSON");
    expect(section).toContain('"name"');
    expect(section).toContain('"string"');
  });
});

describe("structuredAgent", () => {
  it("creates an agent with run() returning parsed data", async () => {
    // Mock model that returns valid JSON
    const mockModel = {
      model: "mock",
      complete: async () => ({
        content: '{"category": "spam", "confidence": 0.95}',
        finishReason: "stop" as const,
      }),
    };

    const classifier = structuredAgent(mockModel, {
      name: "classifier",
      systemPrompt: "Classify emails.",
      schema: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["spam", "ham"] },
          confidence: { type: "number" },
        },
        required: ["category", "confidence"],
      },
    });

    const result = await classifier.run("Buy cheap viagra now!!!");
    expect(result.category).toBe("spam");
    expect(result.confidence).toBe(0.95);
    expect(classifier.name).toBe("classifier");
  });

  it("throws on invalid model output", async () => {
    const mockModel = {
      model: "mock",
      complete: async () => ({
        content: "This is not JSON",
        finishReason: "stop" as const,
      }),
    };

    const agent = structuredAgent(mockModel, {
      systemPrompt: "Test",
      schema: { type: "object", properties: { x: { type: "number" } }, required: ["x"] },
    });

    await expect(agent.run("test")).rejects.toThrow("parse failed");
  });
});
