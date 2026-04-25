/**
 * Outcome Evaluation System — Rubric-based evaluate-iterate loop (Gap #1)
 *
 * Wraps a worker Agent in an evaluate-iterate loop with a separate grader Agent.
 * The grader evaluates the worker's output against a markdown rubric and either
 * marks it as `satisfied` or provides revision feedback for the next iteration.
 *
 * **Key design decisions:**
 * - The grader runs in a **separate context window** (separate Agent instance)
 *   so it is never biased by the worker's chain of thought.
 * - The grader's system prompt is **hardcoded** (not user-configurable) to
 *   prevent prompt injection attacks from rubric content.
 * - The grader output is parsed via JSON to ensure typed results.
 *
 * @example
 * ```ts
 * const outcome = new OutcomeRunner({
 *   agent: workerAgent,
 *   rubric: `
 *     # Code Review Rubric
 *     ## Correctness
 *     - All functions return expected values
 *     ## Style
 *     - No var declarations
 *   `,
 *   maxIterations: 5,
 * });
 *
 * const result = await outcome.run('Refactor the payment module');
 * if (result.status === 'satisfied') {
 *   console.log('Work approved:', result.output);
 * }
 * ```
 *
 * @module agents/outcome
 */

import type { Agent } from "../agent.js";
import { EventBus } from "../utils/eventBus.js";
import { Logger } from "../utils/logger.js";

const logger = new Logger("outcome");

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * A rubric against which the grader evaluates the worker's output.
 *
 * Can be a simple markdown string or a structured object with per-criterion
 * definitions for typed feedback.
 */
export type OutcomeRubric = {
  /** Markdown rubric document — per-criterion scoring */
  content: string;
  /** Optional: structured criteria for typed feedback per criterion */
  criteria?: RubricCriterion[];
};

/** A single criterion in a rubric */
export type RubricCriterion = {
  /** Criterion name (e.g., "Correctness") */
  name: string;
  /** What this criterion evaluates */
  description: string;
  /** Relative importance 0-1 (default: equal weight) */
  weight?: number;
};

/**
 * The result of an outcome evaluation loop.
 */
export type OutcomeResult = {
  /** Terminal status of the evaluation */
  status:
    | "satisfied"
    | "needs_revision"
    | "max_iterations_reached"
    | "failed"
    | "interrupted";
  /** The grader's explanation of why this result was reached */
  explanation: string;
  /** Per-criterion breakdown (if rubric has structured criteria) */
  criteriaResults?: Array<{
    criterion: string;
    satisfied: boolean;
    feedback: string;
  }>;
  /** The agent's final work product (last response) */
  output: string;
  /** How many iterations were used */
  iterations: number;
  /** Total token usage across all iterations (worker + grader combined) */
  totalUsage?: { inputTokens: number; outputTokens: number };
};

/** Configuration for the outcome evaluation loop */
export type OutcomeConfig = {
  /**
   * The worker agent that does the actual work.
   * Must be a fully constructed Agent instance.
   */
  agent: Agent;

  /**
   * The grader agent — MUST be a separate Agent instance.
   * Uses its own context window so it's not biased by the worker's reasoning.
   * Can be a cheaper/faster model (e.g., flash for grading, opus for working).
   *
   * If not provided, a grader is auto-created using the same model config as
   * the worker agent, but with the hardcoded grader system prompt.
   */
  grader?: Agent;

  /**
   * The rubric against which the grader evaluates.
   * Can be a markdown string or a structured OutcomeRubric.
   */
  rubric: OutcomeRubric | string;

  /**
   * Maximum evaluation rounds (default: 3, max: 20).
   * Each round = one worker run + one grader evaluation.
   */
  maxIterations?: number;

  /** Abort signal for cancellation */
  signal?: AbortSignal;

  /**
   * Hook called after each grading round.
   * Return false to interrupt the loop early.
   *
   * @param result The grading result for this iteration
   * @param iteration The current iteration number (0-indexed)
   */
  onEvaluation?: (
    result: OutcomeResult,
    iteration: number,
  ) => Promise<boolean> | boolean;
};

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum allowed iterations to prevent runaway loops */
const MAX_ITERATIONS_CAP = 20;

/** Default number of evaluation iterations */
const DEFAULT_MAX_ITERATIONS = 3;

