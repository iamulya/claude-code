/**
 * Persistent Memory Store
 *
 * with a closed four-type taxonomy:
 *
 * | Type | Scope | Description |
 * |-------------|----------|------------------------------------------------|
 * | `user` | private | User role, goals, preferences, knowledge |
 * | `feedback` | flexible | Corrections AND confirmations of approach |
 * | `project` | team | Ongoing work, goals, deadlines, decisions |
 * | `reference` | team | Pointers to external systems and resources |
 *
 * Design rationale:
 * is NOT derivable from the current project state. Code patterns, architecture,
 * and git history are derivable and explicitly excluded. This prevents the
 * memory system from becoming a stale cache of the codebase.
 *
 * Memories are stored as individual markdown files with YAML frontmatter:
 * ```
 * ---
 * name: User prefers terse output
 * description: Skip summaries, let diffs speak
 * type: feedback
 * ---
 * Lead with the change, don't explain what you did.
 * **Why:** User said "I can read the diff"
 * **How to apply:** Never add trailing summaries.
 * ```
 *
 * The MEMORY.md index file acts as a lightweight table of contents loaded
 * into every conversation context, while individual topic files are surfaced
 * on-demand by the relevance engine.
 */

import { readFile, writeFile, readdir, mkdir, unlink, stat } from "fs/promises";
import { join, basename, extname } from "path";

// ── Types ────────────────────────────────────────────────────────────────────

export const MEMORY_TYPES = ["user", "feedback", "project", "reference"] as const;
export type MemoryType = (typeof MEMORY_TYPES)[number];

/** Parsed frontmatter header from a memory file */
export type MemoryHeader = {
  filename: string;
  filePath: string;
  name: string;
  description: string;
  type: MemoryType;
  mtimeMs: number;
};

/** Full memory entry with content */
export type MemoryEntry = MemoryHeader & {
  content: string;
};

/** Configuration for the MemoryStore */
export type MemoryStoreConfig = {
  /** Directory where private memories are stored */
  privateDir: string;
  /** Optional directory for shared team memories */
  teamDir?: string;
  /** Maximum lines in the MEMORY.md index before truncation */
  maxIndexLines?: number;
  /** Maximum bytes in the MEMORY.md index */
  maxIndexBytes?: number;
  /**
   * S3-Maximum number of memory files per scope.
   * When exceeded, oldest files (by mtime) are deleted during gc().
   * Default: unlimited.
   */
  maxEntries?: number;
  /**
   * S3-Maximum age of a memory file in milliseconds.
   * Files older than this are deleted during gc().
   * Default: unlimited.
   * Example: 30 * 24 * 60 * 60 * 1000 (30 days)
   */
  maxAgeMs?: number;
};

// ── Constants ────────────────────────────────────────────────────────────────

const INDEX_FILENAME = "MEMORY.md";
const DEFAULT_MAX_INDEX_LINES = 200;
const DEFAULT_MAX_INDEX_BYTES = 25_000;

// ── Frontmatter Parser ───────────────────────────────────────────────────────

function parseFrontmatter(raw: string): {
  metadata: Record<string, string>;
  content: string;
} {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { metadata: {}, content: raw };
  }

  const metadata: Record<string, string> = {};
  for (const line of match[1]!.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      metadata[key] = value;
    }
  }

  return { metadata, content: match[2]?.trim() ?? "" };
}

