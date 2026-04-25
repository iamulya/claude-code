/**
 * Skills — End-to-End Integration Tests.
 *
 * These tests exercise the FULL pipeline from file on disk through to
 * the final system prompt section. Unlike Phase 2/3 unit tests, these
 * verify that the pieces compose correctly:
 *
 *   file on disk → discover → load → parse frontmatter → resolve variables →
 *   execute shell commands → register → buildSection → system prompt
 *
 * Each test starts from a *real* file on disk and verifies the *final output*.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fsp from "fs/promises";
import * as path from "path";
import * as os from "os";

import {
  // Loader
  loadSkill,
  loadSkills,
  deduplicateSkills,
  // Registry
  SkillRegistry,
  buildSkillSection,
  // Shell execution
  resolveSkillVariables,
  executeShellCommandsInPrompt,
  type ShellExecFn,
  // Bundled extraction
  extractBundledSkillFiles,
  cleanupExtractedSkillFiles,
  // Types
  type Skill,
} from "../skills/index.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

let tempDirs: string[] = [];

async function createTempDir(prefix = "yaaf-e2e-"): Promise<string> {
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

/** Mock exec that echoes the command name as output. */
function echoExec(): ShellExecFn & { calls: string[] } {
  const calls: string[] = [];
  const fn = async (command: string) => {
    calls.push(command);
    return { stdout: `[${command}]`, stderr: "", exitCode: 0 };
  };
  fn.calls = calls;
  return fn;
}

// ── E2E: File → Load → Register → BuildSection ──────────────────────────────

describe("E2E: file to system prompt", () => {
  it("flat .md file → loadSkill → register → buildSection produces correct prompt", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "code-review.md"),
      `---
name: code-review
description: Review code for security issues
always: true
allowed-tools:
  - "Bash(git *)"
  - "FileRead(*)"
---
## Code Review Checklist

1. Check for SQL injection
2. Check for XSS
3. Review authentication logic`,
    );

    // 1. Load from disk
    const skill = await loadSkill(path.join(dir, "code-review.md"), { source: "project" });

    // 2. Verify parsed fields survived through the pipeline
    expect(skill.name).toBe("code-review");
    expect(skill.description).toBe("Review code for security issues");
    expect(skill.always).toBe(true);
    expect(skill["allowed-tools"]).toEqual(["Bash(git *)", "FileRead(*)"]);
    expect(skill.source).toBe("project");
    expect(skill.instructions).toContain("SQL injection");

    // 3. Register and build section
    const registry = new SkillRegistry();
    registry.register(skill);
    const section = registry.buildSection();

    // 4. Verify the FINAL output — the system prompt text
    expect(section).toContain("# Active Skills");
    expect(section).toContain("## Skill: code-review — Review code for security issues");
    expect(section).toContain("Check for SQL injection");
    expect(section).toContain("Review authentication logic");
  });

  it("directory-format skill → loadSkill → register → buildSection with sibling files accessible", async () => {
    const dir = await createTempDir();
    const skillDir = path.join(dir, "deploy");
    await fsp.mkdir(skillDir);

    // SKILL.md with frontmatter
    await fsp.writeFile(
      path.join(skillDir, "SKILL.md"),
      `---
name: deploy
description: Deploy to production
context: fork
model: claude-sonnet-4-20250514
---
Follow the deployment procedure.
Reference files are available in the skill directory.`,
    );

    // Sibling files
    await fsp.writeFile(
      path.join(skillDir, "deploy.sh"),
      "#!/bin/bash\ndocker push $IMAGE",
    );
    await fsp.writeFile(
      path.join(skillDir, "config.yaml"),
      "environment: production\nreplicas: 3",
    );
    await fsp.writeFile(path.join(skillDir, ".internal"), "should be excluded");

    // Load
    const skill = await loadSkill(path.join(skillDir, "SKILL.md"), { skillDir });

    // Verify metadata + sibling files
    expect(skill.name).toBe("deploy");
    expect(skill.context).toBe("fork");
    expect(skill.model).toBe("claude-sonnet-4-20250514");
    expect(skill.skillDir).toBe(skillDir);
    expect(skill.files).toBeDefined();
    expect(Object.keys(skill.files!)).toContain("deploy.sh");
    expect(Object.keys(skill.files!)).toContain("config.yaml");
    expect(Object.keys(skill.files!)).not.toContain(".internal");
    expect(Object.keys(skill.files!)).not.toContain("SKILL.md");

    // Register and build
    const registry = new SkillRegistry();
    registry.register(skill);
    const section = registry.buildSection();

    expect(section).toContain("## Skill: deploy — Deploy to production");
    expect(section).toContain("Follow the deployment procedure.");
  });

  it("loadSkills → register all → buildSection only shows always-on skills", async () => {
    const dir = await createTempDir();

    await fsp.writeFile(
      path.join(dir, "always-on.md"),
      "---\nname: always-on\nalways: true\n---\nAlways instructions.",
    );
    await fsp.writeFile(
      path.join(dir, "opt-in.md"),
      "---\nname: opt-in\nalways: false\n---\nOpt-in instructions.",
    );
    await fsp.writeFile(
      path.join(dir, "no-frontmatter.md"),
      "No frontmatter — defaults to always: true",
    );

    // Load all
    const skills = await loadSkills(dir, "project");
    expect(skills).toHaveLength(3);

    // Register all
    const registry = new SkillRegistry();
    for (const s of skills) registry.register(s);

    // Build section — only always-on should appear
    const section = registry.buildSection();
    expect(section).toContain("always-on");
    expect(section).toContain("No frontmatter"); // defaults to always: true
    expect(section).not.toContain("Opt-in instructions");

    // Force opt-in skill
    const sectionWithForce = registry.buildSection(["opt-in"]);
    expect(sectionWithForce).toContain("Opt-in instructions");
  });
});

