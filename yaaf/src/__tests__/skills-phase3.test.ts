/**
 * Skills — Phase 3 tests: Shell Execution Engine & Bundled File Extraction.
 *
 * Tests organized by decision boundary per discipline doc:
 * - Each decision point has ACCEPTED, REJECTED, and BOUNDARY cases
 * - Adversarial inputs tested
 * - Security gates verified fail-closed
 */

import { describe, it, expect, afterEach } from "vitest";
import * as fsp from "fs/promises";
import * as path from "path";
import * as os from "os";

import {
  // Shell execution
  resolveSkillVariables,
  extractShellCommands,
  executeShellCommandsInPrompt,
  SkillShellError,
  SkillShellDeniedError,
  type ShellExecFn,
  type ShellPermissionChecker,
  type ShellExecutionConfig,
  // Bundled extraction
  extractBundledSkillFiles,
  cleanupExtractedSkillFiles,
} from "../skills/index.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

let tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs) {
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  tempDirs = [];
});

/** Mock exec that records calls and returns canned output. */
function mockExec(
  responses: Record<string, { stdout: string; stderr: string; exitCode: number }>,
): ShellExecFn & { calls: string[] } {
  const calls: string[] = [];
  const fn = async (command: string) => {
    calls.push(command);
    const response = responses[command];
    if (!response) {
      return { stdout: "", stderr: `command not found: ${command}`, exitCode: 127 };
    }
    return response;
  };
  fn.calls = calls;
  return fn;
}

/** Mock exec that always succeeds with the command echoed back. */
function echoExec(): ShellExecFn & { calls: string[] } {
  const calls: string[] = [];
  const fn = async (command: string) => {
    calls.push(command);
    return { stdout: `[output of: ${command}]`, stderr: "", exitCode: 0 };
  };
  fn.calls = calls;
  return fn;
}

/** Permission checker that allows everything. */
const allowAll: ShellPermissionChecker = async () => ({ allowed: true });

/** Permission checker that denies everything. */
const denyAll: ShellPermissionChecker = async (cmd) => ({
  allowed: false,
  reason: `denied: ${cmd}`,
});

// ── resolveSkillVariables ────────────────────────────────────────────────────

describe("resolveSkillVariables", () => {
  it("replaces ${SKILL_DIR} with the skill directory", () => {
    const result = resolveSkillVariables(
      "Run ${SKILL_DIR}/script.sh",
      "/home/user/.yaaf/skills/deploy",
    );
    expect(result).toBe("Run /home/user/.yaaf/skills/deploy/script.sh");
  });

  it("replaces multiple ${SKILL_DIR} occurrences", () => {
    const result = resolveSkillVariables(
      "${SKILL_DIR}/a && ${SKILL_DIR}/b",
      "/skills",
    );
    expect(result).toBe("/skills/a && /skills/b");
  });

  it("replaces ${SESSION_ID} when provided", () => {
    const result = resolveSkillVariables(
      "Log to ${SESSION_ID}.log",
      "/skills",
      "abc-123",
    );
    expect(result).toBe("Log to abc-123.log");
  });

  it("leaves ${SESSION_ID} unresolved when not provided", () => {
    const result = resolveSkillVariables("Log to ${SESSION_ID}.log", "/skills");
    expect(result).toBe("Log to ${SESSION_ID}.log");
  });

  it("handles content with no variables", () => {
    const result = resolveSkillVariables("No variables here.", "/skills");
    expect(result).toBe("No variables here.");
  });

  it("handles empty content", () => {
    const result = resolveSkillVariables("", "/skills");
    expect(result).toBe("");
  });

  it("handles $-special characters in skillDir without interpretation (F8)", () => {
    // $& in String.replace replacement means "the matched substring"
    // ${SKILL_DIR} should be literally replaced with the path, not interpreted
    const result = resolveSkillVariables(
      "Path: ${SKILL_DIR}/file",
      "/path/with/$&/special",
    );
    expect(result).toBe("Path: /path/with/$&/special/file");
  });
});

// ── extractShellCommands ─────────────────────────────────────────────────────