/**
 * Hardcoded grader system prompt.
 *
 * This prompt is NOT user-configurable. If it were, prompt injection in the
 * rubric content could manipulate the grader to always return "satisfied",
 * defeating the entire purpose of the evaluation system.
 */
const GRADER_SYSTEM_PROMPT = `You are a strict quality grader. You evaluate work products against rubrics.

RULES:
1. You MUST be objective and rigorous. Do NOT be lenient.
2. You MUST cite specific criteria that are unmet.
3. Judge ONLY the OUTPUT — you cannot see the worker's reasoning or process.
4. For each criterion, explicitly state whether it is satisfied or not.
5. If ANY criterion is not satisfied, the overall result MUST be "needs_revision".
6. Only return "satisfied" when ALL criteria are met.

You MUST respond with valid JSON in exactly this format:
{
  "result": "satisfied" | "needs_revision",
  "explanation": "Overall explanation of the evaluation",
  "criteria": [
    {
      "criterion": "Name of criterion",
      "satisfied": true | false,
      "feedback": "Specific feedback for this criterion"
    }
  ]
}

Do NOT include any text outside the JSON object.`;

// ── Events ───────────────────────────────────────────────────────────────────

/** Events emitted during the outcome evaluation loop */
export type OutcomeEvents = {
  /** Emitted when a grading evaluation starts */
  "outcome:evaluation_start": { iteration: number };
  /** Emitted when a grading evaluation completes */
  "outcome:evaluation_end": { iteration: number; result: OutcomeResult };
  /** Emitted when the worker starts a revision based on grader feedback */
  "outcome:revision_start": { iteration: number; feedback: string };
  /** Emitted when the overall outcome loop completes */
  "outcome:complete": { result: OutcomeResult };
};

// ── Grader response parsing ──────────────────────────────────────────────────

type GraderResponse = {
  result: "satisfied" | "needs_revision";
  explanation: string;
  criteria?: Array<{
    criterion: string;
    satisfied: boolean;
    feedback: string;
  }>;
};

/**
 * Parse the grader's response. Expected to be JSON matching GraderResponse.
 * Falls back gracefully if the grader doesn't produce valid JSON.
 */
function parseGraderResponse(raw: string): GraderResponse {
  // Try to extract JSON from the response (may be wrapped in markdown code blocks)
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) ?? raw.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : raw;

  try {
    const parsed = JSON.parse(jsonStr.trim()) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "result" in parsed &&
      "explanation" in parsed
    ) {
      const obj = parsed as Record<string, unknown>;
      const result = obj.result;
      if (result !== "satisfied" && result !== "needs_revision") {
        // Fail-closed: unknown result → treat as needs_revision
        return {
          result: "needs_revision",
          explanation: `Grader returned unknown result "${String(result)}". Treating as needs_revision.`,
          criteria: (obj.criteria as GraderResponse["criteria"]) ?? undefined,
        };
      }
      return {
        result: result as "satisfied" | "needs_revision",
        explanation: String(obj.explanation),
        criteria: (obj.criteria as GraderResponse["criteria"]) ?? undefined,
      };
    }
  } catch {
    // JSON parse failed
  }

  // Fallback: if grader didn't produce valid JSON, fail-closed (needs_revision)
  logger.warn("Grader response was not valid JSON — failing closed (needs_revision)");
  return {
    result: "needs_revision",
    explanation: `Grader output could not be parsed as JSON. Raw: ${raw.slice(0, 500)}`,
  };
}

// ── OutcomeRunner ────────────────────────────────────────────────────────────

/**
 * OutcomeRunner — evaluate-iterate loop with rubric-based grading.
 *
 * Orchestrates a worker Agent and a grader Agent in a loop where:
 * 1. Worker produces output in response to a task
 * 2. Grader evaluates the output against a rubric
 * 3. If not satisfied, grader feedback is injected into the next worker iteration
 * 4. Repeat until satisfied, max iterations reached, or interrupted
 *
 * @example
 * ```ts
 * const outcome = new OutcomeRunner({
 *   agent: workerAgent,
 *   rubric: 'All tests must pass. Code must be type-safe.',
 *   maxIterations: 5,
 * });
 *
 * const result = await outcome.run('Fix the build errors');
 * console.log(`Status: ${result.status} after ${result.iterations} iterations`);
 * ```
 */
