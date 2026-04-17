/**
 * Skills — markdown-based capability packs for agents.
 *
 * A Skill is a markdown file that extends an agent's instructions at runtime
 * without code changes. Skills can:
 * - Add domain knowledge and constraints to the system prompt
 * - Define reusable workflows and procedures
 * - Provide examples and few-shot demonstrations
 *
 * skills like /dream, /review, /commit) and the SKILL.md format.
 *
 * @example
 * ```ts
 * // Load all skills from a directory
 * const skills = await loadSkills('./skills');
 *
 * const agent = new Agent({
 * systemPrompt: 'You are a coding assistant.',
 * skills,
 * });
 *
 * // The agent's effective system prompt = base + all skill injections
 * ```
 *
 * @example
 * ```ts
 * // Inline skill definition
 * const securitySkill = defineSkill({
 * name: 'security-review',
 * description: 'OWASP security review checklist',
 * instructions: `
 * ## Security Review Protocol
 * When reviewing code, always check for:
 * 1. SQL injection vulnerabilities
 * 2. XSS vulnerabilities
 * ...`,
 * });
 * ```
 */

import * as fsp from "fs/promises";
import * as path from "path";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SkillFrontmatter = {
  /** Display name for the skill */
  name: string;
  /** Short description shown in skill listings */
  description?: string;
  /** Version string */
  version?: string;
  /** Whether this skill is always injected (default: true) */
  always?: boolean;
  /** List of tags for filtering/search */
  tags?: string[];
};

export type Skill = SkillFrontmatter & {
  /** The full instruction content (after frontmatter) */
  instructions: string;
  /** Source file path, if loaded from disk */
  filePath?: string;
};

// ── Frontmatter parser ────────────────────────────────────────────────────────

/**
 * Parse YAML-lite frontmatter from a markdown file.
 * Format:
 * ```
 * ---
 * name: My Skill
 * description: Does something useful
 * ---
 * # Skill content here
 * ```
 */