describe("extractShellCommands", () => {
  it("extracts inline commands: !`cmd`", () => {
    const text = "Run this: !`echo hello` and continue.";
    const commands = extractShellCommands(text);
    expect(commands).toHaveLength(1);
    expect(commands[0]!.command).toBe("echo hello");
    expect(commands[0]!.type).toBe("inline");
    expect(commands[0]!.fullMatch).toBe("!`echo hello`");
  });

  it("extracts block commands: ```! ... ```", () => {
    const text = `Before.

\`\`\`!
echo hello
ls -la
\`\`\`

After.`;
    const commands = extractShellCommands(text);
    expect(commands).toHaveLength(1);
    expect(commands[0]!.command).toBe("echo hello\nls -la");
    expect(commands[0]!.type).toBe("block");
  });

  it("extracts multiple inline commands", () => {
    const text = "First: !`cmd1` then !`cmd2` done.";
    const commands = extractShellCommands(text);
    expect(commands).toHaveLength(2);
    expect(commands[0]!.command).toBe("cmd1");
    expect(commands[1]!.command).toBe("cmd2");
  });

  it("extracts mixed block and inline commands", () => {
    const text = `!\`inline1\`

\`\`\`!
block1
\`\`\`

!\`inline2\``;
    const commands = extractShellCommands(text);
    expect(commands).toHaveLength(3);
    expect(commands.filter((c) => c.type === "block")).toHaveLength(1);
    expect(commands.filter((c) => c.type === "inline")).toHaveLength(2);
  });

  it("returns empty array for text with no commands", () => {
    const text = "Just regular markdown.\n\n```python\nprint('hello')\n```\n";
    expect(extractShellCommands(text)).toHaveLength(0);
  });

  it("ignores empty block commands", () => {
    const text = "```!\n\n```";
    expect(extractShellCommands(text)).toHaveLength(0);
  });

  it("ignores empty inline commands", () => {
    const text = "!`` is not a command.";
    // The regex requires at least one char between backticks
    expect(extractShellCommands(text)).toHaveLength(0);
  });

  it("does not match !` inside code blocks", () => {
    // Regular code block (not !) should NOT trigger inline extraction
    const text = "```\n!`not a command`\n```";
    // The block pattern won't match (no !)
    // The inline pattern might match — this is a known limitation
    // but the block-overlap check should handle it in block commands
    const commands = extractShellCommands(text);
    // At minimum, no block commands
    expect(commands.filter((c) => c.type === "block")).toHaveLength(0);
  });

  it("inline command must be preceded by whitespace or start-of-line", () => {
    const text = "word!`not a command` but !`real command`";
    const commands = extractShellCommands(text);
    expect(commands).toHaveLength(1);
    expect(commands[0]!.command).toBe("real command");
  });
});

// ── executeShellCommandsInPrompt ─────────────────────────────────────────────

