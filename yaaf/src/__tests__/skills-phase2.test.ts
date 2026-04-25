/**
 * Skills — Phase 2 tests.
 *
 * Tests for the restructured skills subsystem:
 * - types.ts — type safety (compile-time, tested via usage)
 * - frontmatter.ts — YAML parsing, auto-quoting, edge cases
 * - loader.ts — flat/directory discovery, loading, deduplication
 * - registry.ts — register, unregister, dynamic, buildSection
 * - index.ts — backward compatibility (re-exports match old API)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fsp from "fs/promises";
import * as path from "path";
import * as os from "os";

import {
  // Frontmatter
  parseFrontmatter,
  buildSkillFromParsed,
  MAX_SKILL_BYTES,
  // Loader
  loadSkills,
  loadSkill,
  defineSkill,
  discoverSkillEntries,
  deduplicateSkills,
  // Registry
  SkillRegistry,
  buildSkillSection,
  // Types
  type Skill,
  type SkillFrontmatter,
  type SkillSource,
  type SkillEntry,
} from "../skills/index.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

let tempDirs: string[] = [];

async function createTempDir(prefix = "yaaf-skill-test-"): Promise<string> {
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

// ── parseFrontmatter ─────────────────────────────────────────────────────────

describe("parseFrontmatter", () => {
  it("parses basic frontmatter fields", () => {
    const content = `---
name: my-skill
description: A test skill
version: 1.0.0
always: true
tags: coding, review, test
---
# Instructions

Do the thing.`;

    const { meta, body } = parseFrontmatter(content);
    expect(meta.name).toBe("my-skill");
    expect(meta.description).toBe("A test skill");
    expect(meta.version).toBe("1.0.0");
    expect(meta.always).toBe(true);
    expect(meta.tags).toEqual(["coding", "review", "test"]);
    expect(body).toBe("# Instructions\n\nDo the thing.");
  });

  it("parses Claude Code parity fields", () => {
    const content = `---
name: security-review
when_to_use: When the user asks for a security review
argument-hint: describe the review scope
context: fork
model: claude-sonnet-4-20250514
effort: high
agent: security-agent
user-invocable: true
disable-model-invocation: false
shell: bash
---
Review all code changes.`;

    const { meta } = parseFrontmatter(content);
    expect(meta.name).toBe("security-review");
    expect(meta.when_to_use).toBe("When the user asks for a security review");
    expect(meta["argument-hint"]).toBe("describe the review scope");
    expect(meta.context).toBe("fork");
    expect(meta.model).toBe("claude-sonnet-4-20250514");
    expect(meta.effort).toBe("high");
    expect(meta.agent).toBe("security-agent");
    expect(meta["user-invocable"]).toBe(true);
    expect(meta["disable-model-invocation"]).toBe(false);
    expect(meta.shell).toBe("bash");
  });

  it("parses block array syntax (allowed-tools)", () => {
    const content = `---
name: restricted-skill
allowed-tools:
  - "Bash(git *)"
  - "FileRead(*)"
  - "Write(*)"
---
Instructions here.`;

    const { meta } = parseFrontmatter(content);
    expect(meta["allowed-tools"]).toEqual(["Bash(git *)", "FileRead(*)", "Write(*)"]);
  });

  it("parses flow array syntax [a, b, c]", () => {
    const content = `---
name: tagged-skill
tags: [coding, review, security]
---
Body.`;

    const { meta } = parseFrontmatter(content);
    expect(meta.tags).toEqual(["coding", "review", "security"]);
  });

  it("parses paths with glob patterns", () => {
    const content = `---
name: ts-only
paths:
  - "src/**/*.ts"
  - "tests/**"
---
TypeScript only skill.`;

    const { meta } = parseFrontmatter(content);
    expect(meta.paths).toEqual(["src/**/*.ts", "tests/**"]);
  });

  it("parses arguments list", () => {
    const content = `---
name: deploy
arguments:
  - environment
  - version
  - dry-run
---
Deploy instructions.`;

    const { meta } = parseFrontmatter(content);
    expect(meta.arguments).toEqual(["environment", "version", "dry-run"]);
  });

  it("handles content with no frontmatter", () => {
    const content = "Just some markdown content.";
    const { meta, body } = parseFrontmatter(content);
    expect(meta).toEqual({});
    expect(body).toBe("Just some markdown content.");
  });

  it("handles empty frontmatter", () => {
    const content = `---
