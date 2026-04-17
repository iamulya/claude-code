/**
 * src/knowledge/compiler/differential.ts
 *
 * Article-level differential compilation engine.
 *
 * The existing `filterIncremental` works at the *raw-file* level: it decides
 * which source files to RE-INGEST. That still runs the extractor over every
 * ingested file and proposes ALL articles for synthesis — so no article is
 * actually skipped.
 *
 * This module implements true article-level differential compilation:
 *
 * Source hash manifest (.kb-source-hashes.json)
 * maps every raw file to its SHA-256 hash.
 *
 * Compiled article scan (compiled/**\/*.md)
 * reads `compiled_from:` frontmatter from each article to build
 * the reverse map: article → contributing source files.
 *
 * Diff algorithm
 * 1. Hash all current raw files
 * 2. Compare against the stored manifest to find changed/added/deleted files
 * 3. Mark an article STALE if ANY of its sources are in the changed set
 * 4. Mark an article ORPHAN if ALL of its sources are gone
 * 5. Everything else → CLEAN (skip synthesis entirely)
 *
 * The result plugs directly into `CompileOptions.skipDocIds` so the
 * synthesizer never calls the LLM for clean articles.
 *
 * @example
 * ```ts
 * const diff = await DifferentialEngine.create(kbDir, rawDir, compiledDir)
 * const plan = await diff.computePlan()
 * // plan.staleDocIds → recompile these
 * // plan.cleanDocIds → skip these (no LLM call)
 * // plan.orphanDocIds → delete these compiled articles
 * await diff.save() // persist the new source-hash manifest
 * ```
 */

import { readFile, writeFile, readdir, stat, unlink } from "fs/promises";
import { join, relative } from "path";
import { createHash } from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Stored in .kb-source-hashes.json */
export interface SourceHashManifest {
  version: 1;
  generatedAt: number;
  /** relative path from rawDir → SHA-256 hex */
  hashes: Record<string, string>;
}

/** Output of computePlan() */
export interface DifferentialPlan {
  /** Article docIds that must be re-synthesized (source changed or is new) */
  staleDocIds: Set<string>;

  /** Article docIds that can be skipped (all sources unchanged) */
  cleanDocIds: Set<string>;

  /**
   * Article docIds whose ALL contributing sources have been deleted.
   * Call `pruneOrphans()` to remove them from compiled/.
   */
  orphanDocIds: Set<string>;

  /** Raw files that are new (not in previous manifest) */
  addedFiles: string[];

  /** Raw files whose content hash changed */
  changedFiles: string[];

  /** Raw files in the previous manifest that no longer exist */
  deletedFiles: string[];

  /** Summary stats (for display) */
  stats: {
    totalArticles: number;
    staleArticles: number;
    cleanArticles: number;
    orphanArticles: number;
    totalRawFiles: number;
    changedRawFiles: number;
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function recurse(d: string) {
    let entries: string[];
    try {
      entries = await readdir(d);
    } catch {
      return;
    }
    await Promise.all(
      entries.map(async (e) => {
        const full = join(d, e);
        try {
          const s = await stat(full);
          if (s.isDirectory()) await recurse(full);
          else out.push(full);
        } catch {
          /* skip unreadable */
        }
      }),
    );
  }
  await recurse(dir);
  return out.sort();
}

/**
 * Parse the YAML-ish `compiled_from:` block from a compiled article's
 * frontmatter. Handles both inline list and block list YAML formats.
 *
 * ```yaml
 * compiled_from: # block sequence
 * - /path/to/raw/agent.ts
 * - /path/to/raw/docs/agent.md
 * ```
 */
function parseCompiledFrom(content: string): string[] {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return [];
  const fm = fmMatch[1]!;

  // Block sequence: lines starting with " - " after "compiled_from:"
  const blockMatch = fm.match(/compiled_from:\s*\n((?:[ \t]*-[^\n]+\n?)+)/);
  if (blockMatch) {
    return blockMatch[1]!
      .split("\n")
      .map((l) => l.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
  }

  // Inline list: compiled_from: ["/path/a", "/path/b"]
  const inlineMatch = fm.match(/compiled_from:\s*\[([^\]]*)\]/);
  if (inlineMatch) {
    return inlineMatch[1]!
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }

  return [];
}

// ── DifferentialEngine ────────────────────────────────────────────────────────

export class DifferentialEngine {
  private readonly manifestPath: string;
  private readonly rawDir: string;
  private readonly compiledDir: string;