export class OutcomeRunner {
  private readonly agent: Agent;
  private readonly grader: Agent | undefined;
  private readonly rubric: OutcomeRubric;
  private readonly maxIterations: number;
  private readonly signal?: AbortSignal;
  private readonly onEvaluation?: OutcomeConfig["onEvaluation"];

  /** Event bus for outcome lifecycle events */
  readonly events = new EventBus<OutcomeEvents>();

  constructor(config: OutcomeConfig) {
    this.agent = config.agent;
    this.grader = config.grader;
    this.rubric =
      typeof config.rubric === "string"
        ? { content: config.rubric }
        : config.rubric;
    this.maxIterations = Math.min(
      config.maxIterations ?? DEFAULT_MAX_ITERATIONS,
      MAX_ITERATIONS_CAP,
    );
    this.signal = config.signal;
    this.onEvaluation = config.onEvaluation;
  }

  /**
   * Run the outcome evaluation loop.
   *
   * @param task The initial task for the worker agent.
   * @returns The final outcome result.
   */
  async run(task: string): Promise<OutcomeResult> {
    const originalTask = task; // Preserved for revision feedback (M-4)
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let lastOutput = "";

    // Resolve the grader — use provided grader or auto-create one
    const grader = this.grader ?? (await this.createAutoGrader());

    // Snapshot cumulative tracker values before the loop so we can
    // compute per-iteration deltas (costTracker is cumulative across calls).
    let prevWorkerInput = this.agent.costTracker?.totalInputTokens ?? 0;
    let prevWorkerOutput = this.agent.costTracker?.totalOutputTokens ?? 0;
    let prevGraderInput = grader.costTracker?.totalInputTokens ?? 0;
    let prevGraderOutput = grader.costTracker?.totalOutputTokens ?? 0;

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      // Check for abort
      if (this.signal?.aborted) {
        return this.buildResult(
          "interrupted",
          "Aborted via signal",
          lastOutput,
          iteration,
          { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
        );
      }

      // ── Worker phase ──────────────────────────────────────────────────
      let workerOutput: string;
      try {
        workerOutput = await this.agent.run(task, {
          signal: this.signal,
        });
        lastOutput = workerOutput;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error("Worker agent failed", { error: errMsg, iteration });
        return this.buildResult(
          "failed",
          `Worker agent failed: ${errMsg}`,
          lastOutput,
          iteration,
          { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
        );
      }

      // Track worker token usage (delta, not cumulative)
      const workerTracker = this.agent.costTracker;
      if (workerTracker) {
        const curIn = workerTracker.totalInputTokens;
        const curOut = workerTracker.totalOutputTokens;
        totalInputTokens += curIn - prevWorkerInput;
        totalOutputTokens += curOut - prevWorkerOutput;
        prevWorkerInput = curIn;
        prevWorkerOutput = curOut;
      }

      // ── Grader phase ──────────────────────────────────────────────────
      this.events.emit("outcome:evaluation_start", { iteration });

      const graderPrompt = this.buildGraderPrompt(workerOutput);

      let graderRaw: string;
      try {
        graderRaw = await grader.run(graderPrompt, {
          signal: this.signal,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error("Grader agent failed — failing closed", {
          error: errMsg,
          iteration,
        });
        // Fail-closed: grader crash → treat as failed (not satisfied)
        return this.buildResult(
          "failed",
          `Grader failed: ${errMsg}`,
          lastOutput,
          iteration,
          { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
        );
      }

      // Track grader token usage (delta, not cumulative)
      const graderTracker = grader.costTracker;
      if (graderTracker) {
        const curIn = graderTracker.totalInputTokens;
        const curOut = graderTracker.totalOutputTokens;
        totalInputTokens += curIn - prevGraderInput;
        totalOutputTokens += curOut - prevGraderOutput;
        prevGraderInput = curIn;
        prevGraderOutput = curOut;
      }

      // Parse grader response
      const graderResponse = parseGraderResponse(graderRaw);

      const iterationResult = this.buildResult(
        graderResponse.result === "satisfied" ? "satisfied" : "needs_revision",
        graderResponse.explanation,
        lastOutput,
        iteration + 1,
        { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
        graderResponse.criteria,
      );

      this.events.emit("outcome:evaluation_end", {
        iteration,
        result: iterationResult,
      });

      // ── Check if satisfied ──────────────────────────────────────────────
      if (graderResponse.result === "satisfied") {
        this.events.emit("outcome:complete", { result: iterationResult });
        return iterationResult;
      }

      // ── Check onEvaluation hook ─────────────────────────────────────────
      if (this.onEvaluation) {
        const shouldContinue = await this.onEvaluation(
          iterationResult,
          iteration,
        );
        if (!shouldContinue) {
          const interrupted = this.buildResult(
            "interrupted",
            "Stopped by onEvaluation hook",
            lastOutput,
            iteration + 1,
            {
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
            },
            graderResponse.criteria,
          );
          this.events.emit("outcome:complete", { result: interrupted });
          return interrupted;
        }
      }

      // ── Inject revision feedback ────────────────────────────────────────
      const feedback = this.buildRevisionFeedback(graderResponse);
      this.events.emit("outcome:revision_start", {
        iteration,
        feedback,
      });

      // Steer the worker with the grader's feedback for the next iteration.
      // Keep original task intact — only include latest feedback to prevent
      // exponential prompt growth across iterations (M-4 fix).
      task = `## Original Task\n${originalTask}\n\n## Grader Feedback (Iteration ${iteration + 1})\n${feedback}\n\nPlease revise your output based on the feedback above.`;
    }

    // Max iterations reached
    const maxResult = this.buildResult(
      "max_iterations_reached",
      `Maximum iterations (${this.maxIterations}) reached without satisfying all criteria`,
      lastOutput,
      this.maxIterations,
      { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
    );
    this.events.emit("outcome:complete", { result: maxResult });
    return maxResult;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Build the grader prompt that includes the rubric and the worker's output.
   * The rubric is embedded as data, not as instructions (defense-in-depth).
   */
  private buildGraderPrompt(workerOutput: string): string {
    let prompt = `Evaluate the following work product against the rubric.\n\n`;

    prompt += `## Rubric\n\n${this.rubric.content}\n\n`;

    if (this.rubric.criteria && this.rubric.criteria.length > 0) {
      prompt += `## Structured Criteria\n\nEvaluate each of these criteria specifically:\n`;
      for (const c of this.rubric.criteria) {
        prompt += `- **${c.name}**: ${c.description}${c.weight !== undefined ? ` (weight: ${c.weight})` : ""}\n`;
      }
      prompt += `\n`;
    }

    prompt += `## Work Product to Evaluate\n\n${workerOutput}`;

    return prompt;
  }

  /**
   * Build human-readable revision feedback from the grader response.
   */
  private buildRevisionFeedback(response: GraderResponse): string {
    let feedback = response.explanation;
    if (response.criteria) {
      const unmet = response.criteria.filter((c) => !c.satisfied);
      if (unmet.length > 0) {
        feedback += "\n\n### Unmet Criteria:\n";
        for (const c of unmet) {
          feedback += `- **${c.criterion}**: ${c.feedback}\n`;
        }
      }
    }
    return feedback;
  }

  /**
   * Build an OutcomeResult from components.
   */
  private buildResult(
    status: OutcomeResult["status"],
    explanation: string,
    output: string,
    iterations: number,
    totalUsage?: { inputTokens: number; outputTokens: number },
    criteriaResults?: GraderResponse["criteria"],
  ): OutcomeResult {
    return {
      status,
      explanation,
      output,
      iterations,
      totalUsage,
      criteriaResults,
    };
  }

  /**
   * Auto-create a grader agent when none is provided.
   *
   * Explicitly picks only the model from the worker agent — does NOT
   * spread the worker's full config. This prevents the grader from
   * inheriting worker-specific settings like high temperature, retry
   * policies, maxIterations, memory, hooks, etc.
   */
  private async createAutoGrader(): Promise<Agent> {
    // Import Agent dynamically to avoid circular dependency
    // (outcome.ts is in agents/, agent.ts imports from agents/)
    const { Agent: AgentClass } = await import("../agent.js");

    // Extract only the model from the worker config. Use bracket
    // notation because `config` is private on Agent.
    const workerConfig = this.agent["config"] as import("../agent.js").AgentConfig;

    return new AgentClass({
      // Only inherit the model — nothing else
      chatModel: workerConfig.chatModel,
      // Hardcoded, non-configurable system prompt (prevents injection)
      systemPrompt: GRADER_SYSTEM_PROMPT,
      // Grader-specific defaults
      name: "outcome-grader",
      tools: [],
      plugins: [],
      maxIterations: 1, // Grader should respond in one shot
    });
  }
}