---
Body content.`;

    const { meta, body } = parseFrontmatter(content);
    expect(meta).toEqual({});
    expect(body).toBe("Body content.");
  });

  it("handles always: false", () => {
    const content = `---
name: optional-skill
always: false
---
Body.`;

    const { meta } = parseFrontmatter(content);
    expect(meta.always).toBe(false);
  });

  it("auto-quotes values with special YAML characters", () => {
    const content = `---
name: colon-value
description: Fix issues with: colons and {braces}
---
Body.`;

    const { meta } = parseFrontmatter(content);
    expect(meta.description).toBe("Fix issues with: colons and {braces}");
  });

  it("handles quoted string values", () => {
    const content = `---
name: "quoted-name"
description: 'single quoted'
---
Body.`;

    const { meta } = parseFrontmatter(content);
    expect(meta.name).toBe("quoted-name");
    expect(meta.description).toBe("single quoted");
  });

  it("ignores unknown fields gracefully", () => {
    const content = `---
name: test
unknown_field: some value
another_thing: true
---
Body.`;

    const { meta } = parseFrontmatter(content);
    expect(meta.name).toBe("test");
    // Unknown fields are just ignored (not merged into meta)
  });

  it("handles BOM in content", () => {
    const content = `\uFEFF---
name: bom-skill
---
Body.`;

    const { meta } = parseFrontmatter(content);
    expect(meta.name).toBe("bom-skill");
  });

  it("ignores YAML comments", () => {
    const content = `---
name: commented
# This is a comment
description: test
---
Body.`;

    const { meta } = parseFrontmatter(content);
    expect(meta.name).toBe("commented");
    expect(meta.description).toBe("test");
  });

  it("coerces numeric version to string", () => {
    const content = `---\nname: versioned\nversion: 1.0\n---\nBody.`;
    const { meta } = parseFrontmatter(content);
    // version: 1.0 is parsed as number 1 by YAML,
    // but mapToFrontmatter must coerce it to string
    expect(meta.version).toBe("1");
  });

  it("disable-model-invocation: true is parsed correctly", () => {
    const content = `---\nname: no-model\ndisable-model-invocation: true\n---\nBody.`;
    const { meta } = parseFrontmatter(content);
    expect(meta["disable-model-invocation"]).toBe(true);
  });

  it("user-invocable: false is parsed correctly", () => {
    const content = `---\nname: hidden\nuser-invocable: false\n---\nBody.`;
    const { meta } = parseFrontmatter(content);
    expect(meta["user-invocable"]).toBe(false);
  });

  it("invalid enum values are ignored", () => {
    const content = `---\nname: bad-enums\neffort: ultra\ncontext: parallel\nshell: fish\n---\nBody.`;
    const { meta } = parseFrontmatter(content);
    expect(meta.effort).toBeUndefined();
    expect(meta.context).toBeUndefined();
    expect(meta.shell).toBeUndefined();
  });

  it("--- in body does NOT get treated as frontmatter delimiter", () => {
    const content = `---\nname: safe\n---\nSome text.\n\n---\n\nMore text after horizontal rule.`;
    const { meta, body } = parseFrontmatter(content);
    expect(meta.name).toBe("safe");
    expect(body).toContain("Some text.");
    expect(body).toContain("More text after horizontal rule.");
  });

  it("always: 0 is parsed as false (F9)", () => {
    const content = `---\nname: zero\nalways: 0\n---\nBody.`;
    const { meta } = parseFrontmatter(content);
    expect(meta.always).toBe(false);
  });
});

// ── buildSkillFromParsed ─────────────────────────────────────────────────────

describe("buildSkillFromParsed", () => {
  it("builds a complete Skill from parsed frontmatter", () => {
    const parsed = parseFrontmatter(`---
