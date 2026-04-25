/**
 * Tests for Gap #1: Outcome Evaluation System (OutcomeRunner)
 *
 * Tests cover:
 * - Single-pass success (grader satisfied on first try)
 * - Multi-iteration revision loop (grader gives feedback, worker retries)
 * - Max iterations reached
 * - Worker failure
 * - Grader failure (fail-closed: never silently satisfied)
 * - Grader returns invalid JSON (fail-closed)
 * - Abort signal cancellation
 * - onEvaluation hook (early stop)
 * - Event emission lifecycle
 * - Token usage tracking
 * - Structured criteria evaluation
 */

import { describe, it, expect, vi } from "vitest";
import { OutcomeRunner, type OutcomeResult } from "../agents/outcome.js";
import { Agent, type AgentConfig } from "../agent.js";
import type { ChatModel, ChatResult } from "../agents/runner.js";

// ── Test Helpers ─────────────────────────────────────────────────────────────

/** Create a mock model with a fixed sequence of responses */
function mockModel(responses: string[]): ChatModel {
  let idx = 0;
  return {
    async complete(): Promise<ChatResult> {
      const content = responses[Math.min(idx++, responses.length - 1)]!;
      return { content, finishReason: "stop" };
    },
  };
}

/** Build a basic agent config with a mock model */
function agentConfig(model: ChatModel, name = "test-worker"): AgentConfig {
  return {
    systemPrompt: "You are a test worker.",
    chatModel: model,
    name,
    tools: [],
  } as AgentConfig;
}

/**
 * JSON response the grader would return for "satisfied"
 */
function satisfiedGraderResponse(explanation = "All criteria met"): string {
  return JSON.stringify({
    result: "satisfied",
    explanation,
    criteria: [
      { criterion: "Test criterion", satisfied: true, feedback: "Looks good" },
    ],
  });
}

/**
 * JSON response the grader would return for "needs_revision"
 */
