/**
 * Forked Skill Execution — run a skill as an isolated sub-agent.
 *
 * Skills with `context: "fork"` execute in a child AgentRunner with their own
 * message history, tool context, and optional model/effort overrides. The
 * parent agent receives the sub-agent's final output as a tool result.
 *
 * This module provides:
 * - `executeForkedSkill()` — run a skill in an isolated AgentRunner
 * - `mapEffortToTemperature()` — convert effort levels to temperature
 * - `resolveSkillModel()` — resolve model override from skill frontmatter
 * - `skillToAgentTool()` — wrap a forked skill as a Tool for parent agents
 *
 * Security invariant: the sub-agent always runs with the skill's
 * `allowed-tools` applied as a PermissionPolicy (fail-closed).
 *
 * @module skills/forkedExecution
 */

import { AgentRunner, type ChatModel, type AgentRunnerConfig } from "../agents/runner.js";
import { resolveModel } from "../models/resolver.js";
import { agentTool, type AgentToolConfig } from "../tools/agentTool.js";
import type { Tool } from "../tools/tool.js";
import { buildSkillPermissionPolicy } from "./permissions.js";
import type { Skill, SkillExecutionContext } from "./types.js";

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum LLM round-trips for a forked skill (prevent runaway sub-agents). */
const DEFAULT_MAX_ITERATIONS = 10;

/**
 * Maximum character length for sub-agent output before truncation.
 * Prevents a chatty sub-agent from consuming the parent's context window.
 */
const MAX_RESULT_CHARS = 50_000;

// ── Effort → Temperature mapping ────────────────────────────────────────────

/**
 * Map a skill effort level to an LLM temperature.
 *
 * Temperature controls randomness in model responses:
 * - `'low'` → 0.0 (deterministic, precise)
 * - `'medium'` → 0.3 (balanced)
 * - `'high'` → 0.5 (more creative)
 * - `'max'` → 0.7 (maximum creativity)
 *
 * @returns temperature value, or undefined for default behavior
 */
export function mapEffortToTemperature(
  effort: Skill["effort"],
): number | undefined {
  switch (effort) {
    case "low":
      return 0.0;
    case "medium":
      return 0.3;
    case "high":
      return 0.5;
    case "max":
      return 0.7;
    default:
      return undefined;
  }
}

// ── Model Resolution ─────────────────────────────────────────────────────────

/**
 * Resolve the ChatModel for a skill, applying any model override from frontmatter.
 *
 * @param skill - The skill to resolve the model for
 * @param defaultModel - Fallback model from the parent agent
 * @returns The resolved ChatModel and optional temperature
 */
export function resolveSkillModel(
  skill: Skill,
  defaultModel: ChatModel,
): { model: ChatModel; temperature?: number } {
  let model = defaultModel;

  if (skill.model) {
    try {
      model = resolveModel({ model: skill.model });
    } catch {
      // Model resolution failed — fall back to default
      // This is intentionally non-fatal: a skill shouldn't crash
      // the parent agent because of a misconfigured model name
    }
  }

  return {
    model,
    temperature: mapEffortToTemperature(skill.effort),
  };
}

// ── Forked Execution ─────────────────────────────────────────────────────────

/**
 * Configuration for forked skill execution.
 */
export type ForkedExecutionConfig = {
  /** The skill to execute */
  skill: Skill;
  /** User query or arguments passed to the skill */
  args: string;
  /** Default model from the parent agent */
  defaultModel: ChatModel;
  /** Tools available to the sub-agent (may be filtered by allowed-tools) */
  tools: readonly Tool[];
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Maximum iterations (default: 10) */
  maxIterations?: number;
  /** Maximum result length in chars (default: 50,000) */
  maxResultChars?: number;
};

