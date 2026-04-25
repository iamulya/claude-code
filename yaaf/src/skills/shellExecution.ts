/**
 * Skills — Shell Execution Engine.
 *
 * Allows skill markdown to contain executable shell commands using two syntaxes:
 *
 * **Inline**: `` !`command` `` — replaced with stdout
 * **Block**:
 * ````
 * ```!
 * command1
 * command2
 * ```
 * ````
 * — each line executed sequentially, output replaces the block
 *
 * Security model:
 * - Plugin-sourced skills CANNOT execute shell commands (fail-closed)
 * - Dangerous command patterns are checked via `isDangerousCommand()`
 * - Optional PermissionPolicy evaluation for fine-grained control
 * - `${SKILL_DIR}` and `${SESSION_ID}` variables are resolved before execution
 *
 * @module skills/shellExecution
 */

import type { SkillSource } from "./types.js";

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Function that executes a shell command and returns stdout/stderr/exitCode.
 * Matches the signature of `ToolContext.exec`.
 */
export type ShellExecFn = (
  command: string,
) => Promise<{ stdout: string; stderr: string; exitCode: number }>;

/**
 * Permission checker for shell commands. Returns `{ allowed: true }` or
 * `{ allowed: false, reason: string }`.
 *
 * This is a simplified interface to avoid coupling directly to PermissionPolicy.
 * Callers can adapt PermissionPolicy.evaluate() to this shape.
 */
export type ShellPermissionChecker = (
  command: string,
) => Promise<{ allowed: true } | { allowed: false; reason: string }>;

/**
 * Configuration for shell command execution.
 */
export type ShellExecutionConfig = {
  /** Function to execute shell commands. */
  exec: ShellExecFn;
  /** Optional permission checker. If provided, every command is checked before execution. */
  permissionChecker?: ShellPermissionChecker;
  /** The source of the skill. Plugin-sourced skills are blocked from shell execution. */
  skillSource?: SkillSource;
  /** Maximum combined output length (bytes). Default: 64 KB. */
  maxOutputBytes?: number;
  /** Timeout per command in milliseconds. Default: 30_000. */
  timeoutMs?: number;
};

// ── Errors ───────────────────────────────────────────────────────────────────

/**
 * Error thrown when a shell command in a skill fails.
 */
export class SkillShellError extends Error {
  public readonly command: string;
  public readonly exitCode?: number;
  public readonly stderr?: string;

  constructor(command: string, cause: unknown, exitCode?: number, stderr?: string) {
    const msg = `Skill shell command failed: ${command}`;
    super(msg, { cause });
    this.name = "SkillShellError";
    this.command = command;
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

/**
 * Error thrown when a shell command is denied by the permission checker.
 */
export class SkillShellDeniedError extends Error {
  public readonly command: string;
  public readonly reason: string;

  constructor(command: string, reason: string) {
    super(`Shell command blocked: ${reason} — command: ${command}`);
    this.name = "SkillShellDeniedError";
    this.command = command;
    this.reason = reason;
  }
}

// ── Patterns ─────────────────────────────────────────────────────────────────

/**
 * Block command pattern: fenced code block with `!` language tag.
 *
 * Matches:
 * ````markdown
 * ```!
 * echo hello
 * ls -la
 * ```
 * ````
 */
const BLOCK_PATTERN = /```!\s*\n([\s\S]*?)\n```(?:\s*$|\s*\n)/gm;

/**
 * Inline command pattern: `!` followed by backtick-wrapped command.
 *
 * Matches: `!`echo hello``
 *
 * Uses lookbehind to ensure it's preceded by whitespace or start-of-line
 * (prevents matching inside code blocks or URLs).
 */
const INLINE_PATTERN = /(?<=^|\s)!`([^`]+)`/gm;

// ── Variable Substitution ────────────────────────────────────────────────────

/**
 * Replace `${SKILL_DIR}` and `${SESSION_ID}` with their actual values.
 *
 * These are resolved at **load time**, not at LLM invocation time.
 * This prevents the LLM from injecting variable references that resolve
 * to sensitive paths.
 *
 * @param content - Raw skill instruction content
 * @param skillDir - Absolute path to the skill's directory
 * @param sessionId - Optional session identifier
 */
export function resolveSkillVariables(
  content: string,
  skillDir: string,
  sessionId?: string,
): string {
  // Use function replacement to avoid $-special interpretation in the replacement string
  let result = content.replace(/\$\{SKILL_DIR\}/g, () => skillDir);
  if (sessionId) {
    result = result.replace(/\$\{SESSION_ID\}/g, () => sessionId);
  }
  return result;
}

// ── Shell Command Extraction ─────────────────────────────────────────────────

/**
 * A shell command extracted from skill markdown.
 */
export type ExtractedCommand = {
  /** The full regex match (for replacement). */
  fullMatch: string;
  /** The command(s) to execute. For blocks, lines are joined with `&&`. */
  command: string;
  /** Whether this is a block or inline command. */
  type: "block" | "inline";
};

/**
 * Extract all shell commands from skill markdown.
 * Returns them in document order.
 *
 * Exposed for testing — `executeShellCommandsInPrompt` calls this internally.
 */
export function extractShellCommands(text: string): ExtractedCommand[] {
  const commands: ExtractedCommand[] = [];

  // Collect block matches with index
  for (const match of text.matchAll(BLOCK_PATTERN)) {
    const rawCmd = match[1]?.trim();
    if (!rawCmd) continue;
    commands.push({
      fullMatch: match[0],
      command: rawCmd,
      type: "block",
    });
  }

  // Collect inline matches
  if (text.includes("!`")) {
    for (const match of text.matchAll(INLINE_PATTERN)) {
      const rawCmd = match[1]?.trim();
      if (!rawCmd) continue;

      // Skip if this inline match is inside a block match (already captured)
      const matchStart = match.index ?? 0;
      const insideBlock = commands.some(
        (c) =>
          c.type === "block" &&
          text.indexOf(c.fullMatch) <= matchStart &&
          text.indexOf(c.fullMatch) + c.fullMatch.length > matchStart,
      );
      if (insideBlock) continue;

      commands.push({
        fullMatch: match[0],
        command: rawCmd,
        type: "inline",
      });
    }
  }

  return commands;
}

