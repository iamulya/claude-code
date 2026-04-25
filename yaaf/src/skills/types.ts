/**
 * Skills — Type definitions.
 *
 * Defines the `Skill` type, frontmatter schema, source hierarchy,
 * and execution context. This is the single source of truth for
 * skill shapes used across the entire skills subsystem.
 *
 * @module skills/types
 */

// ── Source Hierarchy ──────────────────────────────────────────────────────────

/**
 * Where a skill was loaded from. Determines trust level and capabilities:
 *
 * | Source    | Trust  | Shell execution | Auto-activate |
 * |-----------|--------|:---:|:---:|
 * | bundled   | High   | ✅ | ✅ |
 * | user      | High   | ✅ | ✅ |
 * | project   | Medium | ✅ | ✅ |
 * | managed   | High   | ✅ | ✅ |
 * | plugin    | Low    | ❌ | ❌ |
 * | dynamic   | Medium | ❌ | ❌ |
 * | inline    | High   | ✅ | ✅ |
 */
export type SkillSource =
  | "bundled" // Compiled into the framework
  | "user" // ~/.yaaf/skills/
  | "project" // .yaaf/skills/ (walks up to home)
  | "managed" // MDM/Enterprise-managed
  | "plugin" // From SkillProviderAdapter
  | "dynamic" // registerDynamic() at runtime
  | "inline"; // defineSkill() in code

/**
 * Execution context for a skill invocation.
 *
 * - `'inline'`: Skill instructions are injected into the current agent's
 *   system prompt. The agent sees and follows them directly.
 * - `'fork'`: Skill runs in an isolated sub-agent with its own token budget,
 *   tool context, and conversation history. Only the final result is
 *   returned to the parent agent.
 */
export type SkillExecutionContext = "inline" | "fork";

// ── Frontmatter ──────────────────────────────────────────────────────────────

/**
 * YAML frontmatter fields supported in SKILL.md files.
 *
 * @example
 * ```yaml
 * ---
 * name: security-review
 * description: OWASP security review checklist
 * always: true
 * allowed-tools:
 *   - "Bash(git *)"
 *   - "FileRead(*)"
 * when_to_use: When the user asks for a security review
 * context: fork
 * ---
 * ```
 */
export type SkillFrontmatter = {
  /** Display name for the skill. Used as the invocation name (e.g., /security-review). */
  name: string;

  /** Short description shown in skill listings and help output. */
  description?: string;

  /** Semantic version string (e.g., "1.2.0"). */
  version?: string;

  /** Whether this skill is always injected into the system prompt. Default: true. */
  always?: boolean;

  /** Tags for filtering and search. */
  tags?: string[];

  // ── Claude Code parity fields ──────────────────────────────────────────

  /**
   * Tool permission patterns. When set, the skill's execution context
   * is restricted to only the listed tools. Follows glob-style matching:
   * - `"Bash(git *)"` — allow Bash but only git commands
   * - `"FileRead(*)"` — allow reading any file
   * - `"*"` — allow everything
   *
   * Fail-closed: if specified, any tool NOT matching a pattern is denied.
   */
  "allowed-tools"?: string[];

  /** Description of when the model should auto-invoke this skill. */
  when_to_use?: string;

  /** Placeholder text shown in the argument input. */
  "argument-hint"?: string;

  /** Named argument definitions for structured invocation. */
  arguments?: string[];

  /**
   * Model override for this skill. When set, the skill uses this model
   * instead of the agent's default. Useful for cost-sensitive or
   * capability-specific skills.
   */
  model?: string;

  /**
   * Thinking effort level. Maps to temperature:
   * - `'low'` → 0.0
   * - `'medium'` → 0.3
   * - `'high'` → 0.5
   * - `'max'` → 0.7
   */
  effort?: "low" | "medium" | "high" | "max";

  /** Execution context. Default: `'inline'`. */
  context?: SkillExecutionContext;

  /** Agent type identifier for forked execution. */
  agent?: string;

  /** Whether the user can invoke this skill via `/name`. Default: true. */
  "user-invocable"?: boolean;

  /**
   * Conditional activation globs. If specified, the skill only activates
   * when the agent touches files matching one of these patterns.
   *
   * @example ["src/**\/*.ts", "tests/**"]
   */
  paths?: string[];

  /** Shell type for embedded `!cmd` blocks. Default: `'bash'`. */
  shell?: "bash" | "powershell";

  /**
   * If true, the model cannot invoke this skill — only the user can.
   * Default: false.
   */
  "disable-model-invocation"?: boolean;
};

// ── Skill ────────────────────────────────────────────────────────────────────

/**
 * A complete skill — frontmatter metadata plus instruction content.
 *
 * Skills are loaded from `.md` files, defined inline, or contributed
 * by plugins. They extend an agent's instructions at runtime without
 * code changes.
 */
export type Skill = SkillFrontmatter & {
  /** The full instruction content (after frontmatter). */
  instructions: string;

  /** Source file path, if loaded from disk. */
  filePath?: string;

  /** Directory containing the skill (for ${SKILL_DIR} resolution). */
  skillDir?: string;

  /** Where this skill was loaded from. Skills from the loader always have this set. */
  source?: SkillSource;

  /**
   * Reference files shipped with directory-format skills.
   * Keys are relative paths, values are file contents.
   * Extracted to a temp directory when ${SKILL_DIR} is resolved.
   */
  files?: Record<string, string>;

  /**
   * Lazy-loaded prompt content function (for bundled skills).
   * Called instead of using `instructions` when the skill is invoked.
   */
  getPromptForCommand?: (
    args: string,
    context: SkillToolContext,
  ) => Promise<ContentBlock[]>;
};

// ── Supporting Types ─────────────────────────────────────────────────────────

/**
 * Context passed to skill prompt generators and shell execution.
 */
export type SkillToolContext = {
  /** Execute a shell command. */
  exec?: (command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  /** Current working directory. */
  cwd?: string;
  /** Abort signal. */
  signal?: AbortSignal;
  /** Available tools in the current agent context. */
  tools?: readonly unknown[];
};

/**
 * Content block returned by skill prompt generators.
 */
export type ContentBlock = {
  type: "text";
  text: string;
};

/**
 * Entry discovered during skill directory scanning.
 */
export type SkillEntry = {
  /** Absolute path to the skill file (e.g., SKILL.md or my-skill.md). */
  path: string;
  /** Directory containing the skill (for ${SKILL_DIR}). */
  skillDir: string;
  /** Whether this is a flat file or directory-based skill. */
  format: "flat" | "directory";
};