  /** Current (freshly computed) hashes */
  private currentHashes: Record<string, string> = {};
  /** Previously stored hashes (undefined = first run) */
  private previousHashes: Record<string, string> | null = null;

  private constructor(kbDir: string, rawDir: string, compiledDir: string) {
    this.manifestPath = join(kbDir, ".kb-source-hashes.json");
    this.rawDir = rawDir;
    this.compiledDir = compiledDir;
  }

  /**
   * Create a DifferentialEngine, hashing all raw files and loading the
   * previous manifest from disk (if it exists).
   */
  static async create(
    kbDir: string,
    rawDir: string,
    compiledDir: string,
  ): Promise<DifferentialEngine> {
    const engine = new DifferentialEngine(kbDir, rawDir, compiledDir);
    await engine.hashRawFiles();
    await engine.loadPreviousManifest();
    return engine;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Compute the full differential plan by:
   * 1. Diffing current vs. previous raw-file hashes
   * 2. Scanning compiled articles for their `compiled_from` sources
   * 3. Marking articles as stale / clean / orphan
   */
  async computePlan(): Promise<DifferentialPlan> {
    const prev = this.previousHashes ?? {};

    // ── Step 1: Diff raw files ───────────────────────────────────────────────

    const allCurrentRel = new Set(Object.keys(this.currentHashes));
    const allPreviousRel = new Set(Object.keys(prev));

    const addedFiles = [...allCurrentRel].filter((r) => !allPreviousRel.has(r));
    const deletedFiles = [...allPreviousRel].filter((r) => !allCurrentRel.has(r));
    const changedFiles = [...allCurrentRel].filter(
      (r) => allPreviousRel.has(r) && this.currentHashes[r] !== prev[r],
    );

    const changedRelPaths = new Set([...addedFiles, ...changedFiles]);
    const deletedRelPaths = new Set(deletedFiles);

    // No previous manifest → everything is "new" → full compile
    const isFirstRun = this.previousHashes === null;

    // ── Step 2: Scan compiled articles ──────────────────────────────────────

    const compiledFiles = (await walkFiles(this.compiledDir)).filter((f) => f.endsWith(".md"));

    // Map: docId → set of RELATIVE source paths (relative to rawDir)
    const articleSources = new Map<string, Set<string>>();

    await Promise.allSettled(
      compiledFiles.map(async (filePath) => {
        try {
          const content = await readFile(filePath, "utf-8");
          const sources = parseCompiledFrom(content);
          if (sources.length === 0) return;

          // Derive docId from file path relative to compiledDir, strip .md
          const rel = relative(this.compiledDir, filePath);
          const docId = rel.replace(/\.md$/, "").replace(/\\/g, "/");

          const relSources = sources.map((abs) => {
            // compiled_from stores absolute paths — convert to relative from rawDir
            try {
              return relative(this.rawDir, abs);
            } catch {
              return abs;
            }
          });

          articleSources.set(docId, new Set(relSources));
        } catch {
          /* skip unreadable */
        }
      }),
    );

    // ── Step 3: Classify articles ────────────────────────────────────────────

    const staleDocIds: Set<string> = new Set();
    const cleanDocIds: Set<string> = new Set();
    const orphanDocIds: Set<string> = new Set();

    for (const [docId, sources] of articleSources) {
      if (isFirstRun) {
        // First run: all existing compiled articles are "clean" (already built)
        cleanDocIds.add(docId);
        continue;
      }

      const allSourcesGone = [...sources].every((s) => deletedRelPaths.has(s));
      if (allSourcesGone && sources.size > 0) {
        orphanDocIds.add(docId);
        continue;
      }

      const anySourceChanged = [...sources].some((s) => changedRelPaths.has(s));
      if (anySourceChanged) {
        staleDocIds.add(docId);
      } else {
        cleanDocIds.add(docId);
      }
    }

    return {
      staleDocIds,
      cleanDocIds,
      orphanDocIds,
      addedFiles,
      changedFiles,
      deletedFiles,
      stats: {
        totalArticles: articleSources.size,
        staleArticles: staleDocIds.size,
        cleanArticles: cleanDocIds.size,
        orphanArticles: orphanDocIds.size,
        totalRawFiles: allCurrentRel.size,
        changedRawFiles: changedRelPaths.size,
      },
    };
  }

  /**
   * Persist the current source hashes to `.kb-source-hashes.json`.
   * Call this after a successful compile to advance the baseline.
   */
  async save(): Promise<void> {
    const manifest: SourceHashManifest = {
      version: 1,
      generatedAt: Date.now(),
      hashes: this.currentHashes,
    };
    await writeFile(this.manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  }

  /**
   * Delete compiled articles that are orphaned (all contributing sources gone).
   * Returns the list of docIds that were pruned.
   */
  async pruneOrphans(orphanDocIds: Set<string>): Promise<string[]> {
    const pruned: string[] = [];
    for (const docId of orphanDocIds) {
      const filePath = join(this.compiledDir, `${docId}.md`);
      try {
        await unlink(filePath);
        pruned.push(docId);
      } catch {
        /* already gone */
      }
    }
    return pruned;
  }

  /**
   * The raw files that need to be ingested for a differential compile.
   * Only returns files that contributed to stale articles (or are new/unknown).
   */
  async rawFilesForStaleArticles(staleDocIds: Set<string>, compiledDir: string): Promise<string[]> {
    // Collect all source paths referenced by stale articles
    const neededSources = new Set<string>();

    const compiledFiles = (await walkFiles(compiledDir)).filter((f) => f.endsWith(".md"));
    await Promise.allSettled(
      compiledFiles.map(async (filePath) => {
        const rel = relative(compiledDir, filePath).replace(/\.md$/, "").replace(/\\/g, "/");
        if (!staleDocIds.has(rel)) return;

        try {
          const content = await readFile(filePath, "utf-8");
          const sources = parseCompiledFrom(content);
          for (const abs of sources) neededSources.add(abs);
        } catch {
          /* skip */
        }
      }),
    );

    // Also include previously-unknown files (not in any compiled article yet)
    const prev = this.previousHashes ?? {};
    for (const relPath of Object.keys(this.currentHashes)) {
      if (!(relPath in prev)) {
        neededSources.add(join(this.rawDir, relPath));
      }
    }

    return [...neededSources].filter(Boolean).sort();
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async hashRawFiles(): Promise<void> {
    const files = await walkFiles(this.rawDir);
    const entries = await Promise.all(
      files.map(async (filePath) => {
        try {
          const content = await readFile(filePath, "utf-8");
          const rel = relative(this.rawDir, filePath);
          return [rel, sha256(content)] as [string, string];
        } catch {
          return null;
        }
      }),
    );
    this.currentHashes = Object.fromEntries(
      entries.filter((e): e is [string, string] => e !== null),
    );
  }

  private async loadPreviousManifest(): Promise<void> {
    try {
      const raw = await readFile(this.manifestPath, "utf-8");
      const parsed = JSON.parse(raw) as SourceHashManifest;
      if (parsed.version === 1 && parsed.hashes) {
        this.previousHashes = parsed.hashes;
      }
    } catch {
      this.previousHashes = null; // First run
    }
  }
}
