/**
 * Skills — In-memory registry with hot-reload.
 *
 * Manages the lifecycle of loaded skills: registration, lookup,
 * directory loading, dynamic registration from raw markdown,
 * and file-system watching for hot-reload.
 *
 * Migrated from the monolithic `skills.ts` with expanded type support.
 *
 * @module skills/registry
 */

import * as path from "path";

import type { Skill } from "./types.js";
import { loadSkill, loadSkills } from "./loader.js";
import { parseFrontmatter, buildSkillFromParsed } from "./frontmatter.js";
import { estimateTokens } from "../utils/tokens.js";

// ── Events ───────────────────────────────────────────────────────────────────

export type SkillRegistryEvents = {
  /** Called when a skill is loaded or updated. */
  onLoad?: (skill: Skill) => void;
  /** Called when a skill is removed. */
  onRemove?: (name: string) => void;
  /** Called when an error occurs during watch/reload. */
  onError?: (error: Error, filePath: string) => void;
};

// ── Registry ─────────────────────────────────────────────────────────────────

export class SkillRegistry {
  private skills = new Map<string, Skill>();
  private watchers: Array<{ close(): void }> = [];
  private events: SkillRegistryEvents = {};

  constructor(events?: SkillRegistryEvents) {
    if (events) this.events = events;
  }

  /**
   * Register a skill. If a skill with the same name exists, it is replaced.
   */
  register(skill: Skill): this {
    this.skills.set(skill.name, skill);
    this.events.onLoad?.(skill);
    return this;
  }

  /**
   * Unregister a skill by name. Returns true if the skill existed.
   */
  unregister(name: string): boolean {
    const removed = this.skills.delete(name);
    if (removed) this.events.onRemove?.(name);
    return removed;
  }

  /**
   * Get a skill by name.
   */
  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * List all registered skills.
   */
  list(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Number of registered skills.
   */
  get size(): number {
    return this.skills.size;
  }

  /**
   * Load all skills from a directory and register them.
   */
  async loadDir(dir: string): Promise<this> {
    const loaded = await loadSkills(dir);
    for (const skill of loaded) this.register(skill);
    return this;
  }

  /**
   * Build the skill section string for system prompt injection.
   */
  buildSection(forcedNames?: string[]): string {
    // Import inline to avoid circular dependency
    return buildSkillSectionFromList(this.list(), forcedNames);
  }

  /**
   * Register a skill dynamically from raw markdown content.
   * Useful for agents that create their own skills at runtime.
   *
   * @param markdown - Full SKILL.md content with frontmatter
   * @param sourcePath - Optional virtual path for this skill
   */
  registerDynamic(markdown: string, sourcePath?: string): Skill {
    const parsed = parseFrontmatter(markdown, sourcePath);
    const skill = buildSkillFromParsed(parsed, {
      filePath: sourcePath,
      source: "dynamic",
    });
    this.register(skill);
    return skill;
  }

  /**
   * Watch skill directories for changes. Hot-reloads on file
   * create/update and removes on file delete.
   *
   * @param dirs - Directories to watch
   */
  async watch(dirs: string[]): Promise<void> {
    const { watch } = await import("fs");

    for (const dir of dirs) {
      try {
        const watcher = watch(dir, { persistent: false }, async (eventType, filename) => {
          if (!filename) return;
          if (!filename.endsWith(".md") && !filename.endsWith(".mdx")) return;
          if (filename.startsWith("_") || filename.startsWith(".")) return;

          const filePath = path.join(dir, filename);

          if (eventType === "rename") {
            // Could be create or delete — unregister first, then try to load.
            // This prevents the TOCTOU race where rapid create-then-rename
            // events leave both old and new skill registered simultaneously.
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

// ── Skill Section Builder ────────────────────────────────────────────────────

/**
 * Maximum total size of the injected skill section.
 * Prevents runaway context consumption when many large skills are registered.
 */
const MAX_SECTION_BYTES = 64 * 1024;

/**
 * Token-aware budget configuration for skill section building.
 */
export type SkillBudgetConfig = {
  /**
   * Fraction of context window allocated to the skills listing.
   * Default: 0.01 (1%).
   */
  budgetPercent?: number;
  /**
   * Context window size in tokens.
   * Default: 128_000.
   */
  contextWindowTokens?: number;
  /**
   * Max characters per skill description in the listing.
   * Descriptions exceeding this are truncated with an ellipsis.
   * Default: 250.
   */
  maxDescriptionChars?: number;
};

/**
 * Build the skill injection block to append to a system prompt.
 * Only includes skills where `always === true` unless `forcedNames` is provided.
 *
 * When `config` is provided, uses token-aware budgeting with progressive
 * degradation:
 * 1. Full descriptions (up to maxDescriptionChars)
 * 2. Descriptions truncated
 * 3. Skills dropped when budget is exceeded
 *
 * Without `config`, falls back to the original byte-based 64KB limit.
 */
export function buildSkillSectionFromList(
  skills: Skill[],
  forcedNames?: string[],
  config?: SkillBudgetConfig,
): string {
  const active = skills.filter((s) => {
    if (s.always) return true;
    if (forcedNames?.includes(s.name)) return true;
    return false;
  });

  if (active.length === 0) return "";

  // If no budget config, use legacy byte-based limit
  if (!config) {
    return buildSectionByteLimit(active);
  }

  // Token-aware budgeting
  return buildSectionTokenBudget(active, config);
}

/**
 * Legacy byte-based section builder (backward compat).
 */
function buildSectionByteLimit(active: Skill[]): string {
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

/**
 * Token-aware section builder with progressive description truncation.
 */
function buildSectionTokenBudget(
  active: Skill[],
  config: SkillBudgetConfig,
): string {
  const budgetTokens = (config.contextWindowTokens ?? 128_000) * (config.budgetPercent ?? 0.01);
  const maxDescChars = config.maxDescriptionChars ?? 250;

  const blocks: string[] = [];
  let totalTokens = 0;
  let truncated = false;

  for (const s of active) {
    // Truncate description if needed
    const desc = s.description
      ? s.description.length > maxDescChars
        ? s.description.slice(0, maxDescChars) + "…"
        : s.description
      : "";

    const header = `## Skill: ${s.name}${desc ? ` — ${desc}` : ""}`;
    const block = `${header}\n\n${s.instructions}`;
    const tokens = estimateTokens(block);

    if (totalTokens + tokens > budgetTokens) {
      truncated = true;
      break;
    }

    blocks.push(block);
    totalTokens += tokens;
  }

  const suffix = truncated
    ? `\n\n---\n\n⚠️ Additional skills were omitted (token budget: ${Math.round(budgetTokens)} tokens).`
    : "";
  return `\n\n---\n# Active Skills\n\n${blocks.join("\n\n---\n\n")}${suffix}`;
}