// ── E2E: Variable Substitution + Shell Execution ─────────────────────────────

describe("E2E: variable substitution → shell execution", () => {
  it("${SKILL_DIR} resolved BEFORE shell commands execute", async () => {
    const dir = await createTempDir();
    const skillDir = path.join(dir, "my-skill");
    await fsp.mkdir(skillDir);

    // Create a file that the shell command will reference
    await fsp.writeFile(path.join(skillDir, "version.txt"), "v2.5.0");

    // Skill with ${SKILL_DIR} in a shell command
    const rawInstructions = "Current version: !" + "`" + "cat ${SKILL_DIR}/version.txt" + "`";

    // Step 1: Variable substitution
    const resolved = resolveSkillVariables(rawInstructions, skillDir);
    expect(resolved).toBe("Current version: !" + "`" + "cat " + skillDir + "/version.txt" + "`");

    // Step 2: Shell execution with real commands
    const result = await executeShellCommandsInPrompt(resolved, {
      exec: async (cmd) => {
        // Simulate: cat reads the file
        if (cmd.startsWith("cat ")) {
          const filePath = cmd.slice(4);
          const content = await fsp.readFile(filePath, "utf8");
          return { stdout: content, stderr: "", exitCode: 0 };
        }
        return { stdout: "", stderr: "unknown command", exitCode: 1 };
      },
    });

    expect(result).toBe("Current version: v2.5.0");
  });

  it("full pipeline: load skill with shell commands → resolve → execute → register → section", async () => {
    const dir = await createTempDir();

    await fsp.writeFile(
      path.join(dir, "dynamic-skill.md"),
      "---\nname: dynamic-info\nalways: true\n---\nSystem info: !" + "`" + "echo Linux x86_64" + "`" + "\n\nFollow these instructions based on the above.",
    );

    // Load
    const skill = await loadSkill(path.join(dir, "dynamic-skill.md"));
    expect(skill.instructions).toContain("!" + "`" + "echo Linux x86_64" + "`");

    // Resolve variables (no ${SKILL_DIR} in this case, but pipeline must be called)
    const resolved = resolveSkillVariables(skill.instructions, skill.skillDir ?? dir);

    // Execute shell commands
    const exec = echoExec();
    const executed = await executeShellCommandsInPrompt(resolved, { exec });
    expect(executed).toContain("[echo Linux x86_64]"); // mock output
    expect(executed).not.toContain("!" + "`"); // shell markers removed

    // Create a new skill with processed instructions for registration
    const processedSkill: Skill = { ...skill, instructions: executed };

    // Register and build section
    const registry = new SkillRegistry();
    registry.register(processedSkill);
    const section = registry.buildSection();

    // Final output should contain the shell output, NOT the raw command
    expect(section).toContain("[echo Linux x86_64]");
    expect(section).not.toContain("!`echo");
    expect(section).toContain("Follow these instructions");
  });
});

// ── E2E: Bundled Extraction + Variable + Shell ───────────────────────────────

