/**
 * Skills — Phase 4 tests: Multi-Source Hierarchical Loading.
 *
 * Tests:
 * - Path matcher (globToRegExp, isSkillActiveForPaths)
 * - Bundled skill registry
 * - Multi-source loader (loadAllSkills)
 * - Project skill directory discovery
 * - Priority ordering and deduplication
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fsp from "fs/promises";
import * as path from "path";
import * as os from "os";

import {
  // Path matcher
  globToRegExp,
  isSkillActiveForPaths,
  // Bundled registry
  registerBundledSkill,
  getBundledSkills,
  getBundledSkill,
  bundledSkillsToSkills,
  _clearBundledSkills,
  type BundledSkillDefinition,
  // Multi-source loader
  loadAllSkills,
  discoverProjectSkillDirs,
  type SkillLoadConfig,
  // Existing
  type Skill,
  SkillRegistry,
} from "../skills/index.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

let tempDirs: string[] = [];

async function createTempDir(prefix = "yaaf-p4-"): Promise<string> {
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
// PATH MATCHER
// ══════════════════════════════════════════════════════════════════════════════

describe("globToRegExp", () => {
  it("matches exact paths", () => {
    const re = globToRegExp("src/index.ts");
    expect(re.test("src/index.ts")).toBe(true);
    expect(re.test("src/other.ts")).toBe(false);
  });

  it("* matches any characters except /", () => {
    const re = globToRegExp("src/*.ts");
    expect(re.test("src/index.ts")).toBe(true);
    expect(re.test("src/hello.ts")).toBe(true);
    expect(re.test("src/nested/deep.ts")).toBe(false);
    expect(re.test("src/.ts")).toBe(true); // * can match empty
  });

  it("** matches any characters including /", () => {
    const re = globToRegExp("src/**/*.ts");
    expect(re.test("src/index.ts")).toBe(true);
    expect(re.test("src/deep/nested/file.ts")).toBe(true);
    expect(re.test("other/file.ts")).toBe(false);
  });

  it("** alone matches everything", () => {
    const re = globToRegExp("**");
    expect(re.test("anything")).toBe(true);
    expect(re.test("deeply/nested/path.ext")).toBe(true);
  });

  it("? matches exactly one character except /", () => {
    const re = globToRegExp("src/?.ts");
    expect(re.test("src/a.ts")).toBe(true);
    expect(re.test("src/ab.ts")).toBe(false);
    expect(re.test("src/.ts")).toBe(false); // ? requires one char
  });

  it("escapes regex-special characters", () => {
    const re = globToRegExp("file.name+test.ts");
    expect(re.test("file.name+test.ts")).toBe(true);
    expect(re.test("fileXnameXtestXts")).toBe(false);
  });

  it("{a,b} brace expansion", () => {
    const re = globToRegExp("src/*.{ts,tsx}");
    expect(re.test("src/file.ts")).toBe(true);
    expect(re.test("src/file.tsx")).toBe(true);
    expect(re.test("src/file.js")).toBe(false);
  });

  it("handles patterns with no special characters", () => {
    const re = globToRegExp("readme");
    expect(re.test("readme")).toBe(true);
    expect(re.test("README")).toBe(false); // case-sensitive
  });

  it("throws on overly long patterns (ReDoS P4-F1)", () => {
    const longPattern = "*".repeat(300);
    expect(() => globToRegExp(longPattern)).toThrow("too long");
  });

  it("throws on too many ** segments (ReDoS P4-F1)", () => {
    const deepPattern = "a/**/b/**/c/**/d/**/e/**/f";
    expect(() => globToRegExp(deepPattern)).toThrow("too complex");
  });

  it("allows up to 4 ** segments", () => {
    const okPattern = "a/**/b/**/c/**/d/**";
    expect(() => globToRegExp(okPattern)).not.toThrow();
  });
});

