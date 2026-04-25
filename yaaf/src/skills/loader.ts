/**
 * Skills — Multi-source loader.
 *
 * Loads skills from multiple sources (directories, inline definitions,
 * plugin providers) with support for both flat-file and directory-based
 * skill formats, deduplication via realpath, and conditional activation.
 *
 * @module skills/loader
 */

import * as fsp from "fs/promises";
import * as path from "path";
import { type Dirent } from "fs";

import type { Skill, SkillEntry, SkillSource } from "./types.js";
import { parseFrontmatter, buildSkillFromParsed } from "./frontmatter.js";

// ── Skill Discovery ──────────────────────────────────────────────────────────

/**
 * Discover skill entries in a directory. Supports both formats:
 *
 * 1. **Flat file**: `skills/my-skill.md`
 * 2. **Directory**: `skills/my-skill/SKILL.md` (with optional sibling files)
 *
 * Ignores files/directories starting with `_` or `.`.
 */
export async function discoverSkillEntries(dir: string): Promise<SkillEntry[]> {
  let entries: Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const skills: SkillEntry[] = [];

  for (const entry of entries) {
    // Skip hidden and internal files
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;

    if (entry.isDirectory()) {
      // Directory format: check for SKILL.md
      const skillMd = path.join(dir, entry.name, "SKILL.md");
      try {
        await fsp.access(skillMd);
        skills.push({
          path: skillMd,
          skillDir: path.join(dir, entry.name),
          format: "directory",
        });
      } catch {
        // No SKILL.md — skip
      }
    } else if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".mdx"))) {
      // Flat format
      skills.push({
        path: path.join(dir, entry.name),
        skillDir: dir,
        format: "flat",
      });
    }
  }

  return skills;
}

// ── Loading ──────────────────────────────────────────────────────────────────

/**
 * Load a single skill from a file path.
 *
 * @param filePath - Absolute path to the skill file
 * @param opts - Optional overrides for source and skill directory
 */
export async function loadSkill(
  filePath: string,
  opts?: { source?: SkillSource; skillDir?: string },
): Promise<Skill> {
  const raw = await fsp.readFile(filePath, "utf8");
  const parsed = parseFrontmatter(raw, filePath);
  const defaultName = path.basename(filePath, path.extname(filePath));

  // For directory-format skills, the directory name is more meaningful
  const skillDir = opts?.skillDir ?? path.dirname(filePath);
  const dirName =
    path.basename(filePath) === "SKILL.md"
      ? path.basename(path.dirname(filePath))
      : undefined;

  const skill = buildSkillFromParsed(parsed, {
    filePath,
    skillDir,
    source: opts?.source ?? "project",
    defaultName: dirName ?? defaultName,
  });

  // For directory-format skills, scan for sibling reference files
  if (path.basename(filePath) === "SKILL.md") {
    skill.files = await loadSkillFiles(skillDir);
  }

  return skill;
}

/**
 * Load all skills from a directory (non-recursive).
 * Supports both flat-file and directory-based formats.
 *
 * @param dir - Directory to scan for skills
 * @param source - What source to tag skills with
 */
export async function loadSkills(
  dir: string,
  source: SkillSource = "project",
): Promise<Skill[]> {
  const entries = await discoverSkillEntries(dir);
  const skills: Skill[] = [];

  for (const entry of entries) {
    try {
      const skill = await loadSkill(entry.path, {
        source,
        skillDir: entry.skillDir,
      });
      skills.push(skill);
    } catch {
      // Skip unreadable files
    }
  }

  return skills;
}

/**
 * Load reference files from a directory-format skill (sibling files
 * alongside SKILL.md). Excludes SKILL.md itself and hidden files.
 *
 * These files are accessible via ${SKILL_DIR} variable substitution
 * and can be extracted to a temp directory for shell commands.
 */
