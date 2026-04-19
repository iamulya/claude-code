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

import { readFile, readdir, stat, unlink } from "fs/promises";
import { join, relative, resolve, sep } from "path";
import { createHash } from "crypto";
import { atomicWriteFile } from "./atomicWrite.js";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Stored in .kb-source-hashes.json */
export interface SourceHashManifest {
  version: 1;
  generatedAt: number;
  /** relative path from rawDir → SHA-256 hex */
  hashes: Record<string, string>;
  /**
   * SHA-256 of ontology.yaml at the time of the last successful compile.
   * When this changes, all articles are marked stale (O1).
   */
  ontologyHash?: string;
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
    /** True if the ontology changed since last compile */
    ontologyChanged: boolean;
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

/**
 * P0-5: Binary-safe SHA-256. Accepts a Buffer so binary files (PDFs, images)
 * are hashed without UTF-8 decoding mangling their bytes.
 */
function sha256buf(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

// I3 / A3: shared bounded pool for all bulk I/O in this module.
// WALK_CONCURRENCY caps stat() calls inside walkFiles.
// IO_CONCURRENCY caps readFile() calls in computePlan and hashRawFiles.
const WALK_CONCURRENCY = 64;
const IO_CONCURRENCY = 64;

/**
 * Run tasks with at most `limit` in-flight at any time.
 * Like Promise.allSettled but concurrency-bounded.
 */
// B2: not `async` — the function returns `new Promise(...)` directly.
// Making it async would wrap the result in an extra Promise microtask for no benefit.
function pAllSettled<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<Array<PromiseSettledResult<T>>> {
  // B3: guard against limit<=0 which causes the while loop to never fire,
  // leaving the Promise pending forever.
  const concurrency = Math.max(1, limit);
  const results: Array<PromiseSettledResult<T>> = new Array(tasks.length);
  let next = 0;
  let active = 0;
  return new Promise((resolve) => {
    const launch = () => {
      while (active < concurrency && next < tasks.length) {
        const i = next++;
        active++;
        tasks[i]!()
          .then(
            (v) => { results[i] = { status: "fulfilled", value: v }; },
            (e) => { results[i] = { status: "rejected", reason: e }; },
          )
          .finally(() => { active--; launch(); if (active === 0 && next === tasks.length) resolve(results); });
      }
      if (tasks.length === 0) resolve(results);
    };
    launch();
  });
}

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  let permits = WALK_CONCURRENCY;
  const waiters: Array<() => void> = [];

  const acquirePermit = (): Promise<void> => {
    if (permits > 0) { permits--; return Promise.resolve(); }
    return new Promise<void>((resolve) => waiters.push(resolve));
  };
  const releasePermit = (): void => {
    const next = waiters.shift();
    if (next) { next(); } else { permits++; }
  };

  async function recurse(d: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(d);
    } catch {
      return;
    }
    await Promise.all(
      entries.map(async (e) => {
        const full = join(d, e);
        await acquirePermit();
        try {
          const s = await stat(full);
          if (s.isDirectory()) {
            releasePermit();
            await recurse(full);
          } else {
            out.push(full);
            releasePermit();
          }
        } catch {
          releasePermit(); /* skip unreadable */
        }
      }),
    );
  }
  await recurse(dir);
  return out.sort();
}

/**
 * D-2: Split a YAML inline-sequence string on commas, respecting single and
 * double quotes so paths that contain commas (legal on all OSes) are not split.
 *
 * @example
 * splitQuotedList('"/path/a,b.pdf", "/path/c.pdf"')
 * // => ['/path/a,b.pdf', '/path/c.pdf']
 */
function splitQuotedList(inner: string): string[] {
  const items: string[] = [];
  let current = "";
  let inDouble = false;
  let inSingle = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]!;
    if (ch === "\"" && !inSingle) { inDouble = !inDouble; continue; }
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === "," && !inDouble && !inSingle) {
      const trimmed = current.trim();
      if (trimmed) items.push(trimmed);
      current = "";
    } else {
      current += ch;
    }
  }
  const last = current.trim();
  if (last) items.push(last);
  return items;
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
    // D-2: quote-aware split — naive split(",") breaks on paths containing commas
    // e.g. compiled_from: ["/path/a,b.pdf", "/path/c.pdf"] would yield
    // '"path/a', 'b.pdf"', '/path/c.pdf' — both path fragments fail validation.
    return splitQuotedList(inlineMatch[1]!).filter(Boolean);
  }

  return [];
}

// ── DifferentialEngine ────────────────────────────────────────────────────────

export class DifferentialEngine {
  private readonly manifestPath: string;
  private readonly rawDir: string;
  private readonly compiledDir: string;
  private readonly ontologyPath?: string;

  /** Current (freshly computed) hashes */
  private currentHashes: Record<string, string> = {};
  /** Previously stored hashes (undefined = first run) */
  private previousHashes: Record<string, string> | null = null;
  /** Current ontology hash */
  private currentOntologyHash: string | null = null;
  /** Previous ontology hash (from manifest) */
  private previousOntologyHash: string | null = null;

  private constructor(kbDir: string, rawDir: string, compiledDir: string, ontologyPath?: string) {
    this.manifestPath = join(kbDir, ".kb-source-hashes.json");
    this.rawDir = rawDir;
    this.compiledDir = compiledDir;
    this.ontologyPath = ontologyPath;
  }