name: deploy
description: Deploy to production
context: fork
---
Run the deploy.`);

    const skill = buildSkillFromParsed(parsed, {
      filePath: "/project/.yaaf/skills/deploy.md",
      skillDir: "/project/.yaaf/skills",
      source: "project",
    });

    expect(skill.name).toBe("deploy");
    expect(skill.description).toBe("Deploy to production");
    expect(skill.context).toBe("fork");
    expect(skill.instructions).toBe("Run the deploy.");
    expect(skill.filePath).toBe("/project/.yaaf/skills/deploy.md");
    expect(skill.source).toBe("project");
  });

  it("derives name from defaultName when not in frontmatter", () => {
    const parsed = parseFrontmatter("No frontmatter here.");
    const skill = buildSkillFromParsed(parsed, {
      source: "user",
      defaultName: "fallback-name",
    });
    expect(skill.name).toBe("fallback-name");
  });

  it("truncates oversized instructions", () => {
    const largeBody = "x".repeat(MAX_SKILL_BYTES + 1000);
    const parsed = { meta: { name: "big" }, body: largeBody };
    const skill = buildSkillFromParsed(parsed, { source: "inline" });
    expect(skill.instructions.length).toBeLessThan(largeBody.length);
    expect(skill.instructions).toContain("[...skill truncated");
  });

  it("defaults always to true", () => {
    const parsed = parseFrontmatter(`---\nname: test\n---\nBody.`);
    const skill = buildSkillFromParsed(parsed, { source: "inline" });
    expect(skill.always).toBe(true);
  });

  it("preserves ALL frontmatter fields through the spread", () => {
    const parsed = parseFrontmatter(`---\nname: full\ndescription: Full skill\ncontext: fork\nmodel: gpt-4\neffort: high\nwhen_to_use: Always\nargument-hint: args here\nshell: bash\nuser-invocable: false\ndisable-model-invocation: true\nallowed-tools:\n  - "Bash(*)"\npaths:\n  - "src/**"\narguments:\n  - env\n  - region\n---\nInstructions.`);
    const skill = buildSkillFromParsed(parsed, { source: "project" });

    expect(skill.name).toBe("full");
    expect(skill.description).toBe("Full skill");
    expect(skill.context).toBe("fork");
    expect(skill.model).toBe("gpt-4");
    expect(skill.effort).toBe("high");
    expect(skill.when_to_use).toBe("Always");
    expect(skill["argument-hint"]).toBe("args here");
    expect(skill.shell).toBe("bash");
    expect(skill["user-invocable"]).toBe(false);
    expect(skill["disable-model-invocation"]).toBe(true);
    expect(skill["allowed-tools"]).toEqual(["Bash(*)"]);
    expect(skill.paths).toEqual(["src/**"]);
    expect(skill.arguments).toEqual(["env", "region"]);
    expect(skill.source).toBe("project");
  });
});

// ── discoverSkillEntries ─────────────────────────────────────────────────────

describe("discoverSkillEntries", () => {
  it("discovers flat .md files", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(path.join(dir, "review.md"), "# Review skill");
    await fsp.writeFile(path.join(dir, "deploy.md"), "# Deploy skill");
    await fsp.writeFile(path.join(dir, "readme.txt"), "not a skill");

    const entries = await discoverSkillEntries(dir);
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.format === "flat")).toBe(true);
    const names = entries.map((e) => path.basename(e.path));
    expect(names).toContain("review.md");
    expect(names).toContain("deploy.md");
  });

  it("discovers directory-format skills (SKILL.md)", async () => {
    const dir = await createTempDir();
    const skillDir = path.join(dir, "my-skill");
    await fsp.mkdir(skillDir);
    await fsp.writeFile(path.join(skillDir, "SKILL.md"), "# Skill");
    await fsp.writeFile(path.join(skillDir, "helper.sh"), "echo hello");

    const entries = await discoverSkillEntries(dir);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.format).toBe("directory");
    expect(entries[0]!.skillDir).toBe(skillDir);
  });

  it("skips directories without SKILL.md", async () => {
    const dir = await createTempDir();
    const noSkill = path.join(dir, "no-skill");
    await fsp.mkdir(noSkill);
    await fsp.writeFile(path.join(noSkill, "README.md"), "Not a skill");

    const entries = await discoverSkillEntries(dir);
    expect(entries).toHaveLength(0);
  });

  it("skips hidden files and directories", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(path.join(dir, ".hidden.md"), "hidden");
    await fsp.writeFile(path.join(dir, "_internal.md"), "internal");
    await fsp.writeFile(path.join(dir, "visible.md"), "visible");

    const entries = await discoverSkillEntries(dir);
    expect(entries).toHaveLength(1);
    expect(path.basename(entries[0]!.path)).toBe("visible.md");
  });

  it("supports .mdx files", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(path.join(dir, "react-skill.mdx"), "# React");

    const entries = await discoverSkillEntries(dir);
    expect(entries).toHaveLength(1);
  });

  it("returns empty array for non-existent directory", async () => {
    const entries = await discoverSkillEntries("/nonexistent/path");
    expect(entries).toHaveLength(0);
  });
});

// ── loadSkill ────────────────────────────────────────────────────────────────

describe("loadSkill", () => {
  it("loads a flat skill file", async () => {
    const dir = await createTempDir();
    const filePath = path.join(dir, "review.md");
    await fsp.writeFile(
      filePath,
      `---