function parseFrontmatter(content: string): { meta: Partial<SkillFrontmatter>; body: string } {
  const fm = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fm) return { meta: {}, body: content };

  const meta: Partial<SkillFrontmatter> = {};
  const yamlBlock = fm[1]!;

  for (const line of yamlBlock.split("\n")) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (!match) continue;
    const [, key, value] = match;
    switch (key) {
      case "name":
        meta.name = value!.trim().replace(/^['"]|['"]$/g, "");
        break;
      case "description":
        meta.description = value!.trim().replace(/^['"]|['"]$/g, "");
        break;
      case "version":
        meta.version = value!.trim().replace(/^['"]|['"]$/g, "");
        break;
      case "always":
        meta.always = value!.trim() !== "false";
        break;
      case "tags":
        meta.tags = value!.split(",").map((t) => t.trim());
        break;
    }
  }

  return { meta, body: fm[2]!.trim() };
}

// ── Skill loader ──────────────────────────────────────────────────────────────

/**
 * Maximum individual skill file size (bytes).
 * Files exceeding this limit are silently truncated at the
 * instructions level. A 256 KB skill is already an absurdly large
 * system-prompt injection; anything larger is almost certainly a
 * mistake or attack.
 */
const MAX_SKILL_BYTES = 256 * 1024; // 256 KB

/**
 * Load all `.md` skill files from a directory (non-recursive).
 * Files without a `name` frontmatter field use the filename as name.
 */
export async function loadSkills(dir: string): Promise<Skill[]> {
  let files: string[];
  try {
    files = await fsp.readdir(dir);
  } catch {
    return [];
  }

  const skills: Skill[] = [];
  for (const file of files) {
    if (!file.endsWith(".md") && !file.endsWith(".mdx")) continue;
    if (file.startsWith("_") || file.startsWith(".")) continue;

    const filePath = path.join(dir, file);
    try {
      const raw = await fsp.readFile(filePath, "utf8");
      const { meta, body } = parseFrontmatter(raw);

      // Truncate oversized skill instructions.
      const instructions =
        Buffer.byteLength(body, "utf8") > MAX_SKILL_BYTES
          ? body.slice(0, MAX_SKILL_BYTES) + "\n\n[...skill truncated: exceeded 256 KB limit]"
          : body;

      skills.push({
        name: meta.name ?? file.replace(/\.(md|mdx)$/, ""),
        description: meta.description,
        version: meta.version,
        always: meta.always ?? true,
        tags: meta.tags ?? [],
        instructions,
        filePath,
      });
    } catch {
      // Skip unreadable files
    }
  }

  return skills;
}

/**
 * Load a single skill from a file path.
 */
export async function loadSkill(filePath: string): Promise<Skill> {
  const raw = await fsp.readFile(filePath, "utf8");
  const { meta, body } = parseFrontmatter(raw);
  // Cap individual skill instructions at MAX_SKILL_BYTES.
  const instructions =
    Buffer.byteLength(body, "utf8") > MAX_SKILL_BYTES
      ? body.slice(0, MAX_SKILL_BYTES) + "\n\n[...skill truncated: exceeded 256 KB limit]"
      : body;
  return {
    name: meta.name ?? path.basename(filePath, path.extname(filePath)),
    description: meta.description,
    version: meta.version,
    always: meta.always ?? true,
    tags: meta.tags ?? [],
    instructions,
    filePath,
  };
}

/**
 * Define a skill inline (no file required).
 */
export function defineSkill(skill: Skill): Skill {
  return { always: true, ...skill };
}

// ── Skill injection ───────────────────────────────────────────────────────────

/**
 * Build the skill injection block to append to a system prompt.
 * Only includes skills where `always === true` unless `forcedNames` is provided.
 *
 * Total injected skill block is capped at 64 KB to prevent
 * runaway context consumption when many large skills are registered.
 */
export function buildSkillSection(skills: Skill[], forcedNames?: string[]): string {
  const MAX_SECTION_BYTES = 64 * 1024; // 64 KB total
  const active = skills.filter((s) => {
    if (s.always) return true;
    if (forcedNames?.includes(s.name)) return true;
    return false;
  });

  if (active.length === 0) return "";

  const blocks: string[] = [];
  let totalBytes = 0;
  let truncated = false;

  for (const s of active) {
    const header = `## Skill: ${s.name}${s.description ? ` — ${s.description}` : ""}`;
    const block = `${header}\n\n${s.instructions}`;
    const blockBytes = Buffer.byteLength(block, "utf8");
    if (totalBytes + blockBytes > MAX_SECTION_BYTES) {
      truncated = true;
      break;
    }
    blocks.push(block);
    totalBytes += blockBytes;
  }

  const suffix = truncated
    ? "\n\n---\n\n⚠️ Additional skills were omitted (total skill section exceeded 64 KB)."
    : "";
  return `\n\n---\n# Active Skills\n\n${blocks.join("\n\n---\n\n")}${suffix}`;
}

// ── Skill registry (in-memory, with hot-reload) ─────────────────────────────

export type SkillRegistryEvents = {
  /** Called when a skill is loaded or updated */
  onLoad?: (skill: Skill) => void;
  /** Called when a skill is removed */
  onRemove?: (name: string) => void;
  /** Called when an error occurs during watch/reload */
  onError?: (error: Error, filePath: string) => void;
};

export class SkillRegistry {
  private skills = new Map<string, Skill>();
  private watchers: Array<{ close(): void }> = [];
  private events: SkillRegistryEvents = {};

  constructor(events?: SkillRegistryEvents) {
    if (events) this.events = events;
  }

  register(skill: Skill): this {
    this.skills.set(skill.name, skill);
    this.events.onLoad?.(skill);
    return this;
  }

  unregister(name: string): boolean {
    const removed = this.skills.delete(name);
    if (removed) this.events.onRemove?.(name);
    return removed;
  }

  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  list(): Skill[] {
    return Array.from(this.skills.values());
  }

  async loadDir(dir: string): Promise<this> {
    const loaded = await loadSkills(dir);
    for (const skill of loaded) this.register(skill);
    return this;
  }

  buildSection(forcedNames?: string[]): string {
    return buildSkillSection(this.list(), forcedNames);
  }

  /**
   * Register a skill dynamically from raw markdown content.
   * Useful for agents that create their own skills at runtime
   * (like OpenClaw's self-writing skills).
   *
   * @param markdown - Full SKILL.md content with frontmatter
   * @param sourcePath - Optional virtual path for this skill
   */
  registerDynamic(markdown: string, sourcePath?: string): Skill {
    const { meta, body } = parseFrontmatter(markdown);
    const skill: Skill = {
      name: meta.name ?? `dynamic-${Date.now()}`,
      description: meta.description,
      version: meta.version,
      always: meta.always ?? true,
      tags: meta.tags ?? [],
      instructions: body,
      filePath: sourcePath,
    };
    this.register(skill);
    return skill;
  }

  /**
   * Watch skill directories for changes. Hot-reloads on file
   * create/update and removes on file delete.
   *
   * Inspired by OpenClaw's skills watcher (auto-refresh).
   *
   * @param dirs - Directories to watch
   */
  async watch(dirs: string[]): Promise<void> {
    // Dynamic import since fs.watch may not be available in all envs
    const { watch } = await import("fs");

    for (const dir of dirs) {
      try {
        const watcher = watch(dir, { persistent: false }, async (eventType, filename) => {
          if (!filename) return;
          if (!filename.endsWith(".md") && !filename.endsWith(".mdx")) return;
          if (filename.startsWith("_") || filename.startsWith(".")) return;

          const filePath = path.join(dir, filename);

          if (eventType === "rename") {
            // Could be create or delete — try to read.
            // Always unregister any previously-registered skill at
            // this path BEFORE attempting to load the new one. This prevents the
            // TOCTOU race where rapid create-then-rename events leave both the
            // old and the new skill registered simultaneously, causing double
            // injection of the same instructions into the system prompt.
            for (const [name, skill] of this.skills) {
              if (skill.filePath === filePath) {
                this.unregister(name);
                break;
              }
            }
            try {
              const skill = await loadSkill(filePath);
              this.register(skill);
            } catch {
              // File was deleted — already unregistered above
            }
          } else if (eventType === "change") {
            try {
              const skill = await loadSkill(filePath);
              this.register(skill);
            } catch (err) {
              this.events.onError?.(err instanceof Error ? err : new Error(String(err)), filePath);
            }
          }
        });

        this.watchers.push(watcher);
      } catch {
        // Directory doesn't exist or watcher not supported — skip
      }
    }
  }

  /**
   * Stop watching all directories.
   */
  stopWatching(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
  }

  /**
   * Clear all skills and stop watching.
   */
  clear(): void {
    this.stopWatching();
    this.skills.clear();
  }
}