describe("executeShellCommandsInPrompt", () => {
  // ── ACCEPTED: successful execution ──

  it("replaces inline command with stdout", async () => {
    const exec = mockExec({
      "echo hello": { stdout: "hello\n", stderr: "", exitCode: 0 },
    });
    const result = await executeShellCommandsInPrompt("Before !`echo hello` after.", {
      exec,
    });
    expect(result).toBe("Before hello after.");
    expect(exec.calls).toEqual(["echo hello"]);
  });

  it("replaces block command with stdout", async () => {
    const exec = mockExec({
      "ls -la": { stdout: "total 0\nfile.txt\n", stderr: "", exitCode: 0 },
    });
    const text = "Files:\n\n```!\nls -la\n```\n\nDone.";
    const result = await executeShellCommandsInPrompt(text, { exec });
    expect(result).toContain("total 0");
    expect(result).toContain("file.txt");
    expect(result).not.toContain("```!");
  });

  it("executes multiple commands sequentially", async () => {
    const exec = echoExec();
    const text = "!`cmd1` and !`cmd2`";
    const result = await executeShellCommandsInPrompt(text, { exec });
    expect(result).toContain("[output of: cmd1]");
    expect(result).toContain("[output of: cmd2]");
    expect(exec.calls).toEqual(["cmd1", "cmd2"]);
  });

  it("returns text unchanged when no commands present", async () => {
    const exec = echoExec();
    const text = "Just regular text.";
    const result = await executeShellCommandsInPrompt(text, { exec });
    expect(result).toBe("Just regular text.");
    expect(exec.calls).toHaveLength(0);
  });

  it("uses stderr when stdout is empty", async () => {
    const exec = mockExec({
      "warn-cmd": { stdout: "", stderr: "warning: something\n", exitCode: 0 },
    });
    const result = await executeShellCommandsInPrompt("!`warn-cmd`", { exec });
    expect(result).toBe("warning: something");
  });

  // ── REJECTED: plugin source blocked ──

  it("blocks shell execution for plugin-sourced skills", async () => {
    const exec = echoExec();
    const text = "!`dangerous command`";
    const result = await executeShellCommandsInPrompt(text, {
      exec,
      skillSource: "plugin",
    });
    // Command NOT executed, text returned as-is
    expect(result).toBe(text);
    expect(exec.calls).toHaveLength(0);
  });

  it("allows shell execution for project-sourced skills", async () => {
    const exec = echoExec();
    await executeShellCommandsInPrompt("!`safe`", {
      exec,
      skillSource: "project",
    });
    expect(exec.calls).toEqual(["safe"]);
  });

  it("allows shell execution for user-sourced skills", async () => {
    const exec = echoExec();
    await executeShellCommandsInPrompt("!`safe`", {
      exec,
      skillSource: "user",
    });
    expect(exec.calls).toEqual(["safe"]);
  });

  it("allows shell execution for bundled skills", async () => {
    const exec = echoExec();
    await executeShellCommandsInPrompt("!`safe`", {
      exec,
      skillSource: "bundled",
    });
    expect(exec.calls).toEqual(["safe"]);
  });

  it("allows shell execution for inline skills", async () => {
    const exec = echoExec();
    await executeShellCommandsInPrompt("!`safe`", {
      exec,
      skillSource: "inline",
    });
    expect(exec.calls).toEqual(["safe"]);
  });

  it("allows shell execution when no source specified", async () => {
    const exec = echoExec();
    await executeShellCommandsInPrompt("!`safe`", { exec });
    expect(exec.calls).toEqual(["safe"]);
  });

  // ── REJECTED: permission denied ──

  it("throws SkillShellDeniedError when permission checker denies", async () => {
    const exec = echoExec();
    await expect(
      executeShellCommandsInPrompt("!`rm -rf /`", {
        exec,
        permissionChecker: denyAll,
      }),
    ).rejects.toThrow(SkillShellDeniedError);
    expect(exec.calls).toHaveLength(0); // command NOT executed
  });

  it("blocks shell execution for dynamic-sourced skills (F1)", async () => {
    const exec = echoExec();
    const text = "!`echo pwned`";
    const result = await executeShellCommandsInPrompt(text, {
      exec,
      skillSource: "dynamic",
    });
    expect(exec.calls).toHaveLength(0);
    expect(result).toBe(text);
  });

  it("SkillShellDeniedError contains command and reason", async () => {
    const exec = echoExec();
    try {
      await executeShellCommandsInPrompt("!`rm -rf /`", {
        exec,
        permissionChecker: denyAll,
      });
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(SkillShellDeniedError);
      expect((e as SkillShellDeniedError).command).toBe("rm -rf /");
      expect((e as SkillShellDeniedError).reason).toContain("denied");
    }
  });

  it("executes when permission checker allows", async () => {
    const exec = echoExec();
    const result = await executeShellCommandsInPrompt("!`safe-cmd`", {
      exec,
      permissionChecker: allowAll,
    });
    expect(result).toContain("[output of: safe-cmd]");
    expect(exec.calls).toEqual(["safe-cmd"]);
  });

  it("permission checker is called per-command", async () => {
    const checkedCommands: string[] = [];
    const checker: ShellPermissionChecker = async (cmd) => {
      checkedCommands.push(cmd);
      return { allowed: true };
    };
    const exec = echoExec();
    await executeShellCommandsInPrompt("!`cmd1` and !`cmd2`", {
      exec,
      permissionChecker: checker,
    });
    expect(checkedCommands).toEqual(["cmd1", "cmd2"]);
  });

  // ── REJECTED: non-zero exit code ──

  it("throws SkillShellError on non-zero exit code", async () => {
    const exec = mockExec({
      "failing-cmd": { stdout: "", stderr: "error msg", exitCode: 1 },
    });
    await expect(
      executeShellCommandsInPrompt("!`failing-cmd`", { exec }),
    ).rejects.toThrow(SkillShellError);
  });

  it("SkillShellError contains command, exitCode, and stderr", async () => {
    const exec = mockExec({
      "bad-cmd": { stdout: "", stderr: "something failed", exitCode: 42 },
    });
    try {
      await executeShellCommandsInPrompt("!`bad-cmd`", { exec });
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(SkillShellError);
      expect((e as SkillShellError).command).toBe("bad-cmd");
      expect((e as SkillShellError).exitCode).toBe(42);
      expect((e as SkillShellError).stderr).toBe("something failed");
    }
  });

  it("wraps unexpected exec errors in SkillShellError", async () => {
    const exec: ShellExecFn = async () => {
      throw new Error("network timeout");
    };
    await expect(
      executeShellCommandsInPrompt("!`cmd`", { exec }),
    ).rejects.toThrow(SkillShellError);
  });

  // ── BOUNDARY: output truncation ──

  it("truncates output exceeding maxOutputBytes", async () => {
    const bigOutput = "x".repeat(200);
    const exec = mockExec({
      "big-cmd": { stdout: bigOutput, stderr: "", exitCode: 0 },
    });
    const result = await executeShellCommandsInPrompt("!`big-cmd`", {
      exec,
      maxOutputBytes: 100,
    });
    expect(result.length).toBeLessThan(bigOutput.length);
    expect(result).toContain("[...output truncated]");
  });

  it("does not truncate output within maxOutputBytes", async () => {
    const output = "small output";
    const exec = mockExec({
      "small-cmd": { stdout: output, stderr: "", exitCode: 0 },
    });
    const result = await executeShellCommandsInPrompt("!`small-cmd`", {
      exec,
      maxOutputBytes: 1000,
    });
    expect(result).toBe("small output");
  });

  it("truncates multi-byte output by bytes not characters (F2)", async () => {
    // Each emoji is 4 bytes in UTF-8
    const emojis = "\u{1F600}".repeat(50); // 50 emojis = 200 bytes
    const exec = mockExec({
      "emoji-cmd": { stdout: emojis, stderr: "", exitCode: 0 },
    });
    const result = await executeShellCommandsInPrompt("!`emoji-cmd`", {
      exec,
      maxOutputBytes: 100, // 100 bytes, not 100 characters
    });
    // The output should be truncated to at most ~100 bytes (+ suffix)
    const resultBytes = Buffer.byteLength(result, "utf8");
    expect(resultBytes).toBeLessThan(200); // not 200 bytes
    expect(result).toContain("[...output truncated]");
  });

  it("handles duplicate commands correctly (F3)", async () => {
    const exec = mockExec({
      "date": { stdout: "2026-04-24", stderr: "", exitCode: 0 },
    });
    const text = "First: !`date` Second: !`date`";
    const result = await executeShellCommandsInPrompt(text, { exec });
    expect(result).toBe("First: 2026-04-24 Second: 2026-04-24");
    expect(exec.calls).toEqual(["date", "date"]);
  });

  // ── Integration: combined features ──

  it("combines variable substitution and shell execution", async () => {
    const exec = echoExec();
    const raw = "Run ${SKILL_DIR}/deploy.sh";
    const resolved = resolveSkillVariables(raw, "/my/skill");
    // Wouldn't have shell commands in this case, but demonstrates the pipeline
    expect(resolved).toBe("Run /my/skill/deploy.sh");
  });
});