  /**
   * Create a DifferentialEngine, hashing all raw files and loading the
   * previous manifest from disk (if it exists).
   *
   * @param ontologyPath Optional path to ontology.yaml. When provided,
   *   the engine tracks ontology changes and marks all articles stale
   *   when the ontology schema changes.
   */
  static async create(
    kbDir: string,
    rawDir: string,
    compiledDir: string,
    ontologyPath?: string,
  ): Promise<DifferentialEngine> {
    const engine = new DifferentialEngine(kbDir, rawDir, compiledDir, ontologyPath);
    await engine.hashRawFiles();
    await engine.loadPreviousManifest();
    await engine.hashOntology();
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

    // Check if ontology changed (O1)
    const ontologyChanged = !!(this.currentOntologyHash &&
      this.previousOntologyHash &&
      this.currentOntologyHash !== this.previousOntologyHash);

    // ── Step 2: Scan compiled articles ──────────────────────────────────────

    const compiledFiles = (await walkFiles(this.compiledDir)).filter((f) => f.endsWith(".md"));

    // Map: docId → set of RELATIVE source paths (relative to rawDir)
    const articleSources = new Map<string, Set<string>>();

    await pAllSettled<void>(
      compiledFiles.map((filePath) => async () => {
        try {
          // P2-6: normalize CRLF so regex parsers work on Windows-edited files
          const content = (await readFile(filePath, "utf-8")).replace(/\r\n/g, "\n");
          const sources = parseCompiledFrom(content);
          if (sources.length === 0) return;

          // Derive docId from file path relative to compiledDir, strip .md
          const rel = relative(this.compiledDir, filePath);
          const docId = rel.replace(/\.md$/, "").replace(/\\/g, "/");

          const rawDirResolved = resolve(this.rawDir);
          const relSources = sources
            .map((abs) => {
              // P1-7: reject paths that escape rawDir (crafted compiled_from entries)
              try {
                const absResolved = resolve(abs);
                if (!absResolved.startsWith(rawDirResolved + sep)) return null;
                return relative(rawDirResolved, absResolved);
              } catch {
                return null;
              }
            })
            .filter((p): p is string => p !== null);

          articleSources.set(docId, new Set(relSources));
        } catch {
          /* skip unreadable */
        }
      }),
      IO_CONCURRENCY,
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
      if (anySourceChanged || ontologyChanged) {
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
        ontologyChanged,
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
      ontologyHash: this.currentOntologyHash ?? undefined,
    };
    await atomicWriteFile(this.manifestPath, JSON.stringify(manifest, null, 2));
  }

  /**
   * Delete compiled articles that are orphaned (all contributing sources gone).
   * Returns the list of docIds that were pruned.
   *
   * P1-7: Validates each resolved file path stays within compiledDir before
   * unlinking, preventing path traversal via crafted compiled_from frontmatter.
   */
  async pruneOrphans(orphanDocIds: Set<string>): Promise<string[]> {
    const pruned: string[] = [];
    const compiledDirResolved = resolve(this.compiledDir);

    for (const docId of orphanDocIds) {
      const filePath = join(this.compiledDir, `${docId}.md`);
      // P1-7: reject any path that escapes compiledDir
      const filePathResolved = resolve(filePath);
      if (!filePathResolved.startsWith(compiledDirResolved + sep)) {
        // Path traversal detected — skip silently (do not delete)
        continue;
      }
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
    await pAllSettled<void>(
      compiledFiles.map((filePath) => async () => {
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
      IO_CONCURRENCY,
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
    // A3: bound to IO_CONCURRENCY so we don't open all source files simultaneously.
    const results = await pAllSettled<[string, string] | null>(
      files.map((filePath) => async () => {
        try {
          // P0-5: read as Buffer (no encoding) so binary files hash correctly.
          const content = await readFile(filePath);
          const rel = relative(this.rawDir, filePath);
          return [rel, sha256buf(content)] as [string, string];
        } catch {
          return null;
        }
      }),
      IO_CONCURRENCY,
    );
    this.currentHashes = Object.fromEntries(
      results
        .filter((r): r is PromiseFulfilledResult<[string, string]> =>
          r.status === "fulfilled" && r.value !== null)
        .map((r) => r.value),
    );
  }

  private async loadPreviousManifest(): Promise<void> {
    try {
      // P2-6: normalize CRLF so JSON.parse works on Windows-edited manifests
      const raw = (await readFile(this.manifestPath, "utf-8")).replace(/\r\n/g, "\n");
      const parsed = JSON.parse(raw) as SourceHashManifest;
      if (parsed.version === 1 && parsed.hashes) {
        this.previousHashes = parsed.hashes;
        this.previousOntologyHash = parsed.ontologyHash ?? null;
      }
    } catch {
      this.previousHashes = null; // First run
    }
  }

  /**
   * Compute the SHA-256 hash of the ontology file (O1).
   * When this changes between compiles, all articles are re-synthesized.
   */
  private async hashOntology(): Promise<void> {
    if (!this.ontologyPath) return;
    try {
      const content = await readFile(this.ontologyPath, "utf-8");
      this.currentOntologyHash = sha256(content);
    } catch {
      this.currentOntologyHash = null;
    }
  }
}