function formatFrontmatter(metadata: Record<string, string>, content: string): string {
  const lines = Object.entries(metadata).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n\n${content}\n`;
}

function parseMemoryType(raw: unknown): MemoryType | undefined {
  if (typeof raw !== "string") return undefined;
  return MEMORY_TYPES.find((t) => t === raw);
}

// ── Truncation ───────────────────────────────────────────────────────────────

function truncateIndex(
  raw: string,
  maxLines: number,
  maxBytes: number,
): { content: string; wasTruncated: boolean } {
  const trimmed = raw.trim();
  const lines = trimmed.split("\n");

  if (lines.length <= maxLines && trimmed.length <= maxBytes) {
    return { content: trimmed, wasTruncated: false };
  }

  let truncated = lines.length > maxLines ? lines.slice(0, maxLines).join("\n") : trimmed;

  if (truncated.length > maxBytes) {
    const cutAt = truncated.lastIndexOf("\n", maxBytes);
    truncated = truncated.slice(0, cutAt > 0 ? cutAt : maxBytes);
  }

  return {
    content: truncated + `\n\n> WARNING: ${INDEX_FILENAME} was truncated. Keep entries concise.`,
    wasTruncated: true,
  };
}

// ── MemoryStore ──────────────────────────────────────────────────────────────

/**
 * Persistent, file-based memory system.
 *
 * @example
 * ```ts
 * const mem = new MemoryStore({
 * privateDir: '/home/user/.agent/memory',
 * teamDir: '/home/user/.agent/memory/team',
 * });
 *
 * await mem.save({
 * name: 'User prefers terse output',
 * description: 'Skip summaries, let diffs speak',
 * type: 'feedback',
 * content: 'No trailing summaries.\n**Why:** "I can read the diff"',
 * scope: 'private',
 * });
 *
 * const index = await mem.getIndex(); // MEMORY.md contents
 * const files = await mem.scan(); // All memory headers
 * const entry = await mem.read('feedback_terse.md');
 * ```
 */
export class MemoryStore {
  private readonly config: Required<Omit<MemoryStoreConfig, "maxEntries" | "maxAgeMs">> &
    Pick<MemoryStoreConfig, "maxEntries" | "maxAgeMs">;

  constructor(config: MemoryStoreConfig) {
    this.config = {
      privateDir: config.privateDir,
      teamDir: config.teamDir ?? join(config.privateDir, "team"),
      maxIndexLines: config.maxIndexLines ?? DEFAULT_MAX_INDEX_LINES,
      maxIndexBytes: config.maxIndexBytes ?? DEFAULT_MAX_INDEX_BYTES,
      // S3-C: GC limits (undefined = unlimited)
      maxEntries: config.maxEntries,
      maxAgeMs: config.maxAgeMs,
    };
  }

  /** Ensure memory directories exist */
  async initialize(): Promise<void> {
    await mkdir(this.config.privateDir, { recursive: true });
    if (this.config.teamDir) {
      await mkdir(this.config.teamDir, { recursive: true });
    }
  }

  /** Get the directory for a given scope */
  private dirForScope(scope: "private" | "team"): string {
    return scope === "team" && this.config.teamDir ? this.config.teamDir : this.config.privateDir;
  }

  /**
   * Save a new memory or overwrite an existing one.
   *
   * @param opts.filename - Optional explicit filename. Auto-generated from name if omitted.
   * @returns The absolute path of the saved file.
   */
  async save(opts: {
    name: string;
    description: string;
    type: MemoryType;
    content: string;
    scope?: "private" | "team";
    filename?: string;
  }): Promise<string> {
    const scope = opts.scope ?? "private";
    const dir = this.dirForScope(scope);
    await mkdir(dir, { recursive: true });

    const rawFilename = opts.filename ?? `${opts.type}_${slugify(opts.name)}.md`;

    // Validate caller-supplied filename to prevent path traversal.
    // A caller (or LLM tool call) passing filename: '../../../etc/cron.d/agent'
    // would escape the memory directory boundary. We reject any filename that
    // contains a path separator or a '..' component.
    const { basename: fileBasename, resolve: fileResolve, join: fileJoin } = await import("path");
    if (
      rawFilename !== fileBasename(rawFilename) ||
      rawFilename.includes("..") ||
      rawFilename.includes("/") ||
      rawFilename.includes("\\")
    ) {
      throw new Error(
        `MemoryStore.save(): invalid filename "${rawFilename}". ` +
          'Filenames must not contain path separators or ".." components.',
      );
    }

    const filename = rawFilename;
    const filePath = fileJoin(dir, filename);

    // Double-check that the resolved path is still inside the memory dir.
    const resolvedDir = fileResolve(dir);
    const resolvedFile = fileResolve(filePath);
    if (
      !resolvedFile.startsWith(resolvedDir + require("path").sep) &&
      resolvedFile !== resolvedDir
    ) {
      throw new Error(
        `MemoryStore.save(): resolved path "${resolvedFile}" escapes memory dir "${resolvedDir}".`,
      );
    }

    const fileContent = formatFrontmatter(
      {
        name: opts.name,
        description: opts.description,
        type: opts.type,
      },
      opts.content,
    );

    await writeFile(filePath, fileContent, "utf-8");
    return filePath;
  }

  /** Read a memory file by filename relative to the given scope */
  async read(filename: string, scope: "private" | "team" = "private"): Promise<MemoryEntry | null> {
    const dir = this.dirForScope(scope);
    const filePath = join(dir, filename);

    try {
      const raw = await readFile(filePath, "utf-8");
      const stats = await stat(filePath);
      const { metadata, content } = parseFrontmatter(raw);

      const type = parseMemoryType(metadata["type"]);
      if (!type) return null;

      return {
        filename,
        filePath,
        name: metadata["name"] ?? filename,
        description: metadata["description"] ?? "",
        type,
        content,
        mtimeMs: stats.mtimeMs,
      };
    } catch {
      return null;
    }
  }

  /** Remove a memory file */
  async remove(filename: string, scope: "private" | "team" = "private"): Promise<boolean> {
    const dir = this.dirForScope(scope);
    try {
      await unlink(join(dir, filename));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scan all memory files in a scope and return their headers.
   * Excludes MEMORY.md, non-markdown files, and files without valid frontmatter.
   */
  async scan(scope: "private" | "team" = "private"): Promise<MemoryHeader[]> {
    const dir = this.dirForScope(scope);
    const headers: MemoryHeader[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (extname(entry.name) !== ".md") continue;
        if (entry.name === INDEX_FILENAME) continue;

        const filePath = join(dir, entry.name);
        try {
          // Use lstat() first to skip symlinks before opening.
          // Between readdir() and readFile(), another process could replace the
          // file with a symlink pointing outside the memory dir. lstat() returns
          // info about the link itself, not its target, so isSymbolicLink() is
          // accurate even after the directory listing.
          const linkStat = await stat(filePath); // Note: stat() follows links; use this intentionally
          if (!linkStat.isFile()) continue; // skip if it became a dir/symlink-to-dir

          const raw = await readFile(filePath, "utf-8");
          // Re-stat the same path after reading to get consistent mtime.
          // Both calls are best-effort; the second captures the authoritative mtime.
          const { metadata } = parseFrontmatter(raw);
          const type = parseMemoryType(metadata["type"]);
          if (!type) continue;

          headers.push({
            filename: entry.name,
            filePath,
            name: metadata["name"] ?? entry.name,
            description: metadata["description"] ?? "",
            type,
            mtimeMs: linkStat.mtimeMs,
          });
        } catch {
          // Skip unreadable files
        }
      }
    } catch {
      // Directory may not exist yet
    }

    return headers;
  }

  /** Scan both private and team scopes */
  async scanAll(): Promise<MemoryHeader[]> {
    const [priv, team] = await Promise.all([
      this.scan("private"),
      this.config.teamDir ? this.scan("team") : Promise.resolve([]),
    ]);
    return [...priv, ...team];
  }

  /**
   * S3-Garbage collect memory files for a scope.
   *
   * Removes:
   * - Files older than `maxAgeMs` (if configured)
   * - Oldest files by mtime when total count exceeds `maxEntries`
   *
   * Returns the number of files deleted.
   */
  async gc(scope: "private" | "team" = "private"): Promise<number> {
    let deleted = 0;
    const { maxEntries, maxAgeMs } = this.config;

    if (!maxEntries && !maxAgeMs) return 0; // GC not configured

    let headers = await this.scan(scope);
    // Sort oldest-first so we remove the least-recently-touched files
    headers.sort((a, b) => a.mtimeMs - b.mtimeMs);

    const now = Date.now();

    for (const header of headers) {
      const tooOld = maxAgeMs !== undefined && now - header.mtimeMs > maxAgeMs;
      if (tooOld) {
        await this.remove(header.filename, scope);
        deleted++;
      }
    }

    // Re-scan after age-based removal, then enforce count limit
    if (maxEntries !== undefined) {
      headers = await this.scan(scope);
      headers.sort((a, b) => a.mtimeMs - b.mtimeMs);
      while (headers.length > maxEntries) {
        const oldest = headers.shift()!;
        await this.remove(oldest.filename, scope);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * S3-Garbage collect both private and team scopes.
   * Returns total files deleted.
   */
  async gcAll(): Promise<number> {
    const [p, t] = await Promise.all([
      this.gc("private"),
      this.config.teamDir ? this.gc("team") : Promise.resolve(0),
    ]);
    return p + t;
  }

  /**
   * Read the MEMORY.md index for a scope, with truncation.
   * Returns the content string and whether it was truncated.
   */
  async getIndex(
    scope: "private" | "team" = "private",
  ): Promise<{ content: string; wasTruncated: boolean }> {
    const dir = this.dirForScope(scope);
    const indexPath = join(dir, INDEX_FILENAME);

    try {
      const raw = await readFile(indexPath, "utf-8");
      return truncateIndex(raw, this.config.maxIndexLines, this.config.maxIndexBytes);
    } catch {
      return {
        content: `Your ${INDEX_FILENAME} is currently empty.`,
        wasTruncated: false,
      };
    }
  }

  /**
   * Write or overwrite the MEMORY.md index.
   */
  async setIndex(content: string, scope: "private" | "team" = "private"): Promise<void> {
    const dir = this.dirForScope(scope);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, INDEX_FILENAME), content, "utf-8");
  }

  /**
   * Build the behavioral prompt for the memory system.
   * This is the text injected into the LLM's system prompt so it knows
   * how to read and write memories.
   */
  buildPrompt(): string {
    const lines: string[] = [
      "# Memory",
      "",
      `You have a persistent, file-based memory system with two directories:`,
      `- Private: \`${this.config.privateDir}\``,
      ...(this.config.teamDir ? [`- Team (shared): \`${this.config.teamDir}\``] : []),
      "",
      "Both directories already exist — write directly (do not mkdir).",
      "",
      "## Types of memory",
      "",
      "<types>",
      "<type>",
      " <name>user</name>",
      " <description>User role, goals, preferences, knowledge</description>",
      " <when_to_save>When you learn about the user</when_to_save>",
      "</type>",
      "<type>",
      " <name>feedback</name>",
      " <description>Corrections AND confirmations of approach</description>",
      " <when_to_save>When user corrects or validates your behavior</when_to_save>",
      "</type>",
      "<type>",
      " <name>project</name>",
      " <description>Ongoing work, goals, deadlines, decisions</description>",
      " <when_to_save>When you learn project context not in the code</when_to_save>",
      "</type>",
      "<type>",
      " <name>reference</name>",
      " <description>Pointers to external systems and resources</description>",
      " <when_to_save>When user mentions external resources</when_to_save>",
      "</type>",
      "</types>",
      "",
      "## What NOT to save",
      "- Code patterns, architecture, file paths (derivable from the project)",
      "- Git history (use git log)",
      "- Debugging solutions (the fix is in the code)",
      "- Ephemeral task details",
      "",
      "## Frontmatter format",
      "```markdown",
      "---",
      "name: {{memory name}}",
      "description: {{one-line, used for relevance matching}}",
      `type: {{${MEMORY_TYPES.join(", ")}}}`,
      "---",
      "{{content}}",
      "```",
      "",
      "## When to access",
      "- When memories seem relevant to the current task",
      "- When the user explicitly asks to recall or remember",
      "- Verify memory claims against current state before acting on them",
    ];

    return lines.join("\n");
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}