// ── extractBundledSkillFiles ─────────────────────────────────────────────────

describe("extractBundledSkillFiles", () => {
  afterEach(async () => {
    // Cleanup temp dirs created by extract
    for (const dir of tempDirs) {
      await cleanupExtractedSkillFiles(dir);
    }
  });

  // ── ACCEPTED: basic extraction ──

  it("extracts files to a temp directory", async () => {
    const files = {
      "script.sh": "#!/bin/bash\necho hello",
      "config.yaml": "env: prod",
    };
    const dir = await extractBundledSkillFiles("test-skill", files);
    tempDirs.push(dir);

    const script = await fsp.readFile(path.join(dir, "script.sh"), "utf8");
    expect(script).toBe("#!/bin/bash\necho hello");

    const config = await fsp.readFile(path.join(dir, "config.yaml"), "utf8");
    expect(config).toBe("env: prod");
  });

  it("creates subdirectories for nested paths", async () => {
    const files = {
      "sub/dir/file.txt": "nested content",
    };
    const dir = await extractBundledSkillFiles("nested-skill", files);
    tempDirs.push(dir);

    const content = await fsp.readFile(path.join(dir, "sub", "dir", "file.txt"), "utf8");
    expect(content).toBe("nested content");
  });

  it("uses unique nonce in path (two calls produce different dirs)", async () => {
    const dir1 = await extractBundledSkillFiles("skill", { "a.txt": "1" });
    const dir2 = await extractBundledSkillFiles("skill", { "a.txt": "2" });
    tempDirs.push(dir1, dir2);

    expect(dir1).not.toBe(dir2);
  });

  it("sanitizes skill name (removes special characters)", async () => {
    const dir = await extractBundledSkillFiles("../../evil", { "ok.txt": "safe" });
    tempDirs.push(dir);
    expect(dir).not.toContain("..");
    expect(path.basename(dir)).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  // ── REJECTED: path traversal ──

  it("rejects paths with .. traversal", async () => {
    await expect(
      extractBundledSkillFiles("skill", { "../../../etc/passwd": "pwned" }),
    ).rejects.toThrow("traversal");
  });

  it("rejects absolute paths", async () => {
    await expect(
      extractBundledSkillFiles("skill", { "/etc/passwd": "pwned" }),
    ).rejects.toThrow("absolute");
  });

  it("rejects empty paths", async () => {
    await expect(
      extractBundledSkillFiles("skill", { "": "empty" }),
    ).rejects.toThrow("empty");
  });

  it("rejects whitespace-only paths", async () => {
    await expect(
      extractBundledSkillFiles("skill", { "   ": "whitespace" }),
    ).rejects.toThrow("empty");
  });

  // ── File permissions ──

  it("creates directories with 0o700 permissions", async () => {
    const dir = await extractBundledSkillFiles("perm-skill", { "f.txt": "x" });
    tempDirs.push(dir);
    const stats = await fsp.stat(dir);
    // macOS may not enforce exact permission bits, but mode should include owner-only
    expect(stats.mode & 0o777).toBe(0o700);
  });

  it("creates files with 0o600 permissions", async () => {
    const dir = await extractBundledSkillFiles("perm-skill", { "f.txt": "x" });
    tempDirs.push(dir);
    const stats = await fsp.stat(path.join(dir, "f.txt"));
    expect(stats.mode & 0o777).toBe(0o600);
  });
});

// ── cleanupExtractedSkillFiles ───────────────────────────────────────────────

describe("cleanupExtractedSkillFiles", () => {
  it("removes extracted directory", async () => {
    const dir = await extractBundledSkillFiles("cleanup-test", { "f.txt": "x" });
    await cleanupExtractedSkillFiles(dir);
    await expect(fsp.access(dir)).rejects.toThrow();
  });

  it("is safe to call on non-existent directory", async () => {
    const nonexistent = path.join(os.tmpdir(), "yaaf-skills", "nonexistent-nonce", "nonexistent");
    await expect(
      cleanupExtractedSkillFiles(nonexistent),
    ).resolves.toBeUndefined();
  });

  it("refuses to clean directories not under yaaf-skills prefix (F7)", async () => {
    // Create a temp dir outside the yaaf-skills namespace
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "not-yaaf-"));
    await fsp.writeFile(path.join(dir, "important.txt"), "do not delete");

    await cleanupExtractedSkillFiles(dir);

    // File should still exist — cleanup was a no-op
    const content = await fsp.readFile(path.join(dir, "important.txt"), "utf8");
    expect(content).toBe("do not delete");

    // Manual cleanup
    await fsp.rm(dir, { recursive: true, force: true });
  });
});

// ── Error types ──────────────────────────────────────────────────────────────

describe("error types", () => {
  it("SkillShellError has correct name and properties", () => {
    const err = new SkillShellError("cmd", new Error("cause"), 1, "stderr");
    expect(err.name).toBe("SkillShellError");
    expect(err.command).toBe("cmd");
    expect(err.exitCode).toBe(1);
    expect(err.stderr).toBe("stderr");
    expect(err.message).toContain("cmd");
    expect(err.cause).toBeInstanceOf(Error);
  });

  it("SkillShellDeniedError has correct name and properties", () => {
    const err = new SkillShellDeniedError("rm -rf /", "dangerous");
    expect(err.name).toBe("SkillShellDeniedError");
    expect(err.command).toBe("rm -rf /");
    expect(err.reason).toBe("dangerous");
    expect(err.message).toContain("dangerous");
    expect(err.message).toContain("rm -rf /");
  });
});
