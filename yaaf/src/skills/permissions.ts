/**
 * Skills — Permission System.
 *
 * Enforces `allowed-tools` restrictions from skill frontmatter by composing
 * a child PermissionPolicy. When a skill declares `allowed-tools`, ONLY
 * tools matching those patterns are permitted — everything else is denied
 * (fail-closed).
 *
 * Also provides a safe-property allowlist for skills that don't need
 * security review (no tool restrictions, no shell commands, etc.).
 *
 * @module skills/permissions
 */

import { PermissionPolicy, type PermissionOutcome } from "../permissions.js";
import type { Skill } from "./types.js";

// ── Caching ──────────────────────────────────────────────────────────────────

/**
 * Cache of compiled PermissionPolicy objects per skill.
 * Avoids rebuilding regex patterns on every tool call.
 * WeakMap ensures skills can be garbage-collected.
 */
const policyCache = new WeakMap<Skill, PermissionPolicy>();

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * Properties that are considered "safe" on a skill — they don't affect
 * tool access, execution context, or security boundaries.
 *
 * A skill with ONLY safe properties can be loaded without security review.
 *
 * NOTE: `files` is included because no code currently extracts it to disk.
 * If file extraction is added in the future, `files` must be moved to
 * the sensitive list to prevent write-to-disk attacks from project skills.
 */
const SAFE_SKILL_PROPERTIES = new Set([
  // Identity
  "name",
  "description",
  "version",
  "tags",

  // Activation
  "always",
  "when_to_use",
  "paths",

  // Invocation
  "user-invocable",
  "argument-hint",
  "arguments",
  "disable-model-invocation",

  // Content
  "instructions",
  "files", // TODO: move to sensitive if file extraction is implemented
  "getPromptForCommand", // Only on bundled (code-compiled) skills

  // Provenance (set by the loader, not user-controlled)
  "source",
  "filePath",
  "skillDir",
]);

// ── Skill Permission Policy ──────────────────────────────────────────────────

/**
 * Build a PermissionPolicy scoped to a skill's `allowed-tools`.
 *
 * If a skill declares `allowed-tools: ["Bash(git *)", "FileRead(*)"]`,
 * only those patterns are allowed — everything else is denied.
 *
 * If no `allowed-tools` are specified, the parent policy is used
 * (or a permissive policy if no parent exists).
 *
 * DESIGN CHOICE: When `allowed-tools` is specified, the parent policy is
 * intentionally NOT consulted. The skill's allowed-tools is a narrowing
 * whitelist that defines the skill's complete tool scope. If the consumer
 * needs intersection with parent deny rules, they should compose the
 * policies manually. This is because `allowed-tools: ["Bash(git *)"]`
 * already narrows from "all Bash" to "only git", which is inherently
 * more restrictive than a parent that allows everything.
 *
 * @param allowedTools - Tool permission patterns from frontmatter
 * @param parentPolicy - Parent policy to fall back to
 * @returns A PermissionPolicy enforcing the tool restrictions
 */
export function buildSkillPermissionPolicy(
  allowedTools: string[] | undefined,
  parentPolicy?: PermissionPolicy,
): PermissionPolicy {
  if (!allowedTools || allowedTools.length === 0) {
    // No restrictions — use parent policy or allow-all
    return parentPolicy ?? new PermissionPolicy().defaultAction("allow");
  }

  const policy = new PermissionPolicy();

  for (const pattern of allowedTools) {
    // Validate pattern before adding — skip malformed ones
    try {
      policy.allow(pattern);
    } catch {
      // Skip invalid patterns — fail-closed means they just don't allow anything
    }
  }

  // Everything not in the allowlist is denied (fail-closed)
  policy.defaultAction("deny");

  return policy;
}

/**
 * Evaluate whether a tool call is permitted by a skill's allowed-tools.
 *
 * Uses a WeakMap cache to avoid rebuilding the PermissionPolicy on every call.
 * Caching only applies when the skill has `allowed-tools` (deterministic policy).
 * Skills without `allowed-tools` depend on the parentPolicy parameter, which
 * may vary per call, so they are NOT cached.
 *
 * @param skill - The skill whose permissions to check
 * @param toolName - Name of the tool being called
 * @param args - Arguments to the tool call
 * @param parentPolicy - Optional parent policy for unrestricted skills
 * @returns PermissionOutcome — allow, deny, or escalate
 */
export async function evaluateSkillToolPermission(
  skill: Skill,
  toolName: string,
  args: Record<string, unknown>,
  parentPolicy?: PermissionPolicy,
): Promise<PermissionOutcome> {
  // Only cache when allowed-tools is set (policy is fully deterministic)
  if (skill["allowed-tools"] && skill["allowed-tools"].length > 0) {
    let policy = policyCache.get(skill);
    if (!policy) {
      policy = buildSkillPermissionPolicy(skill["allowed-tools"], parentPolicy);
      policyCache.set(skill, policy);
    }
    return policy.evaluate(toolName, args);
  }

  // No allowed-tools → delegate to parent (not cacheable)
  const policy = buildSkillPermissionPolicy(undefined, parentPolicy);
  return policy.evaluate(toolName, args);
}

// ── Safe Property Analysis ───────────────────────────────────────────────────

/**
 * Check if a skill has only "safe" properties — i.e., it doesn't declare
 * any security-sensitive fields like `allowed-tools`, `shell`, `context`,
 * `model`, or `effort`.
 *
 * Skills with only safe properties:
 * - Can be auto-loaded without security review
 * - Don't need permission policy composition
 * - Don't change the execution context
 *
 * @param skill - The skill to check
 * @returns true if the skill only has safe properties
 */
export function hasOnlySafeProperties(skill: Skill): boolean {
  const entries = Object.entries(skill);

  for (const [key, value] of entries) {
    // Skip undefined/null/empty/false values — they're not "set"
    if (value == null || value === "" || value === false) continue;

    // Skip empty arrays
    if (Array.isArray(value) && value.length === 0) continue;

    if (!SAFE_SKILL_PROPERTIES.has(key)) {
      return false; // Has a meaningful non-safe property
    }
  }

  return true;
}

/**
 * Get the list of security-sensitive properties set on a skill.
 * Useful for logging/auditing which properties require review.
 *
 * @param skill - The skill to analyze
 * @returns Array of property names that are security-sensitive
 */
export function getSensitiveProperties(skill: Skill): string[] {
  const sensitive: string[] = [];

  for (const [key, value] of Object.entries(skill)) {
    if (value == null || value === "" || value === false) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (!SAFE_SKILL_PROPERTIES.has(key)) {
      sensitive.push(key);
    }
  }

  return sensitive;
}
