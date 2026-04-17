/**
 * L2-08: Workflow Agents (Multi-Agent Orchestration) E2E
 *
 * Tests sequential(), parallel(), loop(), conditional(), and transform()
 * composition primitives with real AgentRunners.
 *
 * Probes cross-subsystem wiring:
 * - sequential() chains output₁ → input₂ correctly
 * - parallel() runs steps concurrently and merges results
 * - loop() iterates until shouldExit condition is met
 * - conditional() routes to the correct agent
 * - transform() reformats data between steps
 * - Nested composition: sequential + parallel
 * - parallel onError: 'collect' mode captures errors alongside results
 * - AbortSignal cancellation propagates through workflow steps
 */

import { describe, it, expect } from "vitest";
import { AgentRunner } from "../../../agents/runner.js";
import {
  sequential,
  parallel,
  loop,
  conditional,
  transform,
} from "../../../agents/workflow.js";
import { mockModel, textModel } from "../_fixtures/mockModel.js";

// Helper: create a simple agent step that wraps input text
function textStep(prefix: string) {
  const model = mockModel([
    // Will be called once with some input
    { content: "", finishReason: "stop" },
  ]);

  // Override with a simple step that doesn't need an LLM
  return {
    async run(input: string): Promise<string> {
      return `${prefix}(${input})`;
    },
  };
}