name: code-review
description: Review code changes
always: true
---
Check for security issues.`,
    );

    const skill = await loadSkill(filePath);
    expect(skill.name).toBe("code-review");
    expect(skill.description).toBe("Review code changes");
    expect(skill.instructions).toBe("Check for security issues.");
    expect(skill.source).toBe("project");
  });

  it("loads a directory-format skill with sibling files", async () => {
    const dir = await createTempDir();
    const skillDir = path.join(dir, "deploy");
    await fsp.mkdir(skillDir);
    await fsp.writeFile(
      path.join(skillDir, "SKILL.md"),
      `---
name: deploy
---
Deploy using the script.`,
    );
    await fsp.writeFile(path.join(skillDir, "deploy.sh"), "#!/bin/bash\necho deploy");
    await fsp.writeFile(path.join(skillDir, "config.yaml"), "env: prod");

    const skill = await loadSkill(path.join(skillDir, "SKILL.md"), { skillDir });
    expect(skill.name).toBe("deploy");
    expect(skill.files).toBeDefined();
    expect(Object.keys(skill.files!)).toContain("deploy.sh");
    expect(Object.keys(skill.files!)).toContain("config.yaml");
    expect(skill.files!["deploy.sh"]).toContain("echo deploy");
  });

  it("derives name from directory name for SKILL.md format", async () => {
    const dir = await createTempDir();
    const skillDir = path.join(dir, "my-awesome-skill");
    await fsp.mkdir(skillDir);
    await fsp.writeFile(path.join(skillDir, "SKILL.md"), "No frontmatter.");

    const skill = await loadSkill(path.join(skillDir, "SKILL.md"));
    expect(skill.name).toBe("my-awesome-skill");
  });

  it("derives name from filename for flat file without name in frontmatter", async () => {
    const dir = await createTempDir();
    const filePath = path.join(dir, "my-cool-skill.md");
    await fsp.writeFile(filePath, "Just body, no frontmatter.");

    const skill = await loadSkill(filePath);
    expect(skill.name).toBe("my-cool-skill");
  });

  it("sibling files exclude SKILL.md and hidden files", async () => {
    const dir = await createTempDir();
    const skillDir = path.join(dir, "test-skill");
    await fsp.mkdir(skillDir);
    await fsp.writeFile(path.join(skillDir, "SKILL.md"), "---\nname: test\n---\nBody.");
    await fsp.writeFile(path.join(skillDir, "helper.sh"), "echo hi");
    await fsp.writeFile(path.join(skillDir, ".hidden"), "secret");

    const skill = await loadSkill(path.join(skillDir, "SKILL.md"), { skillDir });
    expect(skill.files).toBeDefined();
    const fileNames = Object.keys(skill.files!);
    expect(fileNames).toContain("helper.sh");
    expect(fileNames).not.toContain("SKILL.md");
    expect(fileNames).not.toContain(".hidden");
  });

  it("respects source override", async () => {
    const dir = await createTempDir();
    const filePath = path.join(dir, "test.md");
    await fsp.writeFile(filePath, "---\nname: test\n---\nBody.");

    const skill = await loadSkill(filePath, { source: "user" });
    expect(skill.source).toBe("user");
  });
});

// ── loadSkills ───────────────────────────────────────────────────────────────

describe("loadSkills", () => {
  it("loads all skills from a directory", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "skill-a.md"),
      "---\nname: alpha\n---\nAlpha instructions.",
    );
    await fsp.writeFile(
      path.join(dir, "skill-b.md"),
      "---\nname: beta\n---\nBeta instructions.",
    );

    const skills = await loadSkills(dir);
    expect(skills).toHaveLength(2);
    const names = skills.map((s) => s.name);
    expect(names).toContain("alpha");
    expect(names).toContain("beta");
  });

  it("loads mixed flat and directory skills", async () => {
    const dir = await createTempDir();
    // Flat
    await fsp.writeFile(
      path.join(dir, "flat.md"),
      "---\nname: flat-skill\n---\nFlat.",
    );
    // Directory
    const skillDir = path.join(dir, "dir-skill");
    await fsp.mkdir(skillDir);
    await fsp.writeFile(
      path.join(skillDir, "SKILL.md"),
      "---\nname: dir-skill\n---\nDirectory.",
    );

    const skills = await loadSkills(dir);
    expect(skills).toHaveLength(2);
    expect(skills.map((s) => s.name)).toContain("flat-skill");
    expect(skills.map((s) => s.name)).toContain("dir-skill");
  });

  it("returns empty array for non-existent directory", async () => {
    const skills = await loadSkills("/nonexistent/path");
    expect(skills).toHaveLength(0);
  });

  it("tags skills with the specified source", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(path.join(dir, "s.md"), "---\nname: s\n---\nBody.");

    const skills = await loadSkills(dir, "managed");
    expect(skills[0]!.source).toBe("managed");
  });
});

// ── defineSkill ──────────────────────────────────────────────────────────────

describe("defineSkill", () => {
  it("creates an inline skill with defaults", () => {
    const skill = defineSkill({
      name: "inline-test",
      instructions: "Do this and that.",
    });
    expect(skill.name).toBe("inline-test");
    expect(skill.source).toBe("inline");
    expect(skill.always).toBe(true);
    expect(skill.instructions).toBe("Do this and that.");
  });

  it("allows overriding always", () => {
    const skill = defineSkill({
      name: "optional",
      instructions: "Optional.",
      always: false,
    });
    expect(skill.always).toBe(false);
  });

  it("allows overriding source", () => {
    const skill = defineSkill({
      name: "custom-source",
      instructions: "Body.",
      source: "bundled",
    });
    expect(skill.source).toBe("bundled");
  });
});

// ── deduplicateSkills ────────────────────────────────────────────────────────

describe("deduplicateSkills", () => {
  it("deduplicates by file path", async () => {
    const dir = await createTempDir();
    const filePath = path.join(dir, "skill.md");
    await fsp.writeFile(filePath, "content");

    const skills: Skill[] = [
      { name: "a", instructions: "v1", filePath, source: "project" },
      { name: "b", instructions: "v2", filePath, source: "user" },
    ];

    const deduped = await deduplicateSkills(skills);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.name).toBe("a"); // first wins
  });

  it("deduplicates non-file skills by name", async () => {
    const skills: Skill[] = [
      { name: "my-skill", instructions: "v1", source: "inline" },
      { name: "my-skill", instructions: "v2", source: "dynamic" },
    ];

    const deduped = await deduplicateSkills(skills);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.instructions).toBe("v1"); // first wins
  });

  it("keeps skills with different paths", async () => {
    const dir = await createTempDir();
    const pathA = path.join(dir, "a.md");
    const pathB = path.join(dir, "b.md");
    await fsp.writeFile(pathA, "a");
    await fsp.writeFile(pathB, "b");

    const skills: Skill[] = [
      { name: "a", instructions: "A", filePath: pathA, source: "project" },
      { name: "b", instructions: "B", filePath: pathB, source: "project" },
    ];

    const deduped = await deduplicateSkills(skills);
    expect(deduped).toHaveLength(2);
  });
});

// ── SkillRegistry ────────────────────────────────────────────────────────────

describe("SkillRegistry", () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry();
  });

  it("register and get", () => {
    const skill: Skill = { name: "test", instructions: "Do thing.", source: "inline" };
    registry.register(skill);
    expect(registry.get("test")).toBe(skill);
    expect(registry.size).toBe(1);
  });

  it("unregister", () => {
    registry.register({ name: "test", instructions: "X", source: "inline" });
    expect(registry.unregister("test")).toBe(true);
    expect(registry.get("test")).toBeUndefined();
    expect(registry.unregister("nonexistent")).toBe(false);
  });

  it("list returns all skills", () => {
    registry.register({ name: "a", instructions: "A", source: "inline" });
    registry.register({ name: "b", instructions: "B", source: "inline" });
    expect(registry.list()).toHaveLength(2);
  });

  it("loadDir loads from filesystem", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "loaded.md"),
      "---\nname: loaded\n---\nLoaded body.",
    );

    await registry.loadDir(dir);
    expect(registry.get("loaded")).toBeDefined();
    expect(registry.get("loaded")!.instructions).toBe("Loaded body.");
  });

  it("registerDynamic creates skill from markdown", () => {
    const skill = registry.registerDynamic(`---