/**
 * Execute a skill in a forked (isolated) sub-agent.
 *
 * Creates a child AgentRunner with:
 * - The skill's instructions as the system prompt
 * - Skill-scoped PermissionPolicy from `allowed-tools` (fail-closed)
 * - Optional model and temperature overrides from frontmatter
 * - Its own message history (isolated from parent)
 *
 * @returns The sub-agent's final text output
 * @throws If the skill's context is not "fork"
 */
export async function executeForkedSkill(
  config: ForkedExecutionConfig,
): Promise<string> {
  const {
    skill,
    args,
    defaultModel,
    tools,
    signal,
    maxIterations = DEFAULT_MAX_ITERATIONS,
    maxResultChars = MAX_RESULT_CHARS,
  } = config;

  // Validate execution context
  if (skill.context !== "fork") {
    throw new Error(
      `Skill "${skill.name}" has context "${skill.context ?? "inline"}", ` +
        `but executeForkedSkill requires context: "fork".`,
    );
  }

  // Resolve model overrides
  const { model, temperature } = resolveSkillModel(skill, defaultModel);

  // Build skill-scoped permission policy
  const permissions = buildSkillPermissionPolicy(skill["allowed-tools"]);

  // Build the sub-agent config
  const runnerConfig: AgentRunnerConfig = {
    model,
    tools: tools as Tool[],
    systemPrompt: skill.instructions,
    maxIterations,
    permissions,
    temperature: temperature,
  };

  // Create and run the sub-agent
  const subRunner = new AgentRunner(runnerConfig);
  const userMessage = args || "Execute the skill instructions.";
  const result = await subRunner.run(userMessage, signal);

  // Truncate if needed
  if (result.length > maxResultChars) {
    return (
      result.slice(0, maxResultChars) +
      `\n\n[Output truncated: ${result.length} chars → ${maxResultChars} chars]`
    );
  }

  return result;
}

// ── Skill → AgentTool wrapper ────────────────────────────────────────────────

/**
 * Wrap a forked skill as a Tool that a parent agent can invoke.
 *
 * This is the bridge between the skill system and the agent composition model.
 * The parent agent sees the skill as a tool with name `skill.name`, and when
 * invoked, the skill runs in an isolated sub-agent.
 *
 * @param skill - The skill to wrap (must have context: "fork")
 * @param defaultModel - Fallback model from the parent agent
 * @param tools - Tools available to the sub-agent
 * @param opts - Optional overrides for maxIterations and description
 * @returns A Tool that runs the skill as a forked sub-agent
 */
export function skillToAgentTool(
  skill: Skill,
  defaultModel: ChatModel,
  tools: readonly Tool[],
  opts?: {
    maxIterations?: number;
    maxResultChars?: number;
    description?: string;
  },
): Tool {
  // Resolve model upfront so the sub-agent config is deterministic
  const { model, temperature } = resolveSkillModel(skill, defaultModel);
  const permissions = buildSkillPermissionPolicy(skill["allowed-tools"]);

  const subRunner = new AgentRunner({
    model,
    tools: tools as Tool[],
    systemPrompt: skill.instructions,
    maxIterations: opts?.maxIterations ?? DEFAULT_MAX_ITERATIONS,
    permissions,
    temperature,
  });

  const config: AgentToolConfig = {
    name: skill.name,
    description: opts?.description ?? skill.description ?? skill.when_to_use ?? skill.instructions.slice(0, 200),
    maxResultChars: opts?.maxResultChars ?? MAX_RESULT_CHARS,
    concurrent: true,
  };

  return agentTool(subRunner, config);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check if a skill should be forked (executed in a sub-agent).
 *
 * @param skill - The skill to check
 * @returns true if the skill's context is "fork"
 */
export function isForkedSkill(skill: Skill): boolean {
  return skill.context === "fork";
}

/**
 * Check if a skill's execution context is valid.
 *
 * @param context - The execution context to validate
 * @returns true if the context is a recognized value
 */
export function isValidExecutionContext(
  context: unknown,
): context is SkillExecutionContext {
  return context === "inline" || context === "fork";
}
