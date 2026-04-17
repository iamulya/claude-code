/**
 * L1-10: Workflow Agents E2E
 *
 * Tests real wiring between sequential, parallel, loop, conditional,
 * and transform workflow agents.
 */

import { describe, it, expect } from "vitest";
import { AgentRunner } from "../../../agents/runner.js";
import {
  sequential,
  parallel,
  loop,
  conditional,
  transform,
  asStep,
} from "../../../agents/workflow.js";
import { textModel } from "../_fixtures/mockModel.js";

// Helper: create a simple AgentRunner that transforms input
function agentStep(prefix: string): AgentRunner {
  const model = textModel(`${prefix}: processed`);
  return new AgentRunner({
    model,
    tools: [],
    systemPrompt: `You are the ${prefix} agent.`,
  });
}

describe("L1-10: Workflow Agents E2E", () => {
  it("sequential() chains 3 steps: output₁ → input₂ → input₃", async () => {
    const step1 = { run: async (input: string) => `[step1:${input}]` };
    const step2 = { run: async (input: string) => `[step2:${input}]` };
    const step3 = { run: async (input: string) => `[step3:${input}]` };

    const pipeline = sequential([step1, step2, step3]);
    const result = await pipeline.run("start");

    expect(result).toBe("[step3:[step2:[step1:start]]]");
    expect(pipeline.name).toBe("sequential");
    expect(pipeline.type).toBe("sequential");
  });

  it("parallel() runs 2 steps concurrently and merges results", async () => {
    const step1 = { run: async (input: string) => `A:${input}` };
    const step2 = { run: async (input: string) => `B:${input}` };

    const workflow = parallel([step1, step2], {
      merge: (results) => results.join(" | "),
    });

    const result = await workflow.run("go");
    expect(result).toBe("A:go | B:go");
  });

  it("parallel() with error collection continues on failure", async () => {
    const step1 = { run: async () => "success" };
    const step2 = {
      run: async (): Promise<string> => {
        throw new Error("step2 failed");
      },
    };
    const step3 = { run: async () => "also success" };

    const workflow = parallel([step1, step2, step3], {
      onError: "collect",
    });

    const result = await workflow.run("go");
    expect(result).toContain("success");
    expect(result).toContain("[Error: step2 failed]");
  });

  it("loop() iterates until shouldExit condition met", async () => {
    let iteration = 0;
    const step = {
      run: async (input: string) => {
        iteration++;
        return `${input}+${iteration}`;
      },
    };

    const workflow = loop([step], {
      maxIterations: 10,
      shouldExit: (result) => result.includes("+3"),
    });

    const result = await workflow.run("start");
    expect(result).toContain("+3");
    expect(iteration).toBe(3);
  });

  it("loop() respects maxIterations", async () => {
    let count = 0;
    const step = {
      run: async (input: string) => {
        count++;
        return `${input}.`;
      },
    };

    const workflow = loop([step], { maxIterations: 5 });
    await workflow.run("start");
    expect(count).toBe(5);
  });

  it("conditional() routes to correct branch", async () => {
    const codeAgent = { run: async () => "code reply" };
    const generalAgent = { run: async () => "general reply" };

    const router = conditional((input) => {
      if (input.includes("code")) return codeAgent;
      return generalAgent;
    });

    const codeResult = await router.run("help with code");
    expect(codeResult).toBe("code reply");

    const generalResult = await router.run("help with cooking");
    expect(generalResult).toBe("general reply");
  });

  it("transform() modifies intermediate result", async () => {
    const step = { run: async (input: string) => `raw:${input}` };
    const fmt = transform((text) => text.toUpperCase());

    const pipeline = sequential([step, fmt]);
    const result = await pipeline.run("hello");
    expect(result).toBe("RAW:HELLO");
  });

  it("Nested composition: sequential([parallel(...), transform(...)])", async () => {
    const stepA = { run: async (input: string) => `A(${input})` };
    const stepB = { run: async (input: string) => `B(${input})` };
    const fmt = transform((text) => `[${text}]`);

    const workflow = sequential([
      parallel([stepA, stepB], {
        merge: (results) => results.join("+"),
      }),
      fmt,
    ]);

    const result = await workflow.run("x");
    expect(result).toBe("[A(x)+B(x)]");
  });

  it("Abort signal propagated through workflow", async () => {
    const controller = new AbortController();
    let reachedStep2 = false;

    const step1 = {
      run: async () => {
        controller.abort();
        return "done";
      },
    };
    const step2 = {
      run: async () => {
        reachedStep2 = true;
        return "should not reach";
      },
    };

    const workflow = sequential([step1, step2]);

    await expect(workflow.run("start", controller.signal)).rejects.toThrow();
    expect(reachedStep2).toBe(false);
  });

  it("parallel() with concurrency limit", async () => {
    let maxConcurrent = 0;
    let current = 0;

    const makeStep = () => ({
      run: async () => {
        current++;
        maxConcurrent = Math.max(maxConcurrent, current);
        await new Promise((r) => setTimeout(r, 50));
        current--;
        return "ok";
      },
    });

    const workflow = parallel(
      [makeStep(), makeStep(), makeStep(), makeStep()],
      { concurrency: 2 },
    );

    await workflow.run("go");
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });
});
