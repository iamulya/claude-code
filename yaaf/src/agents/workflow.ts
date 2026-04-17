/**
 * Workflow Agents — Declarative multi-agent orchestration
 *
 * Three composable execution patterns for building multi-agent systems
 * without LLM-based routing. Inspired by ADK's SequentialAgent, ParallelAgent,
 * and LoopAgent, but implemented as lightweight composable functions.
 *
 * **Why functions, not classes?**
 * ADK uses heavy class hierarchies (InvocationContext, EventActions, etc.).
 * YAAF takes a functional approach — workflow agents are just async functions
 * that compose AgentRunners. This makes them easier to test, compose, and debug.
 *
 * @example Sequential Pipeline
 * ```ts
 * const pipeline = sequential([researcher, writer, reviewer]);
 * const result = await pipeline.run('Write an article about AI agents');
 * // researcher runs first → output feeds into writer → writer output into reviewer
 * ```
 *
 * @example Parallel Fan-out
 * ```ts
 * const fanOut = parallel([fetchA, fetchB, fetchC], {
 * merge: (results) => results.join('\n---\n'),
 * });
 * const combined = await fanOut.run('Gather market data');
 * ```
 *
 * @example Loop with Exit Condition
 * ```ts
 * const refine = loop([evaluator, improver], {
 * maxIterations: 5,
 * shouldExit: (result) => result.includes('APPROVED'),
 * });
 * const polished = await refine.run('Draft: ...');
 * ```
 *
 * @module agents/workflow
 */

import type { AgentRunner } from "./runner.js";

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * A WorkflowAgent wraps one or more AgentRunners into a single
 * composable execution unit. It exposes the same `run()` interface.
 */
export type WorkflowAgent = {
  /** Name of this workflow (for debugging/tracing) */
  readonly name: string;
  /** The workflow type */
  readonly type: "sequential" | "parallel" | "loop";
  /** Run the workflow with a user message */
  run(input: string, signal?: AbortSignal): Promise<string>;
};

/**
 * Anything that can participate in a workflow — either a raw AgentRunner
 * or a nested WorkflowAgent.
 */
export type WorkflowStep = {
  run(input: string, signal?: AbortSignal): Promise<string>;
};

// ── Sequential ───────────────────────────────────────────────────────────────

export type SequentialConfig = {
  /** Name for this workflow instance (default: 'sequential') */
  name?: string;
  /**
   * Transform the output of step N before passing to step N+1.
   * Default: passes output directly as the next input.
   */
  transform?: (output: string, stepIndex: number, stepCount: number) => string;
};

/**
 * Sequential Pipeline — runs steps in order, each receiving the
 * previous step's output as input.
 *
 * Equivalent to ADK's `SequentialAgent(sub_agents=[a, b, c])`.
 *
 * @param steps - Agents/workflows to execute in order
 * @param config - Optional configuration
 * @returns A WorkflowAgent that runs the pipeline
 */
export function sequential(steps: WorkflowStep[], config?: SequentialConfig): WorkflowAgent {
  if (steps.length === 0) {
    throw new Error("sequential() requires at least one step");
  }

  const name = config?.name ?? "sequential";

  return {
    name,
    type: "sequential",
    async run(input: string, signal?: AbortSignal): Promise<string> {
      let result = input;

      for (let i = 0; i < steps.length; i++) {
        signal?.throwIfAborted();

        // Transform output before passing to next step
        const stepInput =
          i === 0 ? result : config?.transform ? config.transform(result, i, steps.length) : result;

        result = await steps[i]!.run(stepInput, signal);
      }

      return result;
    },
  };
}

// ── Parallel ─────────────────────────────────────────────────────────────────

export type ParallelConfig = {
  /** Name for this workflow instance (default: 'parallel') */
  name?: string;
  /**
   * Merge results from all parallel steps into a single output.
   * Default: joins with double newlines.
   */
  merge?: (results: string[], inputs: string[]) => string;
  /**
   * Maximum number of concurrent steps. Default: unlimited.
   * Useful if you have rate-limited API keys.
   */
  concurrency?: number;
  /**
   * How to handle individual step failures.
   * - 'fail-fast': abort all on first failure (default)
   * - 'collect': continue running, replace failed results with error messages
   */
  onError?: "fail-fast" | "collect";
};

/**
 * Parallel Fan-out — runs all steps concurrently with the same input,
 * then merges their results.
 *
 * Equivalent to ADK's `ParallelAgent(sub_agents=[a, b, c])`.
 *
 * @param steps - Agents/workflows to execute in parallel
 * @param config - Optional configuration
 * @returns A WorkflowAgent that fans out and merges
 */