describe("E2E: bundled extraction → variable substitution → shell execution", () => {
  it("extract bundled files → resolve ${SKILL_DIR} → execute shell command referencing extracted file", async () => {
    // Simulate a bundled skill with packed files
    const files = {
      "checklist.txt": "- Item 1\n- Item 2\n- Item 3",
      "scripts/validate.sh": "#!/bin/bash\necho 'validation passed'",
    };

    // Step 1: Extract to temp directory
    const extractedDir = await extractBundledSkillFiles("review-skill", files);
    tempDirs.push(extractedDir);

    // Step 2: Resolve skill variables
    const rawInstructions = "Checklist:\n!" + "`" + "cat ${SKILL_DIR}/checklist.txt" + "`" + "\n\nRun validation.";
    const resolved = resolveSkillVariables(rawInstructions, extractedDir);
    expect(resolved).toContain(extractedDir);
    expect(resolved).not.toContain("${SKILL_DIR}");

    // Step 3: Execute shell commands (using a real-ish exec)
    const result = await executeShellCommandsInPrompt(resolved, {
      exec: async (cmd) => {
        if (cmd.startsWith("cat ")) {
          const filePath = cmd.slice(4);
          const content = await fsp.readFile(filePath, "utf8");
          return { stdout: content, stderr: "", exitCode: 0 };
        }
        return { stdout: "", stderr: "unknown", exitCode: 1 };
      },
    });

    // The extracted file content should be inlined
    expect(result).toContain("- Item 1");
    expect(result).toContain("- Item 2");
    expect(result).toContain("- Item 3");
    expect(result).toContain("Run validation.");
    expect(result).not.toContain("!`");

    // Step 4: Cleanup
    await cleanupExtractedSkillFiles(extractedDir);
    await expect(fsp.access(extractedDir)).rejects.toThrow();
  });
});

// ── E2E: allowed-tools Survives Full Pipeline ────────────────────────────────

describe("E2E: allowed-tools field preservation", () => {
  it("allowed-tools from file → loadSkill → register → accessible on retrieved skill", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "restricted.md"),
      `---
name: restricted-skill
description: Only git and file reads
always: true
allowed-tools:
  - "Bash(git *)"
  - "FileRead(*)"
  - "Write(*.md)"
---
Only use the allowed tools above.`,
    );

    const skill = await loadSkill(path.join(dir, "restricted.md"));

    const registry = new SkillRegistry();
    registry.register(skill);

    // Retrieve the skill and check allowed-tools is there
    const retrieved = registry.get("restricted-skill");
    expect(retrieved).toBeDefined();
    expect(retrieved!["allowed-tools"]).toEqual([
      "Bash(git *)",
      "FileRead(*)",
      "Write(*.md)",
    ]);

    // Verify the allowed-tools can be used for permission checking
    const allowedTools = retrieved!["allowed-tools"]!;
    expect(allowedTools.some((t) => t.startsWith("Bash("))).toBe(true);
    expect(allowedTools.some((t) => t.startsWith("FileRead("))).toBe(true);
    expect(allowedTools.some((t) => t.startsWith("Write("))).toBe(true);
    expect(allowedTools.some((t) => t.startsWith("Delete("))).toBe(false);
  });

  it("all Claude Code parity fields survive load → register → get", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "full-parity.md"),
      `---
name: full-parity
description: All fields present
always: false
context: fork
model: claude-sonnet-4-20250514
effort: high
when_to_use: When the user asks about security
argument-hint: scope of the review
shell: bash
user-invocable: false
disable-model-invocation: true
allowed-tools:
  - "Bash(*)"
paths:
  - "src/**/*.ts"
arguments:
  - environment
  - region
tags: [security, review]
---
Full parity instructions.`,
    );

    const skill = await loadSkill(path.join(dir, "full-parity.md"));
    const registry = new SkillRegistry();
    registry.register(skill);
    const retrieved = registry.get("full-parity")!;

    // Every field must survive the full pipeline
    expect(retrieved.name).toBe("full-parity");
    expect(retrieved.description).toBe("All fields present");
    expect(retrieved.always).toBe(false);
    expect(retrieved.context).toBe("fork");
    expect(retrieved.model).toBe("claude-sonnet-4-20250514");
    expect(retrieved.effort).toBe("high");
    expect(retrieved.when_to_use).toBe("When the user asks about security");
    expect(retrieved["argument-hint"]).toBe("scope of the review");
    expect(retrieved.shell).toBe("bash");
    expect(retrieved["user-invocable"]).toBe(false);
    expect(retrieved["disable-model-invocation"]).toBe(true);
    expect(retrieved["allowed-tools"]).toEqual(["Bash(*)"]);
    expect(retrieved.paths).toEqual(["src/**/*.ts"]);
    expect(retrieved.arguments).toEqual(["environment", "region"]);
    expect(retrieved.tags).toEqual(["security", "review"]);
    expect(retrieved.instructions).toBe("Full parity instructions.");
    expect(retrieved.source).toBe("project");
  });
});

// ── E2E: Deduplication Across Sources ────────────────────────────────────────