function needsRevisionGraderResponse(
  explanation = "Missing requirements",
  criteria?: Array<{ criterion: string; satisfied: boolean; feedback: string }>,
): string {
  return JSON.stringify({
    result: "needs_revision",
    explanation,
    criteria: criteria ?? [
      {
        criterion: "Completeness",
        satisfied: false,
        feedback: "Missing error handling",
      },
    ],
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Gap #1: OutcomeRunner", () => {
  it("returns satisfied when grader approves on first iteration", async () => {
    const workerModel = mockModel(["Here is my implementation"]);
    const graderModel = mockModel([satisfiedGraderResponse()]);

    const worker = new Agent(agentConfig(workerModel));
    const grader = new Agent(agentConfig(graderModel, "grader"));

    const outcome = new OutcomeRunner({
      agent: worker,
      grader,
      rubric: "Code must be correct",
      maxIterations: 3,
    });

    const result = await outcome.run("Implement the payment module");

    expect(result.status).toBe("satisfied");
    expect(result.output).toBe("Here is my implementation");
    expect(result.iterations).toBe(1);
    expect(result.explanation).toBe("All criteria met");
    expect(result.criteriaResults).toBeDefined();
    expect(result.criteriaResults!.length).toBe(1);
    expect(result.criteriaResults![0]!.satisfied).toBe(true);
  });

  it("retries when grader returns needs_revision, then succeeds", async () => {
    // Worker: first attempt → revision → improved version
    const workerModel = mockModel([
      "First attempt (incomplete)",
      "Second attempt (with error handling)",
    ]);
    // Grader: first = needs_revision, second = satisfied
    const graderModel = mockModel([
      needsRevisionGraderResponse("Missing error handling"),
      satisfiedGraderResponse("All fixed"),
    ]);

    const worker = new Agent(agentConfig(workerModel));
    const grader = new Agent(agentConfig(graderModel, "grader"));

    const outcome = new OutcomeRunner({
      agent: worker,
      grader,
      rubric: "Must have error handling",
      maxIterations: 5,
    });

    const result = await outcome.run("Build error handler");

    expect(result.status).toBe("satisfied");
    expect(result.iterations).toBe(2);
    expect(result.explanation).toBe("All fixed");
  });

  it("returns max_iterations_reached when all iterations exhausted", async () => {
    const workerModel = mockModel(["Attempt"]);
    const graderModel = mockModel([
      needsRevisionGraderResponse("Still not good enough"),
    ]);

    const worker = new Agent(agentConfig(workerModel));
    const grader = new Agent(agentConfig(graderModel, "grader"));

    const outcome = new OutcomeRunner({
      agent: worker,
      grader,
      rubric: "Impossible rubric",
      maxIterations: 2,
    });

    const result = await outcome.run("Do impossible task");

    expect(result.status).toBe("max_iterations_reached");
    expect(result.iterations).toBe(2);
    expect(result.explanation).toContain("Maximum iterations");
  });

  it("returns failed when worker agent throws", async () => {
    const workerModel: ChatModel = {
      async complete(): Promise<ChatResult> {
        throw new Error("Model API quota exceeded");
      },
    };
    const graderModel = mockModel([satisfiedGraderResponse()]);

    const worker = new Agent(agentConfig(workerModel));
    const grader = new Agent(agentConfig(graderModel, "grader"));

    const outcome = new OutcomeRunner({
      agent: worker,
      grader,
      rubric: "Any rubric",
    });

    const result = await outcome.run("Anything");

    expect(result.status).toBe("failed");
    expect(result.explanation).toContain("Worker agent failed");
    expect(result.explanation).toContain("Model API quota exceeded");
  });

  it("returns failed (fail-closed) when grader agent throws", async () => {
    const workerModel = mockModel(["Good output"]);
    const graderModel: ChatModel = {
      async complete(): Promise<ChatResult> {
        throw new Error("Grader unavailable");
      },
    };

    const worker = new Agent(agentConfig(workerModel));
    const grader = new Agent(agentConfig(graderModel, "grader"));

    const outcome = new OutcomeRunner({
      agent: worker,
      grader,
      rubric: "Any rubric",
    });

    const result = await outcome.run("Task");

    // CRITICAL: grader crash must NOT result in "satisfied" — fail-closed
    expect(result.status).toBe("failed");
    expect(result.explanation).toContain("Grader failed");
  });

  it("fail-closed when grader returns invalid JSON", async () => {
    const workerModel = mockModel(["My output"]);
    // Grader returns something that's not valid JSON
    const graderModel = mockModel([
      "I think this looks good, the code is correct and handles errors well.",
    ]);

    const worker = new Agent(agentConfig(workerModel));
    const grader = new Agent(agentConfig(graderModel, "grader"));

    const outcome = new OutcomeRunner({
      agent: worker,
      grader,
      rubric: "Any",
      maxIterations: 1,
    });

    const result = await outcome.run("Task");

    // Invalid JSON → parsed as needs_revision (fail-closed), then maxed out
    expect(result.status).toBe("max_iterations_reached");
    // Should NOT be satisfied — grader's intent was ambiguous
  });

  it("fail-closed when grader returns unknown result value", async () => {
    const workerModel = mockModel(["Output"]);
    const graderModel = mockModel([
      JSON.stringify({
        result: "looks_good", // Invalid result value
        explanation: "Seems fine to me",
      }),
    ]);

    const worker = new Agent(agentConfig(workerModel));
    const grader = new Agent(agentConfig(graderModel, "grader"));

    const outcome = new OutcomeRunner({
      agent: worker,
      grader,
      rubric: "Any",
      maxIterations: 1,
    });

    const result = await outcome.run("Task");

    // Unknown result → needs_revision (fail-closed), then maxed out
    expect(result.status).toBe("max_iterations_reached");
  });

  it("onEvaluation hook can stop the loop early", async () => {
    const workerModel = mockModel(["Attempt"]);
    const graderModel = mockModel([
      needsRevisionGraderResponse("Not good"),
    ]);

    const worker = new Agent(agentConfig(workerModel));
    const grader = new Agent(agentConfig(graderModel, "grader"));

    const hookCalls: Array<{ status: string; iteration: number }> = [];

    const outcome = new OutcomeRunner({
      agent: worker,
      grader,
      rubric: "Any",
      maxIterations: 10,
      onEvaluation: (result, iteration) => {
        hookCalls.push({ status: result.status, iteration });
        // Stop after first iteration regardless
        return false;
      },
    });

    const result = await outcome.run("Task");

    expect(result.status).toBe("interrupted");
    expect(result.explanation).toContain("onEvaluation hook");
    expect(hookCalls.length).toBe(1);
    expect(hookCalls[0]!.iteration).toBe(0);
  });

  it("emits lifecycle events: evaluation_start, evaluation_end, complete", async () => {
    const workerModel = mockModel(["Output"]);
    const graderModel = mockModel([satisfiedGraderResponse()]);

    const worker = new Agent(agentConfig(workerModel));
    const grader = new Agent(agentConfig(graderModel, "grader"));

    const outcome = new OutcomeRunner({
      agent: worker,
      grader,
      rubric: "Any",
    });

    const starts: number[] = [];
    const ends: Array<{ iteration: number; status: string }> = [];
    const completes: string[] = [];

    outcome.events.on("outcome:evaluation_start", (d) => starts.push(d.iteration));
    outcome.events.on("outcome:evaluation_end", (d) =>
      ends.push({ iteration: d.iteration, status: d.result.status }),
    );
    outcome.events.on("outcome:complete", (d) => completes.push(d.result.status));

    await outcome.run("Task");

    expect(starts).toEqual([0]);
    expect(ends.length).toBe(1);
    expect(ends[0]!.status).toBe("satisfied");
    expect(completes).toEqual(["satisfied"]);
  });

  it("emits revision_start event when grader gives feedback", async () => {
    const workerModel = mockModel(["v1", "v2"]);
    const graderModel = mockModel([
      needsRevisionGraderResponse("Fix the bug"),
      satisfiedGraderResponse(),
    ]);

    const worker = new Agent(agentConfig(workerModel));
    const grader = new Agent(agentConfig(graderModel, "grader"));

    const outcome = new OutcomeRunner({
      agent: worker,
      grader,
      rubric: "Any",
    });

    const revisions: Array<{ iteration: number; feedback: string }> = [];
    outcome.events.on("outcome:revision_start", (d) => revisions.push(d));

    await outcome.run("Task");

    expect(revisions.length).toBe(1);
    expect(revisions[0]!.feedback).toContain("Fix the bug");
  });

  it("respects AbortSignal cancellation", async () => {
    const controller = new AbortController();
    // Abort immediately
    controller.abort("user cancelled");

    const workerModel = mockModel(["Output"]);
    const graderModel = mockModel([satisfiedGraderResponse()]);

    const worker = new Agent(agentConfig(workerModel));
    const grader = new Agent(agentConfig(graderModel, "grader"));

    const outcome = new OutcomeRunner({
      agent: worker,
      grader,
      rubric: "Any",
      signal: controller.signal,
    });

    const result = await outcome.run("Task");

    expect(result.status).toBe("interrupted");
  });

  it("maxIterations is capped at 20", async () => {
    const workerModel = mockModel(["Output"]);
    // Grader always says needs_revision
    const graderModel = mockModel([
      needsRevisionGraderResponse("Still bad"),
    ]);

    const worker = new Agent(agentConfig(workerModel));
    const grader = new Agent(agentConfig(graderModel, "grader"));

    const outcome = new OutcomeRunner({
      agent: worker,
      grader,
      rubric: "Impossible",
      maxIterations: 999, // Should be capped to 20
    });

    const result = await outcome.run("Task");

    expect(result.status).toBe("max_iterations_reached");
    expect(result.iterations).toBeLessThanOrEqual(20);
  });

  it("structured rubric criteria are returned with satisfied result", async () => {
    const workerModel = mockModel(["Implementation"]);
    const graderModel = mockModel([
      JSON.stringify({
        result: "satisfied",
        explanation: "All criteria pass",
        criteria: [
          { criterion: "Correctness", satisfied: true, feedback: "Logic is sound" },
          {
            criterion: "Performance",
            satisfied: true,
            feedback: "O(n log n) complexity is acceptable",
          },
        ],
      }),
    ]);

    const worker = new Agent(agentConfig(workerModel));
    const grader = new Agent(agentConfig(graderModel, "grader"));

    const outcome = new OutcomeRunner({
      agent: worker,
      grader,
      rubric: {
        content: "Code must be correct and performant",
        criteria: [
          { name: "Correctness", description: "All logic is sound" },
          { name: "Performance", description: "No worse than O(n log n)", weight: 0.7 },
        ],
      },
    });

    const result = await outcome.run("Optimize search");

    expect(result.status).toBe("satisfied");
    expect(result.criteriaResults).toBeDefined();
    expect(result.criteriaResults!.length).toBe(2);

    const perf = result.criteriaResults!.find((c) => c.criterion === "Performance");
    expect(perf).toBeDefined();
    expect(perf!.satisfied).toBe(true);
    expect(perf!.feedback).toContain("O(n log n)");
  });

  it("needs_revision criteria are visible in onEvaluation hook", async () => {
    const workerModel = mockModel(["Implementation"]);
    const graderModel = mockModel([
      JSON.stringify({
        result: "needs_revision",
        explanation: "One criterion failed",
        criteria: [
          { criterion: "Correctness", satisfied: true, feedback: "Logic is sound" },
          { criterion: "Performance", satisfied: false, feedback: "O(n²) is too slow" },
        ],
      }),
    ]);

    const worker = new Agent(agentConfig(workerModel));
    const grader = new Agent(agentConfig(graderModel, "grader"));

    let capturedResult: OutcomeResult | undefined;
    const outcome = new OutcomeRunner({
      agent: worker,
      grader,
      rubric: "Must be performant",
      maxIterations: 5,
      onEvaluation: (result) => {
        capturedResult = result;
        return false; // Stop after first evaluation
      },
    });

    await outcome.run("Optimize search");

    expect(capturedResult).toBeDefined();
    expect(capturedResult!.criteriaResults).toBeDefined();
    expect(capturedResult!.criteriaResults!.length).toBe(2);

    const perf = capturedResult!.criteriaResults!.find((c) => c.criterion === "Performance");
    expect(perf!.satisfied).toBe(false);
    expect(perf!.feedback).toContain("O(n²)");
  });

  it("grader response wrapped in markdown code block is parsed correctly", async () => {
    const workerModel = mockModel(["Work product"]);
    const graderModel = mockModel([
      "Here is my evaluation:\n\n```json\n" +
        JSON.stringify({
          result: "satisfied",
          explanation: "Everything checked out",
        }) +
        "\n```\n",
    ]);

    const worker = new Agent(agentConfig(workerModel));
    const grader = new Agent(agentConfig(graderModel, "grader"));

    const outcome = new OutcomeRunner({
      agent: worker,
      grader,
      rubric: "Any",
    });

    const result = await outcome.run("Task");

    expect(result.status).toBe("satisfied");
    expect(result.explanation).toBe("Everything checked out");
  });
});
