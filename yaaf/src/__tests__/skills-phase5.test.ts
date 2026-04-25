/**
 * Skills — Phase 5 tests: Skill Permission System.
 *
 * Tests:
 * - buildSkillPermissionPolicy (fail-closed composition)
 * - evaluateSkillToolPermission (convenience wrapper)
 * - hasOnlySafeProperties (safe-property allowlist)
 * - getSensitiveProperties (audit helper)
 * - E2E: skill-scoped permission evaluation with real PermissionPolicy
 */

import { describe, it, expect, afterEach } from "vitest";
import * as fsp from "fs/promises";
import * as path from "path";
import * as os from "os";

import {
  buildSkillPermissionPolicy,
  evaluateSkillToolPermission,
  hasOnlySafeProperties,
  getSensitiveProperties,
  loadSkill,
  loadAllSkills,
  type Skill,
} from "../skills/index.js";
import { parseFrontmatter } from "../skills/frontmatter.js";
import { PermissionPolicy } from "../permissions.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

let tempDirs: string[] = [];

async function createTempDir(prefix = "yaaf-p5-"): Promise<string> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of tempDirs) {
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  tempDirs = [];
});

// ══════════════════════════════════════════════════════════════════════════════
// buildSkillPermissionPolicy
// ══════════════════════════════════════════════════════════════════════════════