describe("L2-08: Workflow Agents E2E", () => {
  it("sequential() chains outputs → inputs correctly", async () => {
    const pipeline = sequential([
      textStep("step1"),
      textStep("step2"),
      textStep("step3"),
    ]);

    const result = await pipeline.run("hello");
    // step3(step2(step1(hello)))
    expect(result).toBe("step3(step2(step1(hello)))");
  });

  it("sequential() with transform modifies inter-step data", async () => {
    const pipeline = sequential(
      [textStep("A"), textStep("B")],
      {
        transform: (output, stepIndex) => {
          return `[transformed-${stepIndex}]${output}`;
        },
      },
    );

    const result = await pipeline.run("start");
    // Step 0: A(start)
    // Transform: [transformed-1]A(start)
    // Step 1: B([transformed-1]A(start))
    expect(result).toBe("B([transformed-1]A(start))");
  });

  it("parallel() runs all steps concurrently and merges", async () => {
    const workflow = parallel(
      [textStep("A"), textStep("B"), textStep("C")],
      {
        merge: (results) => results.join(" | "),
      },
    );

    const result = await workflow.run("input");
    expect(result).toBe("A(input) | B(input) | C(input)");
  });

  it("parallel() default merge joins with double newlines", async () => {
    const workflow = parallel([textStep("X"), textStep("Y")]);
    const result = await workflow.run("data");
    expect(result).toBe("X(data)\n\nY(data)");
  });

  it("parallel() with onError: 'collect' captures failures alongside results", async () => {
    const failStep = {
      async run(): Promise<string> {
        throw new Error("step failed");
      },
    };

    const workflow = parallel(
      [textStep("ok"), failStep, textStep("also_ok")],
      {
        onError: "collect",
        merge: (results) => results.join(" ; "),
      },
    );

    const result = await workflow.run("input");
    expect(result).toContain("ok(input)");
    expect(result).toContain("[Error: step failed]");
    expect(result).toContain("also_ok(input)");
  });

  it("parallel() with onError: 'fail-fast' throws on first failure", async () => {
    const failStep = {
      async run(): Promise<string> {
        throw new Error("fast-fail");
      },
    };

    const workflow = parallel(
      [textStep("ok"), failStep],
      { onError: "fail-fast" },
    );

    await expect(workflow.run("input")).rejects.toThrow("fast-fail");
  });

  it("loop() iterates until shouldExit condition", async () => {
    let iteration = 0;
    const step = {
      async run(input: string): Promise<string> {
        iteration++;
        return `${input}-iter${iteration}`;
      },
    };

    const workflow = loop([step], {
      maxIterations: 10,
      shouldExit: (result) => result.includes("iter3"),
    });

    const result = await workflow.run("start");
    expect(result).toContain("iter3");
    expect(iteration).toBe(3);
  });

  it("loop() respects maxIterations cap", async () => {
    let count = 0;
    const step = {
      async run(input: string): Promise<string> {
        count++;
        return `${input}+`;
      },
    };

    const workflow = loop([step], {
      maxIterations: 3,
      // Never exit early
      shouldExit: () => false,
    });

    await workflow.run("x");
    expect(count).toBe(3);
  });

  it("loop() with onIteration transforms between iterations", async () => {
    let iteration = 0;
    const step = {
      async run(input: string): Promise<string> {
        iteration++;
        return `result-${iteration}`;
      },
    };

    const workflow = loop([step], {
      maxIterations: 3,
      shouldExit: () => false,
      onIteration: (result, iter) => `[iter${iter}]${result}`,
    });

    const result = await workflow.run("start");
    // Production behavior: onIteration runs after EVERY iteration,
    // including the last one. The final result includes the last transform.
    // After iteration 0: result = "result-1", then transformed to "[iter0]result-1"
    // After iteration 1: result = "result-2", then transformed to "[iter1]result-2"
    // After iteration 2: result = "result-3", then transformed to "[iter2]result-3"
    expect(result).toBe("[iter2]result-3");
  });

  it("conditional() routes to correct agent based on input", async () => {
    const codeStep = textStep("code");
    const generalStep = textStep("general");

    const router = conditional((input) => {
      if (input.includes("code")) return codeStep;
      return generalStep;
    });

    const codeResult = await router.run("write some code");
    expect(codeResult).toBe("code(write some code)");

    const generalResult = await router.run("tell me a joke");
    expect(generalResult).toBe("general(tell me a joke)");
  });

  it("transform() reformats data between steps", async () => {
    const upperStep = transform((input) => input.toUpperCase());
    const result = await upperStep.run("hello world");
    expect(result).toBe("HELLO WORLD");
  });

  it("Nested composition: sequential + parallel", async () => {
    const fanOut = parallel(
      [textStep("A"), textStep("B")],
      { merge: (results) => results.join("+") },
    );

    const pipeline = sequential([textStep("pre"), fanOut, textStep("post")]);

    const result = await pipeline.run("data");
    // pre(data) → fanOut → A(pre(data))+B(pre(data)) → post(A(pre(data))+B(pre(data)))
    expect(result).toBe("post(A(pre(data))+B(pre(data)))");
  });

  it("With real AgentRunners: sequential pipeline", async () => {
    const model1 = mockModel([
      { content: "Research: AI agents are becoming mainstream.", finishReason: "stop" },
    ]);
    const model2 = mockModel([
      { content: "Report: According to research, AI agents are becoming mainstream.", finishReason: "stop" },
    ]);

    const researcher = new AgentRunner({
      model: model1,
      tools: [],
      systemPrompt: "Research assistant",
    });
    const writer = new AgentRunner({
      model: model2,
      tools: [],
      systemPrompt: "Writer",
    });

    const pipeline = sequential([researcher, writer]);
    const result = await pipeline.run("Write about AI agents");
    expect(result).toContain("AI agents");

    // Both agents should have been called
    expect(model1.calls.length).toBe(1);
    expect(model2.calls.length).toBe(1);

    // Writer should have received researcher's output as input
    const writerCall = model2.calls[0]!;
    const writerInput = writerCall.messages.find(
      (m) => m.role === "user" && typeof m.content === "string",
    );
    expect(writerInput).toBeDefined();
    // The writer's user message should be the researcher's output
    expect(String(writerInput!.content)).toContain("Research:");
  });

  it("AbortSignal cancels workflow execution", async () => {
    const ac = new AbortController();

    const slowStep = {
      async run(input: string, signal?: AbortSignal): Promise<string> {
        // Check signal before doing work
        signal?.throwIfAborted();
        await new Promise((r) => setTimeout(r, 1000));
        signal?.throwIfAborted();
        return input;
      },
    };

    const workflow = sequential([slowStep, textStep("end")]);

    // Abort immediately
    ac.abort();
    await expect(workflow.run("data", ac.signal)).rejects.toThrow();
  });

  it("Empty steps arrays throw an error", () => {
    expect(() => sequential([])).toThrow("at least one step");
    expect(() => parallel([])).toThrow("at least one step");
    expect(() => loop([])).toThrow("at least one step");
  });
});