describe("E2E: deduplication across sources", () => {
  it("same skill in user and project dirs → first source wins after dedup", async () => {
    const userDir = await createTempDir("user-skills-");
    const projectDir = await createTempDir("project-skills-");

    // Same name, different content — user version should win (loaded first)
    await fsp.writeFile(
      path.join(userDir, "review.md"),
      "---\nname: review\n---\nUser version of review.",
    );
    await fsp.writeFile(
      path.join(projectDir, "review.md"),
      "---\nname: review\n---\nProject version of review.",
    );

    // Load both (user first = higher priority)
    const userSkills = await loadSkills(userDir, "user");
    const projectSkills = await loadSkills(projectDir, "project");

    // Dedupe — same name from different paths → first wins (user)
    const all = await deduplicateSkills([...userSkills, ...projectSkills]);
    expect(all).toHaveLength(1);
    expect(all[0]!.instructions).toBe("User version of review.");
    expect(all[0]!.source).toBe("user");

    // Inline skills also dedup by name — same behavior
    const inlineSkills: Skill[] = [
      { name: "review", instructions: "User version", source: "user" },
      { name: "review", instructions: "Project version", source: "project" },
    ];
    const deduped = await deduplicateSkills(inlineSkills);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.instructions).toBe("User version"); // first wins
    expect(deduped[0]!.source).toBe("user");
  });
});

// ── E2E: Plugin Skills Cannot Execute Shell ──────────────────────────────────

describe("E2E: plugin skill shell isolation", () => {
  it("plugin-registered skill with shell commands → commands stay as raw text in section", async () => {
    // A plugin contributes a skill with shell markers
    const pluginSkill: Skill = {
      name: "plugin-skill",
      instructions: "Run this: !`rm -rf /` to clean up.",
      always: true,
      source: "plugin",
    };

    // Pipeline: executeShellCommandsInPrompt should be a no-op for plugin source
    const exec = echoExec();
    const processed = await executeShellCommandsInPrompt(pluginSkill.instructions, {
      exec,
      skillSource: pluginSkill.source,
    });

    // Verify: no commands were executed
    expect(exec.calls).toHaveLength(0);
    // The raw text is returned unchanged — shell markers are still there
    expect(processed).toContain("!`rm -rf /`");

    // Register processed skill — the markers are inert in the prompt
    const registry = new SkillRegistry();
    registry.register({ ...pluginSkill, instructions: processed });
    const section = registry.buildSection();

    // The section contains the raw marker text but no commands were run
    expect(section).toContain("!`rm -rf /`");
  });

  it("same skill content executes when source is project, not when plugin", async () => {
    const instructions = "Version: !`echo v1.0`";
    const exec1 = echoExec();
    const exec2 = echoExec();

    // Project source: executes
    const projectResult = await executeShellCommandsInPrompt(instructions, {
      exec: exec1,
      skillSource: "project",
    });
    expect(exec1.calls).toEqual(["echo v1.0"]);
    expect(projectResult).toContain("[echo v1.0]");

    // Plugin source: does NOT execute
    const pluginResult = await executeShellCommandsInPrompt(instructions, {
      exec: exec2,
      skillSource: "plugin",
    });
    expect(exec2.calls).toHaveLength(0);
    expect(pluginResult).toBe(instructions); // unchanged
  });
});

// ── E2E: Registry loadDir → Full Pipeline ────────────────────────────────────

describe("E2E: registry loadDir integration", () => {
  it("registry.loadDir → skills available → buildSection correct", async () => {
    const dir = await createTempDir();

    await fsp.writeFile(
      path.join(dir, "skill-a.md"),
      "---\nname: alpha\ndescription: First skill\nalways: true\n---\nAlpha instructions.",
    );
    await fsp.writeFile(
      path.join(dir, "skill-b.md"),
      "---\nname: beta\ndescription: Second skill\nalways: true\n---\nBeta instructions.",
    );

    const registry = new SkillRegistry();
    await registry.loadDir(dir);

    expect(registry.size).toBe(2);
    expect(registry.get("alpha")).toBeDefined();
    expect(registry.get("beta")).toBeDefined();

    const section = registry.buildSection();
    expect(section).toContain("## Skill: alpha — First skill");
    expect(section).toContain("## Skill: beta — Second skill");
    expect(section).toContain("Alpha instructions.");
    expect(section).toContain("Beta instructions.");
  });

  it("registry.loadDir + registerDynamic → both appear in section", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "from-disk.md"),
      "---\nname: from-disk\nalways: true\n---\nDisk skill.",
    );

    const registry = new SkillRegistry();
    await registry.loadDir(dir);

    // Add a dynamic skill at runtime
    registry.registerDynamic("---\nname: runtime-skill\nalways: true\n---\nDynamic skill.");

    const section = registry.buildSection();
    expect(section).toContain("from-disk");
    expect(section).toContain("Disk skill.");
    expect(section).toContain("runtime-skill");
    expect(section).toContain("Dynamic skill.");
  });
});