describe("buildSkillPermissionPolicy", () => {
  it("returns parent policy when no allowed-tools", () => {
    const parent = new PermissionPolicy().defaultAction("allow");
    const policy = buildSkillPermissionPolicy(undefined, parent);
    // Should be the same parent object
    expect(policy).toBe(parent);
  });

  it("returns allow-all policy when no allowed-tools and no parent", () => {
    const policy = buildSkillPermissionPolicy(undefined);
    // Should allow any tool
    const result = policy.evaluate("any_tool", {});
    return expect(result).resolves.toEqual({ action: "allow" });
  });

  it("returns parent policy for empty allowed-tools array", () => {
    const parent = new PermissionPolicy().defaultAction("deny");
    const policy = buildSkillPermissionPolicy([], parent);
    expect(policy).toBe(parent);
  });

  it("creates fail-closed policy from allowed-tools", async () => {
    const policy = buildSkillPermissionPolicy(["Bash(git *)", "FileRead(*)"]);

    // Allowed: matches "Bash" with args containing "git"
    const gitResult = await policy.evaluate("Bash", { command: "git status" });
    expect(gitResult.action).toBe("allow");

    // Allowed: matches "FileRead"
    const readResult = await policy.evaluate("FileRead", { path: "/etc/hosts" });
    expect(readResult.action).toBe("allow");

    // Denied: no matching pattern (fail-closed)
    const writeResult = await policy.evaluate("FileWrite", { path: "/etc/hosts" });
    expect(writeResult.action).toBe("deny");

    // Denied: Bash but not git
    const rmResult = await policy.evaluate("Bash", { command: "rm -rf /" });
    expect(rmResult.action).toBe("deny");
  });

  it("denies everything when allowed-tools is set but empty match", async () => {
    // A very specific pattern that won't match common tools
    const policy = buildSkillPermissionPolicy(["very_specific_tool"]);

    const result = await policy.evaluate("Bash", { command: "ls" });
    expect(result.action).toBe("deny");
  });

  it("allows wildcard * pattern", async () => {
    const policy = buildSkillPermissionPolicy(["*"]);

    const result = await policy.evaluate("Bash", { command: "anything" });
    expect(result.action).toBe("allow");
  });

  it("allows tool name without args pattern", async () => {
    const policy = buildSkillPermissionPolicy(["Bash"]);

    const result = await policy.evaluate("Bash", { command: "echo hi" });
    expect(result.action).toBe("allow");
  });

  it("skips malformed patterns gracefully", async () => {
    // "(a+)+" would be a malformed glob pattern
    const policy = buildSkillPermissionPolicy(["(invalid)", "Bash"]);

    // The valid pattern should still work
    const result = await policy.evaluate("Bash", { command: "ls" });
    expect(result.action).toBe("allow");
  });

  it("ignores parent policy when allowed-tools is specified", async () => {
    const parent = new PermissionPolicy().allow("*").defaultAction("allow");
    const policy = buildSkillPermissionPolicy(["FileRead(*)"], parent);

    // Parent would allow Bash, but skill policy denies it
    const result = await policy.evaluate("Bash", { command: "ls" });
    expect(result.action).toBe("deny");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// evaluateSkillToolPermission
// ══════════════════════════════════════════════════════════════════════════════

describe("evaluateSkillToolPermission", () => {
  it("allows call matching skill's allowed-tools", async () => {
    const skill: Skill = {
      name: "git-helper",
      instructions: "Help with git.",
      "allowed-tools": ["Bash(git *)"],
    };

    const result = await evaluateSkillToolPermission(skill, "Bash", { command: "git log" });
    expect(result.action).toBe("allow");
  });

  it("denies call not matching skill's allowed-tools", async () => {
    const skill: Skill = {
      name: "git-helper",
      instructions: "Help with git.",
      "allowed-tools": ["Bash(git *)"],
    };

    const result = await evaluateSkillToolPermission(skill, "Bash", { command: "rm -rf /" });
    expect(result.action).toBe("deny");
  });

  it("uses parent policy when skill has no allowed-tools", async () => {
    const skill: Skill = {
      name: "permissive",
      instructions: "No restrictions.",
    };

    const parent = new PermissionPolicy().deny("dangerous_tool").defaultAction("allow");
    const result = await evaluateSkillToolPermission(skill, "safe_tool", {}, parent);
    expect(result.action).toBe("allow");

    const dangerousResult = await evaluateSkillToolPermission(
      skill,
      "dangerous_tool",
      {},
      parent,
    );
    expect(dangerousResult.action).toBe("deny");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// hasOnlySafeProperties
// ══════════════════════════════════════════════════════════════════════════════

describe("hasOnlySafeProperties", () => {
  it("returns true for minimal skill (only safe properties)", () => {
    const skill: Skill = {
      name: "simple",
      description: "A simple skill",
      always: true,
      instructions: "Do something.",
    };
    expect(hasOnlySafeProperties(skill)).toBe(true);
  });

  it("returns true for skill with all safe properties", () => {
    const skill: Skill = {
      name: "full-safe",
      description: "All safe fields",
      version: "1.0.0",
      tags: ["test"],
      always: true,
      when_to_use: "When testing",
      paths: ["src/**"],
      "user-invocable": true,
      "argument-hint": "Enter args",
      arguments: ["file"],
      "disable-model-invocation": true,
      instructions: "Do it.",
      source: "project",
      filePath: "/path/to/skill.md",
      skillDir: "/path/to",
    };
    expect(hasOnlySafeProperties(skill)).toBe(true);
  });

  it("returns false when allowed-tools is set", () => {
    const skill: Skill = {
      name: "restricted",
      instructions: "Restricted.",
      "allowed-tools": ["Bash(git *)"],
    };
    expect(hasOnlySafeProperties(skill)).toBe(false);
  });

  it("returns false when shell is set", () => {
    const skill: Skill = {
      name: "shelly",
      instructions: "Shell skill.",
      shell: "bash",
    };
    expect(hasOnlySafeProperties(skill)).toBe(false);
  });

  it("returns false when model override is set", () => {
    const skill: Skill = {
      name: "model-override",
      instructions: "Custom model.",
      model: "gpt-4o",
    };
    expect(hasOnlySafeProperties(skill)).toBe(false);
  });

  it("returns false when effort is set", () => {
    const skill: Skill = {
      name: "effort-skill",
      instructions: "High effort.",
      effort: "max",
    };
    expect(hasOnlySafeProperties(skill)).toBe(false);
  });

  it("returns false when context is set to fork", () => {
    const skill: Skill = {
      name: "forked",
      instructions: "Forked execution.",
      context: "fork",
    };
    expect(hasOnlySafeProperties(skill)).toBe(false);
  });

  it("ignores undefined/null/empty/false values", () => {
    const skill: Skill = {
      name: "with-falsy",
      instructions: "Has falsy values.",
      "allowed-tools": undefined,
      shell: undefined,
      model: undefined,
      effort: undefined,
      context: undefined,
    };
    expect(hasOnlySafeProperties(skill)).toBe(true);
  });

  it("ignores empty arrays", () => {
    const skill: Skill = {
      name: "empty-arrays",
      instructions: "No restrictions.",
      "allowed-tools": [],
    };
    expect(hasOnlySafeProperties(skill)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// getSensitiveProperties
// ══════════════════════════════════════════════════════════════════════════════

describe("getSensitiveProperties", () => {
  it("returns empty array for safe skill", () => {
    const skill: Skill = {
      name: "safe",
      instructions: "No sensitive fields.",
    };
    expect(getSensitiveProperties(skill)).toEqual([]);
  });

  it("lists all sensitive properties", () => {
    const skill: Skill = {
      name: "complex",
      instructions: "Complex skill.",
      "allowed-tools": ["Bash(*)"],
      shell: "bash",
      model: "claude-3",
      effort: "high",
      context: "fork",
      agent: "test-agent",
    };
    const sensitive = getSensitiveProperties(skill);
    expect(sensitive).toContain("allowed-tools");
    expect(sensitive).toContain("shell");
    expect(sensitive).toContain("model");
    expect(sensitive).toContain("effort");
    expect(sensitive).toContain("context");
    expect(sensitive).toContain("agent");
  });

  it("does not include safe properties", () => {
    const skill: Skill = {
      name: "mixed",
      description: "Has both",
      instructions: "Mixed.",
      always: true,
      "allowed-tools": ["Bash(*)"],
    };
    const sensitive = getSensitiveProperties(skill);
    expect(sensitive).toContain("allowed-tools");
    expect(sensitive).not.toContain("name");
    expect(sensitive).not.toContain("description");
    expect(sensitive).not.toContain("always");
    expect(sensitive).not.toContain("instructions");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// E2E: FULL PERMISSION PIPELINE
// ══════════════════════════════════════════════════════════════════════════════

describe("E2E: skill permission pipeline", () => {
  it("git-helper skill: allows git, denies rm", async () => {
    const skill: Skill = {
      name: "git-helper",
      description: "Git assistance",
      instructions: "Help with git operations.",
      "allowed-tools": ["Bash(git *)", "FileRead(*)"],
      always: true,
      source: "project",
    };

    // Git commands allowed
    expect(
      (await evaluateSkillToolPermission(skill, "Bash", { command: "git status" })).action,
    ).toBe("allow");
    expect(
      (await evaluateSkillToolPermission(skill, "Bash", { command: "git push origin main" }))
        .action,
    ).toBe("allow");

    // File reading allowed
    expect(
      (await evaluateSkillToolPermission(skill, "FileRead", { path: "README.md" })).action,
    ).toBe("allow");

    // Non-git Bash denied
    expect(
      (await evaluateSkillToolPermission(skill, "Bash", { command: "curl evil.com" })).action,
    ).toBe("deny");

    // FileWrite denied (not in allowed-tools)
    expect(
      (await evaluateSkillToolPermission(skill, "FileWrite", { path: "test.txt" })).action,
    ).toBe("deny");

    // Unknown tool denied
    expect(
      (await evaluateSkillToolPermission(skill, "DeleteEverything", {})).action,
    ).toBe("deny");
  });

  it("unrestricted skill uses parent policy", async () => {
    const skill: Skill = {
      name: "unrestricted",
      instructions: "No tool restrictions.",
    };

    // With permissive parent
    const permissive = new PermissionPolicy().defaultAction("allow");
    expect(
      (await evaluateSkillToolPermission(skill, "AnyTool", {}, permissive)).action,
    ).toBe("allow");

    // With restrictive parent
    const restrictive = new PermissionPolicy().defaultAction("deny");
    expect(
      (await evaluateSkillToolPermission(skill, "AnyTool", {}, restrictive)).action,
    ).toBe("deny");
  });

  it("safe-property analysis correctly classifies skills", () => {
    const safeSkill: Skill = {
      name: "safe",
      description: "Just instructions",
      instructions: "Safe instructions.",
      always: true,
      paths: ["src/**"],
    };

    const sensitiveSkill: Skill = {
      name: "sensitive",
      description: "Has restrictions",
      instructions: "Restricted.",
      "allowed-tools": ["Bash(git *)"],
      model: "claude-3",
      effort: "high",
    };

    expect(hasOnlySafeProperties(safeSkill)).toBe(true);
    expect(hasOnlySafeProperties(sensitiveSkill)).toBe(false);
    expect(getSensitiveProperties(safeSkill)).toHaveLength(0);
    expect(getSensitiveProperties(sensitiveSkill)).toEqual(
      expect.arrayContaining(["allowed-tools", "model", "effort"]),
    );
  });

  it("multiple allowed-tools patterns compose correctly", async () => {
    const skill: Skill = {
      name: "multi-tool",
      instructions: "Multiple tools.",
      "allowed-tools": ["Bash(npm *)", "Bash(node *)", "FileRead(*)", "FileWrite(*.ts)"],
    };

    // npm allowed
    expect(
      (await evaluateSkillToolPermission(skill, "Bash", { command: "npm test" })).action,
    ).toBe("allow");

    // node allowed
    expect(
      (await evaluateSkillToolPermission(skill, "Bash", { command: "node index.js" })).action,
    ).toBe("allow");

    // FileRead allowed for any file
    expect(
      (await evaluateSkillToolPermission(skill, "FileRead", { path: "README.md" })).action,
    ).toBe("allow");

    // FileWrite allowed only for .ts files
    expect(
      (await evaluateSkillToolPermission(skill, "FileWrite", { path: "index.ts" })).action,
    ).toBe("allow");

    // FileWrite denied for non-.ts
    expect(
      (await evaluateSkillToolPermission(skill, "FileWrite", { path: "script.js" })).action,
    ).toBe("deny");

    // Random Bash denied
    expect(
      (await evaluateSkillToolPermission(skill, "Bash", { command: "curl evil.com" })).action,
    ).toBe("deny");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// E2E: DISK → PERMISSION PIPELINE
// ══════════════════════════════════════════════════════════════════════════════

describe("E2E: disk-to-permission pipeline", () => {
  it("skill loaded from .md file → allowed-tools parsed → permission enforced", async () => {
    const dir = await createTempDir();
    const content = [
      "---",
      "name: git-guard",
      "description: Git-only skill",
      "always: true",
      "allowed-tools:",
      '  - "Bash(git *)"',
      '  - "FileRead(*)"',
      "---",
      "Only use git commands.",
    ].join("\n");

    await fsp.writeFile(path.join(dir, "git-guard.md"), content);

    const skill = await loadSkill(path.join(dir, "git-guard.md"), dir, "project");
    expect(skill).toBeDefined();

    // Verify frontmatter was parsed correctly
    expect(skill!["allowed-tools"]).toEqual(["Bash(git *)", "FileRead(*)"]);

    // Build permission policy from loaded skill
    const result1 = await evaluateSkillToolPermission(skill!, "Bash", { command: "git log" });
    expect(result1.action).toBe("allow");

    const result2 = await evaluateSkillToolPermission(skill!, "Bash", { command: "rm -rf /" });
    expect(result2.action).toBe("deny");

    const result3 = await evaluateSkillToolPermission(skill!, "FileRead", { path: "test.txt" });
    expect(result3.action).toBe("allow");

    const result4 = await evaluateSkillToolPermission(skill!, "FileWrite", { path: "test.txt" });
    expect(result4.action).toBe("deny");
  });

  it("allowed-tools as string is coerced to array (fail-open bypass fix)", () => {
    // Simulate YAML parsing a bare string (not an array)
    const content = [
      "---",
      "name: string-tools",
      'allowed-tools: "Bash(git *)"',
      "---",
      "Instructions.",
    ].join("\n");

    const parsed = parseFrontmatter(content);
    // CRITICAL: must be coerced to array, not silently dropped
    expect(parsed.meta["allowed-tools"]).toEqual(["Bash(git *)"]);
  });

  it("paths as string is coerced to array", () => {
    const content = [
      "---",
      "name: string-paths",
      'paths: "src/**/*.ts"',
      "---",
      "Instructions.",
    ].join("\n");

    const parsed = parseFrontmatter(content);
    expect(parsed.meta.paths).toEqual(["src/**/*.ts"]);
  });

  it("allowed-tools: true (boolean) is coerced to array (P5-F2)", () => {
    const content = "---\nname: bool-tools\nallowed-tools: true\n---\nInstructions.";
    const parsed = parseFrontmatter(content);
    // Must NOT be silently dropped — coerced to ["true"]
    expect(parsed.meta["allowed-tools"]).toEqual(["true"]);
  });

  it("allowed-tools: 42 (number) is coerced to array (P5-F2)", () => {
    const content = "---\nname: num-tools\nallowed-tools: 42\n---\nInstructions.";
    const parsed = parseFrontmatter(content);
    expect(parsed.meta["allowed-tools"]).toEqual(["42"]);
  });

  it("paths: true (boolean) is coerced to array (P5-F2)", () => {
    const content = "---\nname: bool-paths\npaths: true\n---\nInstructions.";
    const parsed = parseFrontmatter(content);
    expect(parsed.meta.paths).toEqual(["true"]);
  });

  it("policy caching: same skill returns same result (P5-F3)", async () => {
    const skill: Skill = {
      name: "cached",
      instructions: "Cached.",
      "allowed-tools": ["Bash(git *)"],
    };

    // Call multiple times on the same object
    const r1 = await evaluateSkillToolPermission(skill, "Bash", { command: "git log" });
    const r2 = await evaluateSkillToolPermission(skill, "Bash", { command: "git push" });
    const r3 = await evaluateSkillToolPermission(skill, "Bash", { command: "rm -rf /" });

    expect(r1.action).toBe("allow");
    expect(r2.action).toBe("allow");
    expect(r3.action).toBe("deny");
  });

  it("loadAllSkills → evaluateSkillToolPermission full chain", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "restricted.md"),
      '---\nname: restricted\nalways: true\nallowed-tools:\n  - "FileRead(*)"\n---\nRestricted skill.',
    );

    const result = await loadAllSkills({ bare: true, additionalDirs: [dir] });
    const skill = result.skills.find((s) => s.name === "restricted");
    expect(skill).toBeDefined();
    expect(skill!["allowed-tools"]).toEqual(["FileRead(*)"]);

    // Permission enforcement on loaded skill
    const allowed = await evaluateSkillToolPermission(skill!, "FileRead", { path: "x" });
    expect(allowed.action).toBe("allow");

    const denied = await evaluateSkillToolPermission(skill!, "Bash", { command: "ls" });
    expect(denied.action).toBe("deny");
  });

  it("multiple skills with independent permission scopes", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "git-skill.md"),
      '---\nname: git-skill\nalways: true\nallowed-tools:\n  - "Bash(git *)"\n---\nGit only.',
    );
    await fsp.writeFile(
      path.join(dir, "read-skill.md"),
      '---\nname: read-skill\nalways: true\nallowed-tools:\n  - "FileRead(*)"\n---\nRead only.',
    );

    const result = await loadAllSkills({ bare: true, additionalDirs: [dir] });
    const gitSkill = result.skills.find((s) => s.name === "git-skill");
    const readSkill = result.skills.find((s) => s.name === "read-skill");
    expect(gitSkill).toBeDefined();
    expect(readSkill).toBeDefined();

    // git-skill allows Bash(git), denies FileRead
    expect(
      (await evaluateSkillToolPermission(gitSkill!, "Bash", { command: "git log" })).action,
    ).toBe("allow");
    expect(
      (await evaluateSkillToolPermission(gitSkill!, "FileRead", { path: "x" })).action,
    ).toBe("deny");

    // read-skill allows FileRead, denies Bash
    expect(
      (await evaluateSkillToolPermission(readSkill!, "FileRead", { path: "x" })).action,
    ).toBe("allow");
    expect(
      (await evaluateSkillToolPermission(readSkill!, "Bash", { command: "git log" })).action,
    ).toBe("deny");
  });

  it("hasOnlySafeProperties on disk-loaded skills", async () => {
    const dir = await createTempDir();

    // Safe skill — no sensitive properties
    await fsp.writeFile(
      path.join(dir, "safe.md"),
      "---\nname: safe-skill\nalways: true\ndescription: Safe\n---\nSafe instructions.",
    );

    // Sensitive skill — has allowed-tools and model
    await fsp.writeFile(
      path.join(dir, "sensitive.md"),
      '---\nname: sensitive-skill\nalways: true\nallowed-tools:\n  - "Bash(git *)"\nmodel: claude-3\n---\nSensitive.',
    );

    const result = await loadAllSkills({ bare: true, additionalDirs: [dir] });
    const safe = result.skills.find((s) => s.name === "safe-skill");
    const sensitive = result.skills.find((s) => s.name === "sensitive-skill");

    expect(safe).toBeDefined();
    expect(sensitive).toBeDefined();
    expect(hasOnlySafeProperties(safe!)).toBe(true);
    expect(hasOnlySafeProperties(sensitive!)).toBe(false);

    const sensitiveProps = getSensitiveProperties(sensitive!);
    expect(sensitiveProps).toContain("allowed-tools");
    expect(sensitiveProps).toContain("model");
  });
});
