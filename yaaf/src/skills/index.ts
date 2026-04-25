/**
 * Skills — Barrel re-exports.
 *
 * This module re-exports everything from the skills subsystem, providing
 * a single import path for consumers. It also maintains backward
 * compatibility with the original `skills.ts` API surface.
 *
 * @module skills
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type {
  Skill,
  SkillFrontmatter,
  SkillSource,
  SkillExecutionContext,
  SkillEntry,
  SkillToolContext,
  ContentBlock,
} from "./types.js";

// ── Frontmatter parsing ──────────────────────────────────────────────────────

export {
  parseFrontmatter,
  buildSkillFromParsed,
  MAX_SKILL_BYTES,
  type ParsedSkill,
} from "./frontmatter.js";

// ── Loader ───────────────────────────────────────────────────────────────────

export {
  loadSkills,
  loadSkill,
  loadAllSkills,
  defineSkill,
  discoverSkillEntries,
  discoverProjectSkillDirs,
  deduplicateSkills,
  type SkillLoadConfig,
  type SkillLoadResult,
} from "./loader.js";

// ── Registry ─────────────────────────────────────────────────────────────────

export {
  SkillRegistry,
  buildSkillSectionFromList,
  type SkillRegistryEvents,
} from "./registry.js";

// ── Backward compatibility ───────────────────────────────────────────────────
// The old `skills.ts` exported `buildSkillSection` as a function name.
// Re-export under the old name for backward compat.

export { buildSkillSectionFromList as buildSkillSection } from "./registry.js";

// ── Shell Execution ──────────────────────────────────────────────────────────

export {
  resolveSkillVariables,
  extractShellCommands,
  executeShellCommandsInPrompt,
  SkillShellError,
  SkillShellDeniedError,
  type ShellExecFn,
  type ShellPermissionChecker,
  type ShellExecutionConfig,
  type ExtractedCommand,
} from "./shellExecution.js";

// ── Bundled Skill Files ──────────────────────────────────────────────────────

export {
  extractBundledSkillFiles,
  cleanupExtractedSkillFiles,
} from "./bundled/extract.js";

// ── Bundled Skill Registry ───────────────────────────────────────────────────

export {
  registerBundledSkill,
  getBundledSkills,
  getBundledSkill,
  bundledSkillsToSkills,
  _clearBundledSkills,
  type BundledSkillDefinition,
} from "./bundled/registry.js";

// ── Path Matcher ─────────────────────────────────────────────────────────────

export {
  globToRegExp,
  isSkillActiveForPaths,
} from "./pathMatcher.js";

// ── Permissions ──────────────────────────────────────────────────────────────

export {
  buildSkillPermissionPolicy,
  evaluateSkillToolPermission,
  hasOnlySafeProperties,
  getSensitiveProperties,
} from "./permissions.js";

// ── Forked Execution ─────────────────────────────────────────────────────────

export {
  executeForkedSkill,
  skillToAgentTool,
  resolveSkillModel,
  mapEffortToTemperature,
  isForkedSkill,
  isValidExecutionContext,
  type ForkedExecutionConfig,
} from "./forkedExecution.js";

// ── Hot-Reload Watcher ───────────────────────────────────────────────────────

export {
  SkillWatcher,
  type SkillWatcherConfig,
  type SkillChangeEvent,
} from "./watcher.js";

// ── Usage Tracking ───────────────────────────────────────────────────────────

export {
  SkillUsageTracker,
  type SkillUsageRecord,
  type SkillUsageTrackerConfig,
} from "./tracking.js";

// ── Token Budget ─────────────────────────────────────────────────────────────

export { type SkillBudgetConfig } from "./registry.js";