export function parallel(steps: WorkflowStep[], config?: ParallelConfig): WorkflowAgent {
  if (steps.length === 0) {
    throw new Error("parallel() requires at least one step");
  }

  const name = config?.name ?? "parallel";
  const concurrency = config?.concurrency ?? Infinity;
  const onError = config?.onError ?? "fail-fast";

  return {
    name,
    type: "parallel",
    async run(input: string, signal?: AbortSignal): Promise<string> {
      signal?.throwIfAborted();

      const results: string[] = new Array(steps.length).fill("");

      if (concurrency >= steps.length) {
        // All at once
        if (onError === "fail-fast") {
          const promises = steps.map((step) => step.run(input, signal));
          const outputs = await Promise.all(promises);
          outputs.forEach((output, i) => {
            results[i] = output;
          });
        } else {
          const settled = await Promise.allSettled(steps.map((step) => step.run(input, signal)));
          settled.forEach((result, i) => {
            results[i] =
              result.status === "fulfilled"
                ? result.value
                : `[Error: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}]`;
          });
        }
      } else {
        // Bounded concurrency with a semaphore
        let nextIdx = 0;
        const errors: Error[] = [];

        async function runNext(): Promise<void> {
          while (nextIdx < steps.length) {
            const idx = nextIdx++;
            try {
              results[idx] = await steps[idx]!.run(input, signal);
            } catch (error) {
              if (onError === "fail-fast") throw error;
              results[idx] = `[Error: ${error instanceof Error ? error.message : String(error)}]`;
              errors.push(error instanceof Error ? error : new Error(String(error)));
            }
          }
        }

        const workers = Array.from({ length: Math.min(concurrency, steps.length) }, () =>
          runNext(),
        );
        await Promise.all(workers);
      }

      // Merge results
      const merge = config?.merge ?? ((r: string[]) => r.join("\n\n"));
      return merge(results, new Array(steps.length).fill(input));
    },
  };
}

// ── Loop ─────────────────────────────────────────────────────────────────────

export type LoopConfig = {
  /** Name for this workflow instance (default: 'loop') */
  name?: string;
  /**
   * Maximum iterations before forced exit.
   * Default: 5 (prevents runaway loops).
   */
  maxIterations?: number;
  /**
   * Condition to exit the loop early.
   * Receives the output of the last step in each iteration.
   * Return `true` to exit (agent is done).
   * Default: never exits early (runs all iterations).
   */
  shouldExit?: (result: string, iteration: number) => boolean | Promise<boolean>;
  /**
   * Called after each iteration, before the next one starts.
   * Can transform the result before it becomes the next iteration's input.
   */
  onIteration?: (result: string, iteration: number) => string;
};

/**
 * Loop Agent — repeats a sequence of steps until a condition is met
 * or max iterations are reached.
 *
 * Equivalent to ADK's `LoopAgent(sub_agents=[...], max_iterations=5)`.
 *
 * Each iteration runs all steps sequentially. The output of the last step
 * becomes the input for the next iteration.
 *
 * @param steps - Agents/workflows to execute on each iteration
 * @param config - Optional configuration
 * @returns A WorkflowAgent that loops
 */
export function loop(steps: WorkflowStep[], config?: LoopConfig): WorkflowAgent {
  if (steps.length === 0) {
    throw new Error("loop() requires at least one step");
  }

  const name = config?.name ?? "loop";
  const maxIterations = config?.maxIterations ?? 5;

  return {
    name,
    type: "loop",
    async run(input: string, signal?: AbortSignal): Promise<string> {
      let result = input;

      for (let iteration = 0; iteration < maxIterations; iteration++) {
        signal?.throwIfAborted();

        // Run all steps sequentially within each iteration
        for (const step of steps) {
          signal?.throwIfAborted();
          result = await step.run(result, signal);
        }

        // Check exit condition
        if (config?.shouldExit) {
          const exit = await config.shouldExit(result, iteration);
          if (exit) break;
        }

        // Transform for next iteration
        if (config?.onIteration) {
          result = config.onIteration(result, iteration);
        }
      }

      return result;
    },
  };
}

// ── Utilities ────────────────────────────────────────────────────────────────

/**
 * Wrap an AgentRunner as a WorkflowStep.
 *
 * Because AgentRunner already has a `run(message, signal)` method,
 * it already satisfies the WorkflowStep interface. This helper exists
 * for explicit intent.
 */
export function asStep(runner: AgentRunner): WorkflowStep {
  return runner;
}

/**
 * Create a simple pass-through step that transforms text without
 * calling an LLM. Useful for data formatting between agents.
 *
 * @example
 * ```ts
 * const pipeline = sequential([
 * researcher,
 * transform(output => `Please review this research:\n${output}`),
 * reviewer,
 * ]);
 * ```
 */
export function transform(fn: (input: string) => string | Promise<string>): WorkflowStep {
  return {
    async run(input: string): Promise<string> {
      return fn(input);
    },
  };
}

/**
 * Create a conditional step that routes to different agents
 * based on the input.
 *
 * @example
 * ```ts
 * const router = conditional(input => {
 * if (input.includes('code')) return codeAgent;
 * return generalAgent;
 * });
 * ```
 */
export function conditional(
  selector: (input: string) => WorkflowStep | Promise<WorkflowStep>,
): WorkflowStep {
  return {
    async run(input: string, signal?: AbortSignal): Promise<string> {
      const step = await selector(input);
      return step.run(input, signal);
    },
  };
}
