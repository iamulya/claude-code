/**
 * Skills — Bundled Skills Registry.
 *
 * Provides a registry for skills that are compiled into the framework binary.
 * Bundled skills are high-trust, always available, and may use lazy-loaded
 * prompt generators instead of static instruction text.
 *
 * @module skills/bundled
 */

import type { Skill, SkillToolContext, ContentBlock } from "../types.js";

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Definition for a bundled skill.
 * Unlike file-based skills, bundled skills have their prompt logic in code.
 */
export type BundledSkillDefinition = {
  /** Unique name (also the invocation name). */
  name: string;
  /** Short description. */
  description: string;
  /** Whether this skill is always injected into the prompt. Default: false. */
  always?: boolean;
  /** Tool permission patterns (fail-closed restriction). */
  allowedTools?: string[];
  /** Whether the user can invoke this via /name. Default: true. */
  userInvocable?: boolean;
  /** Static instruction text (for simple bundled skills). */
  instructions?: string;
  /** Reference files shipped with the skill. */
  files?: Record<string, string>;
  /**
   * Lazy-loaded prompt generator.
   * Called at invocation time with the user's arguments and tool context.
   * If provided, `instructions` is only used as a fallback.
   */
  getPromptForCommand?: (
    args: string,
    context: SkillToolContext,
  ) => Promise<ContentBlock[]>;
};

// ── Registry ─────────────────────────────────────────────────────────────────

const registry = new Map<string, BundledSkillDefinition>();

/**
 * Register a bundled skill.
 * Called at module initialization time (top-level side effects).
 *
 * @param def - Bundled skill definition
 * @throws Error if a skill with the same name is already registered
 */
export function registerBundledSkill(def: BundledSkillDefinition): void {
  if (registry.has(def.name)) {
    throw new Error(`Bundled skill already registered: ${def.name}`);
  }
  registry.set(def.name, def);
}

/**
 * Get all registered bundled skills.
 */
export function getBundledSkills(): BundledSkillDefinition[] {
  return Array.from(registry.values());
}

/**
 * Get a single bundled skill by name.
 */
export function getBundledSkill(name: string): BundledSkillDefinition | undefined {
  return registry.get(name);
}

/**
 * Convert all bundled skill definitions to Skill objects.
 * These can be merged into the global skill list.
 */
export function bundledSkillsToSkills(): Skill[] {
  return getBundledSkills().map((def) => ({
    name: def.name,
    description: def.description,
    always: def.always ?? false,
    "allowed-tools": def.allowedTools,
    "user-invocable": def.userInvocable ?? true,
    instructions: def.instructions ?? `Bundled skill: ${def.name}`,
    files: def.files,
    getPromptForCommand: def.getPromptForCommand,
    source: "bundled" as const,
  }));
}

/**
 * Clear all registered bundled skills. For testing only.
 * @internal
 */
export function _clearBundledSkills(): void {
  registry.clear();
}