name: dynamic-skill
description: Created at runtime
---
Dynamic instructions.`);

    expect(skill.name).toBe("dynamic-skill");
    expect(skill.source).toBe("dynamic");
    expect(registry.get("dynamic-skill")).toBe(skill);
  });

  it("fires onLoad and onRemove events", () => {
    const loaded: string[] = [];
    const removed: string[] = [];
    const reg = new SkillRegistry({
      onLoad: (s) => loaded.push(s.name),
      onRemove: (n) => removed.push(n),
    });

    reg.register({ name: "evt", instructions: "X", source: "inline" });
    expect(loaded).toEqual(["evt"]);

    reg.unregister("evt");
    expect(removed).toEqual(["evt"]);
  });

  it("buildSection generates prompt injection", () => {
    registry.register({
      name: "active-skill",
      description: "Does things",
      always: true,
      instructions: "Follow these instructions.",
      source: "inline",
    });

    const section = registry.buildSection();
    expect(section).toContain("# Active Skills");
    expect(section).toContain("## Skill: active-skill — Does things");
    expect(section).toContain("Follow these instructions.");
  });

  it("clear removes all skills", () => {
    registry.register({ name: "a", instructions: "A", source: "inline" });
    registry.register({ name: "b", instructions: "B", source: "inline" });
    registry.clear();
    expect(registry.size).toBe(0);
  });

  it("register overwrites existing skill with same name", () => {
    registry.register({ name: "skill", instructions: "v1", source: "inline" });
    registry.register({ name: "skill", instructions: "v2", source: "project" });
    expect(registry.size).toBe(1);
    expect(registry.get("skill")!.instructions).toBe("v2");
    expect(registry.get("skill")!.source).toBe("project");
  });

  it("registerDynamic generates fallback name when no name in frontmatter", () => {
    const before = Date.now();
    const skill = registry.registerDynamic("No frontmatter here.");
    expect(skill.name).toMatch(/^skill-\d+$/);
    const ts = parseInt(skill.name.replace("skill-", ""), 10);
    expect(ts).toBeGreaterThanOrEqual(before);
  });
});

// ── buildSkillSection ────────────────────────────────────────────────────────

describe("buildSkillSection", () => {
  it("includes always-on skills", () => {
    const skills: Skill[] = [
      { name: "always-on", always: true, instructions: "Always.", source: "inline" },
      { name: "opt-in", always: false, instructions: "Optional.", source: "inline" },
    ];

    const section = buildSkillSection(skills);
    expect(section).toContain("always-on");
    expect(section).not.toContain("opt-in");
  });

  it("includes forced skills even when not always-on", () => {
    const skills: Skill[] = [
      { name: "forced", always: false, instructions: "Forced.", source: "inline" },
    ];

    const section = buildSkillSection(skills, ["forced"]);
    expect(section).toContain("forced");
  });

  it("returns empty string when no active skills", () => {
    const skills: Skill[] = [
      { name: "inactive", always: false, instructions: "X", source: "inline" },
    ];

    expect(buildSkillSection(skills)).toBe("");
  });

  it("truncates when total exceeds 64 KB", () => {
    const skills: Skill[] = [];
    for (let i = 0; i < 100; i++) {
      skills.push({
        name: `skill-${i}`,
        always: true,
        instructions: "x".repeat(1024),
        source: "inline",
      });
    }

    const section = buildSkillSection(skills);
    expect(section).toContain("⚠️ Additional skills were omitted");
  });

  it("skill without description has clean header (no orphan ' — ')", () => {
    const skills: Skill[] = [
      { name: "no-desc", always: true, instructions: "Body.", source: "inline" },
    ];

    const section = buildSkillSection(skills);
    expect(section).toContain("## Skill: no-desc\n");
    expect(section).not.toContain("no-desc — \n");
    expect(section).not.toContain("no-desc —\n");
  });
});

// ── Backward Compatibility ───────────────────────────────────────────────────

describe("backward compatibility", () => {
  it("old Skill type without source still works", () => {
    // The old skills.ts Skill type didn't have `source`
    const oldSkill = {
      name: "legacy",
      instructions: "Legacy skill.",
      always: true,
    } as Skill;

    // Should be usable in buildSkillSection
    const section = buildSkillSection([oldSkill]);
    expect(section).toContain("legacy");
  });

  it("loadSkills backward compat (single arg)", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(path.join(dir, "compat.md"), "---\nname: compat\n---\nBody.");

    // Old API: loadSkills(dir) with no source argument
    const skills = await loadSkills(dir);
    expect(skills).toHaveLength(1);
    expect(skills[0]!.name).toBe("compat");
  });

  it("defineSkill backward compat (no source)", () => {
    const skill = defineSkill({
      name: "compat",
      instructions: "Body.",
    });
    expect(skill.name).toBe("compat");
    expect(skill.instructions).toBe("Body.");
  });
});