async function loadSkillFiles(skillDir: string): Promise<Record<string, string> | undefined> {
  let dirEntries: Dirent[];
  try {
    dirEntries = await fsp.readdir(skillDir, { withFileTypes: true });
  } catch {
    return undefined;
  }

  const files: Record<string, string> = {};
  let hasFiles = false;

  for (const entry of dirEntries) {
    if (!entry.isFile()) continue;
    if (entry.name === "SKILL.md") continue;
    if (entry.name.startsWith(".")) continue;

    try {
      const content = await fsp.readFile(path.join(skillDir, entry.name), "utf8");
      files[entry.name] = content;
      hasFiles = true;
    } catch {
      // Skip unreadable files
    }
  }

  return hasFiles ? files : undefined;
}

/**
 * Deduplicate skills by canonical file path (via realpath) AND by name.
 *
 * Two-key dedup strategy:
 * 1. File-based skills are deduped by canonical path (handles symlinks)
 * 2. ALL skills are also deduped by name (handles bundled vs file conflicts)
 *
 * When multiple skills have the same canonical path OR name, the first one wins
 * (which means higher-priority sources should be loaded first).
 */
export async function deduplicateSkills(skills: Skill[]): Promise<Skill[]> {
  const seenPaths = new Map<string, Skill>();
  const seenNames = new Set<string>();
  const result: Skill[] = [];

  for (const skill of skills) {
    // Check name-based dedup first (applies to ALL skills)
    if (seenNames.has(skill.name)) continue;

    // Check path-based dedup for file skills
    if (skill.filePath) {
      const canonical = await fsp.realpath(skill.filePath).catch(() => skill.filePath!);
      if (seenPaths.has(canonical)) continue;
      seenPaths.set(canonical, skill);
    }

    seenNames.add(skill.name);
    result.push(skill);
  }

  return result;
}

/**
 * Define a skill inline (no file required).
 * Backward compatible with the original `defineSkill()` API.
 */
export function defineSkill(
  skill: Omit<Skill, "source"> & { source?: SkillSource },
): Skill {
  return {
    always: true,
    source: "inline",
    ...skill,
  };
}

// ── Multi-Source Hierarchical Loading ─────────────────────────────────────────

/**
 * Configuration for multi-source skill loading.
 *
 * Sources are loaded in priority order (highest first):
 * 1. Bundled skills (compiled into the framework)
 * 2. User-level skills (~/.config/yaaf/skills/)
 * 3. Project-level skills (.yaaf/skills/ walking up to home)
 * 4. Additional directories (explicit)
 * 5. Plugin-contributed skills (merged externally)
 *
 * After loading, skills are deduplicated (first wins = highest priority).
 */
export type SkillLoadConfig = {
  /** Project root directory (for project-level skill discovery). */
  projectRoot?: string;
  /** Additional skill directories to scan. */
  additionalDirs?: string[];
  /** Whether to load user-level skills. Default: true. */
  loadUserSkills?: boolean;
  /** Whether to load project-level skills. Default: true. */
  loadProjectSkills?: boolean;
  /** Bare mode — skip all auto-discovery, only load explicit dirs. Default: false. */
  bare?: boolean;
  /** User home directory override (for testing). Default: os.homedir(). */
  homeDir?: string;
};

/**
 * Result of a multi-source skill load.
 */
export type SkillLoadResult = {
  /** All deduplicated skills in priority order. */
  skills: Skill[];
  /** Skills grouped by source for debugging/logging. */
  bySource: Record<SkillSource, Skill[]>;
  /** Directories that were scanned. */
  scannedDirs: string[];
};

/**
 * Load skills from all configured sources with priority-based deduplication.
 *
 * This is the primary entry point for multi-source skill loading.
 * Skills are loaded in priority order and deduplicated — the highest
 * priority source wins when the same skill file or name appears in
 * multiple sources.
 *
 * @param config - Multi-source loading configuration
 * @returns Deduplicated skills and metadata
 */