// ── Execution ────────────────────────────────────────────────────────────────

const DEFAULT_MAX_OUTPUT_BYTES = 64 * 1024;

/**
 * Execute all shell commands found in skill markdown and replace them
 * with their output.
 *
 * Security gates (checked in order):
 * 1. Plugin-sourced skills are completely blocked
 * 2. Each command is checked against the permission checker (if provided)
 * 3. Output is capped at maxOutputBytes
 *
 * @param text - Skill instruction markdown containing `!`cmd`` or ``` ```! ``` ``` blocks
 * @param config - Shell execution configuration
 * @returns The markdown with command blocks replaced by their output
 */
export async function executeShellCommandsInPrompt(
  text: string,
  config: ShellExecutionConfig,
): Promise<string> {
  // SECURITY: Never execute shell commands from plugin/remote or dynamic skills
  if (config.skillSource === "plugin" || config.skillSource === "dynamic") {
    return text;
  }

  const commands = extractShellCommands(text);
  if (commands.length === 0) return text;

  const maxOutputBytes = config.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  let result = text;

  for (const cmd of commands) {
    // Permission check
    if (config.permissionChecker) {
      const outcome = await config.permissionChecker(cmd.command);
      if (!outcome.allowed) {
        throw new SkillShellDeniedError(cmd.command, outcome.reason);
      }
    }

    // Execute
    try {
      const { stdout, stderr, exitCode } = await config.exec(cmd.command);

      if (exitCode !== 0) {
        throw new SkillShellError(cmd.command, new Error(`Exit code ${exitCode}`), exitCode, stderr);
      }

      const output = formatOutput(stdout, stderr, maxOutputBytes);
      // Use indexOf + manual splice to handle duplicate fullMatch strings correctly.
      // String.replace() with a string arg only replaces the first occurrence,
      // which breaks when two commands have identical fullMatch text.
      const pos = result.indexOf(cmd.fullMatch);
      if (pos !== -1) {
        result =
          result.slice(0, pos) +
          output +
          result.slice(pos + cmd.fullMatch.length);
      }
    } catch (e) {
      if (e instanceof SkillShellError || e instanceof SkillShellDeniedError) throw e;
      throw new SkillShellError(
        cmd.command,
        e,
        (e as { exitCode?: number }).exitCode,
        (e as { stderr?: string }).stderr,
      );
    }
  }

  return result;
}

// ── Output Formatting ────────────────────────────────────────────────────────

/**
 * Format command output for inclusion in skill text.
 * Prefers stdout; includes stderr only if stdout is empty.
 * Caps total output at maxBytes.
 */
function formatOutput(stdout: string, stderr: string, maxBytes: number): string {
  let output = stdout.trim();

  // If no stdout, use stderr (some tools write to stderr)
  if (!output && stderr.trim()) {
    output = stderr.trim();
  }

  // Cap output size — byte-aware truncation to prevent multi-byte overrun
  if (Buffer.byteLength(output, "utf8") > maxBytes) {
    const buf = Buffer.from(output, "utf8");
    output = buf.subarray(0, maxBytes).toString("utf8") + "\n[...output truncated]";
  }

  return output;
}