describe("isSkillActiveForPaths", () => {
  it("returns true when skill has no paths (always active)", () => {
    expect(isSkillActiveForPaths(undefined, ["src/file.ts"])).toBe(true);
    expect(isSkillActiveForPaths([], ["src/file.ts"])).toBe(true);
  });

  it("returns false when no paths touched but skill has patterns", () => {
    expect(isSkillActiveForPaths(["src/**/*.ts"], [])).toBe(false);
  });

  it("returns true when a touched path matches a pattern", () => {
    expect(isSkillActiveForPaths(["src/**/*.ts"], ["src/index.ts"])).toBe(true);
  });

  it("returns false when no touched path matches", () => {
    expect(isSkillActiveForPaths(["src/**/*.ts"], ["tests/test.js"])).toBe(false);
  });

  it("matches any of multiple patterns", () => {
    expect(
      isSkillActiveForPaths(
        ["src/**/*.ts", "tests/**"],
        ["tests/unit/foo.test.js"],
      ),
    ).toBe(true);
  });

  it("normalizes backslashes to forward slashes", () => {
    expect(
      isSkillActiveForPaths(["src/**/*.ts"], ["src\\nested\\file.ts"]),
    ).toBe(true);
  });

  it("strips leading ./ from touched paths", () => {
    expect(
      isSkillActiveForPaths(["src/**/*.ts"], ["./src/file.ts"]),
    ).toBe(true);
  });

  it("gracefully handles invalid patterns (doesn't throw)", () => {
    // Very long pattern that would throw from globToRegExp
    const longPattern = "*".repeat(300);
    // Should not throw — invalid patterns are skipped
    expect(() => isSkillActiveForPaths([longPattern, "src/**"], ["src/file.ts"])).not.toThrow();
    // The valid pattern still works
    expect(isSkillActiveForPaths([longPattern, "src/**"], ["src/file.ts"])).toBe(true);
  });

  it("treats all-invalid patterns as always active", () => {
    const invalid = "*".repeat(300);
    // If ALL patterns are invalid, skill is treated as always-active
    expect(isSkillActiveForPaths([invalid], ["anything"])).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BUNDLED SKILL REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

describe("bundled skill registry", () => {
  beforeEach(() => {
    _clearBundledSkills();
  });

  afterEach(() => {
    _clearBundledSkills();
  });

  it("registers and retrieves a bundled skill", () => {
    registerBundledSkill({
      name: "test-bundled",
      description: "A test bundled skill",
      instructions: "Do the thing.",
    });

    const skill = getBundledSkill("test-bundled");
    expect(skill).toBeDefined();
    expect(skill!.name).toBe("test-bundled");
    expect(skill!.description).toBe("A test bundled skill");
  });

  it("lists all registered bundled skills", () => {
    registerBundledSkill({ name: "skill-a", description: "A" });
    registerBundledSkill({ name: "skill-b", description: "B" });

    const all = getBundledSkills();
    expect(all).toHaveLength(2);
    expect(all.map((s) => s.name)).toContain("skill-a");
    expect(all.map((s) => s.name)).toContain("skill-b");
  });

  it("throws on duplicate registration", () => {
    registerBundledSkill({ name: "dup", description: "First" });
    expect(() => registerBundledSkill({ name: "dup", description: "Second" })).toThrow("already registered");
  });

  it("converts bundled definitions to Skill objects", () => {
    registerBundledSkill({
      name: "converter-test",
      description: "Test conversion",
      always: true,
      allowedTools: ["Bash(git *)"],
      userInvocable: false,
      instructions: "Do this.",
    });

    const skills = bundledSkillsToSkills();
    expect(skills).toHaveLength(1);
    const skill = skills[0]!;
    expect(skill.name).toBe("converter-test");
    expect(skill.source).toBe("bundled");
    expect(skill.always).toBe(true);
    expect(skill["allowed-tools"]).toEqual(["Bash(git *)"]);
    expect(skill["user-invocable"]).toBe(false);
    expect(skill.instructions).toBe("Do this.");
  });

  it("defaults always to false and userInvocable to true", () => {
    registerBundledSkill({ name: "defaults", description: "Defaults" });
    const skills = bundledSkillsToSkills();
    expect(skills[0]!.always).toBe(false);
    expect(skills[0]!["user-invocable"]).toBe(true);
  });

  it("preserves getPromptForCommand function", () => {
    const promptFn = async () => [{ type: "text" as const, text: "hello" }];
    registerBundledSkill({
      name: "lazy",
      description: "Lazy-loaded",
      getPromptForCommand: promptFn,
    });

    const skills = bundledSkillsToSkills();
    expect(skills[0]!.getPromptForCommand).toBe(promptFn);
  });

  it("_clearBundledSkills removes all", () => {
    registerBundledSkill({ name: "temp", description: "Temp" });
    expect(getBundledSkills()).toHaveLength(1);
    _clearBundledSkills();
    expect(getBundledSkills()).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PROJECT SKILL DIRECTORY DISCOVERY
// ══════════════════════════════════════════════════════════════════════════════

describe("discoverProjectSkillDirs", () => {
  it("returns .yaaf/skills/ for project root", () => {
    const dirs = discoverProjectSkillDirs("/home/user/project", "/home/user");
    expect(dirs[0]).toBe(path.join("/home/user/project", ".yaaf", "skills"));
  });

  it("walks up to home directory", () => {
    const dirs = discoverProjectSkillDirs(
      "/home/user/a/b/c",
      "/home/user",
    );
    // Should include: /home/user/a/b/c/.yaaf/skills, /home/user/a/b/.yaaf/skills, /home/user/a/.yaaf/skills, /home/user/.yaaf/skills
    expect(dirs).toHaveLength(4);
    expect(dirs[0]).toContain("a/b/c");
    expect(dirs[dirs.length - 1]).toContain(path.join("/home/user", ".yaaf", "skills"));
  });

  it("stops at home directory (does not include home's parent)", () => {
    const dirs = discoverProjectSkillDirs("/home/user/project", "/home/user");
    // Should be: project, user — and user is the stop boundary
    expect(dirs).toHaveLength(2);
  });

  it("handles projectRoot = homeDir (returns just one dir)", () => {
    const dirs = discoverProjectSkillDirs("/home/user", "/home/user");
    expect(dirs).toHaveLength(1);
    expect(dirs[0]).toBe(path.join("/home/user", ".yaaf", "skills"));
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MULTI-SOURCE LOADER
// ══════════════════════════════════════════════════════════════════════════════

describe("loadAllSkills", () => {
  beforeEach(() => {
    _clearBundledSkills();
  });

  afterEach(() => {
    _clearBundledSkills();
  });

  it("returns empty when no sources have skills", async () => {
    const result = await loadAllSkills({
      bare: true,
      loadUserSkills: false,
      loadProjectSkills: false,
    });
    expect(result.skills).toHaveLength(0);
    expect(result.scannedDirs).toHaveLength(0);
  });

  it("loads skills from additionalDirs", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "extra.md"),
      "---\nname: extra\nalways: true\n---\nExtra instructions.",
    );

    const result = await loadAllSkills({
      bare: true,
      additionalDirs: [dir],
    });

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]!.name).toBe("extra");
    expect(result.scannedDirs).toContain(dir);
  });

  it("loads bundled skills first (highest priority)", async () => {
    registerBundledSkill({
      name: "bundled-skill",
      description: "From binary",
      instructions: "Bundled instructions.",
      always: true,
    });

    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "disk-skill.md"),
      "---\nname: disk-skill\nalways: true\n---\nDisk instructions.",
    );

    const result = await loadAllSkills({
      bare: true,
      additionalDirs: [dir],
    });

    expect(result.skills).toHaveLength(2);
    expect(result.bySource.bundled).toHaveLength(1);
    expect(result.bySource.bundled[0]!.name).toBe("bundled-skill");
  });

  it("bare mode skips user and project discovery", async () => {
    const userDir = await createTempDir("user-skills-");
    const projectDir = await createTempDir("project-skills-");

    // Even if these directories have skills, bare mode ignores them
    const result = await loadAllSkills({
      bare: true,
      homeDir: userDir,
      projectRoot: projectDir,
    });

    expect(result.skills).toHaveLength(0);
  });

  it("loads user-level skills from ~/.config/yaaf/skills/", async () => {
    const fakeHome = await createTempDir("home-");
    const userSkillsDir = path.join(fakeHome, ".config", "yaaf", "skills");
    await fsp.mkdir(userSkillsDir, { recursive: true });
    await fsp.writeFile(
      path.join(userSkillsDir, "user-skill.md"),
      "---\nname: user-skill\nalways: true\n---\nUser-level skill.",
    );

    const result = await loadAllSkills({
      homeDir: fakeHome,
      loadProjectSkills: false,
    });

    expect(result.skills.some((s) => s.name === "user-skill")).toBe(true);
    expect(result.bySource.user).toHaveLength(1);
  });

  it("loads project-level skills from .yaaf/skills/", async () => {
    const fakeHome = await createTempDir("home-");
    const projectDir = await createTempDir("project-");
    const projectSkillsDir = path.join(projectDir, ".yaaf", "skills");
    await fsp.mkdir(projectSkillsDir, { recursive: true });
    await fsp.writeFile(
      path.join(projectSkillsDir, "proj-skill.md"),
      "---\nname: proj-skill\nalways: true\n---\nProject skill.",
    );

    const result = await loadAllSkills({
      homeDir: fakeHome,
      projectRoot: projectDir,
      loadUserSkills: false,
    });

    expect(result.skills.some((s) => s.name === "proj-skill")).toBe(true);
    expect(result.bySource.project.length).toBeGreaterThanOrEqual(1);
  });

  it("deduplicates: bundled beats file skill with same name", async () => {
    registerBundledSkill({
      name: "shared-name",
      description: "Bundled version",
      instructions: "Bundled wins.",
      always: true,
    });

    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "shared-name.md"),
      "---\nname: shared-name\nalways: true\n---\nDisk version loses.",
    );

    const result = await loadAllSkills({
      bare: true,
      additionalDirs: [dir],
    });

    // Name-based dedup: bundled is loaded first → it wins
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]!.instructions).toBe("Bundled wins.");
    expect(result.skills[0]!.source).toBe("bundled");
  });

  it("scannedDirs tracks all directories that were checked", async () => {
    const dir1 = await createTempDir("dir1-");
    const dir2 = await createTempDir("dir2-");

    const result = await loadAllSkills({
      bare: true,
      additionalDirs: [dir1, dir2],
    });

    expect(result.scannedDirs).toContain(dir1);
    expect(result.scannedDirs).toContain(dir2);
  });

  it("handles non-existent directories gracefully", async () => {
    const result = await loadAllSkills({
      bare: true,
      additionalDirs: ["/nonexistent/path/that/does/not/exist"],
    });

    expect(result.skills).toHaveLength(0);
  });

  it("bySource accurately reflects post-dedup state (P4-F4)", async () => {
    registerBundledSkill({
      name: "overlap",
      description: "Bundled",
      instructions: "Bundled wins.",
      always: true,
    });

    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "overlap.md"),
      "---\nname: overlap\nalways: true\n---\nDisk loses.",
    );
    await fsp.writeFile(
      path.join(dir, "unique.md"),
      "---\nname: unique\nalways: true\n---\nUnique skill.",
    );

    const result = await loadAllSkills({ bare: true, additionalDirs: [dir] });

    // bySource should match the final deduplicated skill set
    expect(result.bySource.bundled).toHaveLength(1);
    expect(result.bySource.bundled[0]!.name).toBe("overlap");
    expect(result.bySource.project).toHaveLength(1);
    expect(result.bySource.project[0]!.name).toBe("unique");

    // Total should match skills array
    const totalBySource = Object.values(result.bySource).reduce((a, b) => a + b.length, 0);
    expect(totalBySource).toBe(result.skills.length);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// E2E: PATH-CONDITIONAL ACTIVATION WITH REGISTRY
// ══════════════════════════════════════════════════════════════════════════════

describe("E2E: path-conditional activation", () => {
  it("skill with paths: only appears in section when matching files are touched", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "ts-lint.md"),
      '---\nname: ts-lint\ndescription: TypeScript linting\nalways: true\npaths:\n  - "src/**/*.ts"\n---\nRun TypeScript linter.',
    );
    await fsp.writeFile(
      path.join(dir, "always-on.md"),
      "---\nname: always-on\nalways: true\n---\nAlways active.",
    );

    const result = await loadAllSkills({ bare: true, additionalDirs: [dir] });

    // Simulate: agent has touched src/index.ts
    const touchedPaths = ["src/index.ts"];
    const activeSkills = result.skills.filter((s) =>
      isSkillActiveForPaths(s.paths, touchedPaths),
    );

    expect(activeSkills.some((s) => s.name === "ts-lint")).toBe(true);
    expect(activeSkills.some((s) => s.name === "always-on")).toBe(true);

    // Simulate: agent has only touched CSS files
    const cssOnly = result.skills.filter((s) =>
      isSkillActiveForPaths(s.paths, ["styles/main.css"]),
    );

    expect(cssOnly.some((s) => s.name === "ts-lint")).toBe(false); // filtered out
    expect(cssOnly.some((s) => s.name === "always-on")).toBe(true); // no paths = always active
  });

  it("skill with paths: [] (empty) is always active", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "empty-paths.md"),
      "---\nname: empty-paths\npaths: []\n---\nEmpty paths skill.",
    );

    const result = await loadAllSkills({ bare: true, additionalDirs: [dir] });
    const active = result.skills.filter((s) =>
      isSkillActiveForPaths(s.paths, ["anything.txt"]),
    );

    expect(active.some((s) => s.name === "empty-paths")).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// E2E: FULL PIPELINE INTEGRATION
// ══════════════════════════════════════════════════════════════════════════════

describe("E2E: full pipeline", () => {
  beforeEach(() => {
    _clearBundledSkills();
  });

  afterEach(() => {
    _clearBundledSkills();
  });

  it("user skill beats project skill with same name (priority order)", async () => {
    const fakeHome = await createTempDir("home-");
    const userSkillsDir = path.join(fakeHome, ".config", "yaaf", "skills");
    await fsp.mkdir(userSkillsDir, { recursive: true });
    await fsp.writeFile(
      path.join(userSkillsDir, "fmt.md"),
      "---\nname: fmt\nalways: true\n---\nUser formatting rules.",
    );

    const projectDir = await createTempDir("project-");
    const projectSkillsDir = path.join(projectDir, ".yaaf", "skills");
    await fsp.mkdir(projectSkillsDir, { recursive: true });
    await fsp.writeFile(
      path.join(projectSkillsDir, "fmt.md"),
      "---\nname: fmt\nalways: true\n---\nProject formatting rules.",
    );

    const result = await loadAllSkills({
      homeDir: fakeHome,
      projectRoot: projectDir,
    });

    // User is loaded before project → user wins
    const fmtSkill = result.skills.find((s) => s.name === "fmt");
    expect(fmtSkill).toBeDefined();
    expect(fmtSkill!.instructions).toBe("User formatting rules.");
    expect(fmtSkill!.source).toBe("user");
  });

  it("nested project walk-up finds skills at multiple levels", async () => {
    const fakeHome = await createTempDir("home-");

    // Create nested project: root/sub/deep
    const rootDir = await createTempDir("root-");
    const subDir = path.join(rootDir, "sub");
    const deepDir = path.join(subDir, "deep");
    await fsp.mkdir(deepDir, { recursive: true });

    // Skills at root level
    const rootSkills = path.join(rootDir, ".yaaf", "skills");
    await fsp.mkdir(rootSkills, { recursive: true });
    await fsp.writeFile(
      path.join(rootSkills, "root-skill.md"),
      "---\nname: root-skill\nalways: true\n---\nFrom root.",
    );

    // Skills at sub level
    const subSkills = path.join(subDir, ".yaaf", "skills");
    await fsp.mkdir(subSkills, { recursive: true });
    await fsp.writeFile(
      path.join(subSkills, "sub-skill.md"),
      "---\nname: sub-skill\nalways: true\n---\nFrom sub.",
    );

    // Load from deepDir → should walk up and find both
    const result = await loadAllSkills({
      homeDir: fakeHome,
      projectRoot: deepDir,
      loadUserSkills: false,
    });

    expect(result.skills.some((s) => s.name === "root-skill")).toBe(true);
    expect(result.skills.some((s) => s.name === "sub-skill")).toBe(true);
  });

  it("path-conditional filtering through buildSection", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "ts-only.md"),
      '---\nname: ts-only\ndescription: TS rules\nalways: true\npaths:\n  - "src/**/*.ts"\n---\nTypeScript rules.',
    );
    await fsp.writeFile(
      path.join(dir, "universal.md"),
      "---\nname: universal\ndescription: Global\nalways: true\n---\nUniversal rules.",
    );

    const result = await loadAllSkills({ bare: true, additionalDirs: [dir] });

    // Register only path-matching skills
    const tsFiles = ["src/app.ts"];
    const registry = new SkillRegistry();
    for (const s of result.skills) {
      if (isSkillActiveForPaths(s.paths, tsFiles)) {
        registry.register(s);
      }
    }

    const section = registry.buildSection();
    expect(section).toContain("ts-only");
    expect(section).toContain("TypeScript rules.");
    expect(section).toContain("universal");

    // Now with CSS files — ts-only should be absent
    const registry2 = new SkillRegistry();
    for (const s of result.skills) {
      if (isSkillActiveForPaths(s.paths, ["styles/main.css"])) {
        registry2.register(s);
      }
    }

    const section2 = registry2.buildSection();
    expect(section2).not.toContain("ts-only");
    expect(section2).toContain("universal");
  });

  it("bundled getPromptForCommand callable after loadAllSkills", async () => {
    const mockPromptFn = async (args: string) => [
      { type: "text" as const, text: `Processed: ${args}` },
    ];

    registerBundledSkill({
      name: "dynamic-prompt",
      description: "Has lazy prompt",
      getPromptForCommand: mockPromptFn,
    });

    const result = await loadAllSkills({ bare: true });
    const skill = result.skills.find((s) => s.name === "dynamic-prompt");
    expect(skill).toBeDefined();
    expect(skill!.getPromptForCommand).toBeDefined();

    // Call the lazy prompt generator
    const blocks = await skill!.getPromptForCommand!("test args", {});
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.text).toBe("Processed: test args");
  });

  it("loadAllSkills → SkillRegistry → buildSection full chain", async () => {
    // Set up bundled
    registerBundledSkill({
      name: "bundled-helper",
      description: "Built-in helper",
      instructions: "Bundled helper instructions.",
      always: true,
    });

    // Set up file-based skills
    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "file-skill.md"),
      "---\nname: file-skill\ndescription: File-based\nalways: true\n---\nFile skill instructions.",
    );
    await fsp.writeFile(
      path.join(dir, "opt-in.md"),
      "---\nname: opt-in\nalways: false\n---\nOpt-in only.",
    );

    // Load all sources
    const result = await loadAllSkills({ bare: true, additionalDirs: [dir] });

    // Register in SkillRegistry
    const registry = new SkillRegistry();
    for (const s of result.skills) registry.register(s);

    // Build section (no forced names)
    const section = registry.buildSection();
    expect(section).toContain("bundled-helper");
    expect(section).toContain("Bundled helper instructions.");
    expect(section).toContain("file-skill");
    expect(section).toContain("File skill instructions.");
    expect(section).not.toContain("opt-in"); // always: false, not forced

    // Now with forced activation
    const sectionForced = registry.buildSection(["opt-in"]);
    expect(sectionForced).toContain("opt-in");
    expect(sectionForced).toContain("Opt-in only.");
  });

  it("bare mode strict isolation: only additionalDirs, nothing else", async () => {
    // Set up user skills
    const fakeHome = await createTempDir("home-");
    const userSkillsDir = path.join(fakeHome, ".config", "yaaf", "skills");
    await fsp.mkdir(userSkillsDir, { recursive: true });
    await fsp.writeFile(
      path.join(userSkillsDir, "user-trick.md"),
      "---\nname: user-trick\nalways: true\n---\nShould not appear.",
    );

    // Set up project skills
    const projectDir = await createTempDir("project-");
    const projectSkillsDir = path.join(projectDir, ".yaaf", "skills");
    await fsp.mkdir(projectSkillsDir, { recursive: true });
    await fsp.writeFile(
      path.join(projectSkillsDir, "project-trick.md"),
      "---\nname: project-trick\nalways: true\n---\nShould not appear.",
    );

    // Set up the ONE dir we want
    const allowedDir = await createTempDir("allowed-");
    await fsp.writeFile(
      path.join(allowedDir, "allowed.md"),
      "---\nname: allowed\nalways: true\n---\nI should appear.",
    );

    // Bare mode with explicit homeDir and projectRoot that HAVE skills
    const result = await loadAllSkills({
      bare: true,
      homeDir: fakeHome,
      projectRoot: projectDir,
      additionalDirs: [allowedDir],
    });

    // Only the explicitly provided dir's skills should appear
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]!.name).toBe("allowed");
    expect(result.skills.some((s) => s.name === "user-trick")).toBe(false);
    expect(result.skills.some((s) => s.name === "project-trick")).toBe(false);
  });

  it("different names at same path level are both kept", async () => {
    const dir = await createTempDir();
    await fsp.writeFile(
      path.join(dir, "skill-a.md"),
      "---\nname: skill-a\nalways: true\n---\nSkill A.",
    );
    await fsp.writeFile(
      path.join(dir, "skill-b.md"),
      "---\nname: skill-b\nalways: true\n---\nSkill B.",
    );

    const result = await loadAllSkills({ bare: true, additionalDirs: [dir] });
    expect(result.skills).toHaveLength(2);

    const registry = new SkillRegistry();
    for (const s of result.skills) registry.register(s);
    const section = registry.buildSection();
    expect(section).toContain("Skill A.");
    expect(section).toContain("Skill B.");
  });
});