export async function loadAllSkills(config: SkillLoadConfig = {}): Promise<SkillLoadResult> {
  const {
    projectRoot,
    additionalDirs = [],
    loadUserSkills = true,
    loadProjectSkills = true,
    bare = false,
  } = config;

  const allSkills: Skill[] = [];
  const scannedDirs: string[] = [];

  // ── 1. Bundled skills ──────────────────────────────────────────────────
  // Imported lazily to avoid circular dependencies
  try {
    const { bundledSkillsToSkills } = await import("./bundled/registry.js");
    const bundled = bundledSkillsToSkills();
    allSkills.push(...bundled);
  } catch {
    // Bundled registry not available — skip
  }

  if (bare) {
    // In bare mode, only load explicitly provided directories
    for (const dir of additionalDirs) {
      scannedDirs.push(dir);
      const skills = await loadSkills(dir, "project");
      allSkills.push(...skills);
    }

    const deduplicated = await deduplicateSkills(allSkills);
    return { skills: deduplicated, bySource: groupBySource(deduplicated), scannedDirs };
  }

  // ── 2. User-level skills ───────────────────────────────────────────────
  if (loadUserSkills) {
    const homeDir = config.homeDir ?? (await getHomeDir());
    if (homeDir) {
      const userSkillsDir = path.join(homeDir, ".config", "yaaf", "skills");
      scannedDirs.push(userSkillsDir);
      const userSkills = await loadSkills(userSkillsDir, "user");
      allSkills.push(...userSkills);
    }
  }

  // ── 3. Project-level skills ────────────────────────────────────────────
  if (loadProjectSkills && projectRoot) {
    const homeDir = config.homeDir ?? (await getHomeDir());
    const projectDirs = discoverProjectSkillDirs(projectRoot, homeDir);
    for (const dir of projectDirs) {
      scannedDirs.push(dir);
      const projectSkills = await loadSkills(dir, "project");
      allSkills.push(...projectSkills);
    }
  }

  // ── 4. Additional explicit directories ─────────────────────────────────
  for (const dir of additionalDirs) {
    scannedDirs.push(dir);
    const skills = await loadSkills(dir, "project");
    allSkills.push(...skills);
  }

  // ── 5. Deduplicate ─────────────────────────────────────────────────────
  const deduplicated = await deduplicateSkills(allSkills);
  return { skills: deduplicated, bySource: groupBySource(deduplicated), scannedDirs };
}

// ── Project skill directory discovery ────────────────────────────────────────

/**
 * Discover project-level skill directories by walking up from projectRoot.
 *
 * Looks for `.yaaf/skills/` in each directory from projectRoot up to
 * (but not including) the user's home directory. This allows nested
 * project configurations to override parent projects.
 *
 * Directories are returned in order from most-specific (deepest) to
 * least-specific (shallowest). This means the deepest project's skills
 * have highest priority.
 *
 * @param projectRoot - Starting directory
 * @param homeDir - User's home directory (stop boundary)
 * @returns Array of skill directories found, deepest first
 */
export function discoverProjectSkillDirs(
  projectRoot: string,
  homeDir?: string,
): string[] {
  const dirs: string[] = [];
  let stopAt: string | undefined;
  try {
    // Use provided homeDir, or try to get it from os module
    stopAt = homeDir ?? require("os").homedir();
  } catch {
    // ESM environment or os not available — no stop boundary
    stopAt = undefined;
  }
  let current = path.resolve(projectRoot);

  // Safety: limit depth to prevent infinite loops on broken symlinks
  const MAX_DEPTH = 64;
  let depth = 0;

  while (depth < MAX_DEPTH) {
    const candidate = path.join(current, ".yaaf", "skills");
    dirs.push(candidate);

    // Stop at home directory or filesystem root
    const parent = path.dirname(current);
    if (parent === current) break; // filesystem root
    if (stopAt && current === path.resolve(stopAt)) break;

    current = parent;
    depth++;
  }

  return dirs;
}

/** Get home directory asynchronously. */
async function getHomeDir(): Promise<string | undefined> {
  try {
    const os = await import("os");
    return os.homedir();
  } catch {
    return undefined;
  }
}

/**
 * Group skills by their source field.
 * Built from the post-dedup skill set so counts are accurate.
 */
function groupBySource(skills: Skill[]): Record<SkillSource, Skill[]> {
  const result: Record<SkillSource, Skill[]> = {
    bundled: [],
    user: [],
    project: [],
    managed: [],
    plugin: [],
    dynamic: [],
    inline: [],
  };
  for (const skill of skills) {
    const source = skill.source ?? "project";
    result[source].push(skill);
  }
  return result;
}
