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
import { parse as parseYamlLib } from "yaml";
import { atomicWriteFile } from "./atomicWrite.js";
import { SourceHashManifestSchema } from "./schemas.js";
import { pAllSettled } from "../utils/concurrency.js";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Stored in .kb-source-hashes.json */
export interface SourceHashManifest {
  version: 1;
  generatedAt: number;
  /** relative path from rawDir → SHA-256 hex */
  hashes: Record<string, string>;
  /**
   * SHA-256 of ontology.yaml at the time of the last successful compile.
   *
   * A6 fix: When this changes, the engine now performs a structural diff
   * instead of blindly marking all articles stale. Only articles whose
   * entity type's schema actually changed are re-synthesized.
   *
   * See `classifyOntologyChange()` for the diff logic.
   */
  ontologyHash?: string;
  /**
   * A6: Snapshot of entity type schemas (name → SHA-256 of schema JSON)
   * from the previous compile. Used to determine WHICH entity types changed.
   */
  entityTypeSchemaHashes?: Record<string, string>;
  /**
   * A6-a: Forward wikilink dependency graph.
   * Maps docId → array of docIds it links to via [[wikilinks]].
   * Used to propagate staleness through cross-article dependencies:
   * if article B is recompiled/renamed, articles linking to B need
   * wikilink re-resolution (but NOT full LLM re-synthesis).
   */
  wikilinkDeps?: Record<string, string[]>;
  /**
   * A6-b: DocIds that had unresolved [[wikilinks]] in the previous compile.
   * When vocabulary expands, only these articles need wikilink re-resolution
   * instead of marking all articles for refresh.
   */
  unresolvedWikilinkDocIds?: string[];
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

  /**
   * A6-a: Article docIds that need postprocess wikilink re-resolution
   * but NOT full LLM re-synthesis. This is much cheaper than re-synthesis.
   *
   * These are articles that link to a stale/orphaned article via [[wikilinks]].
   * When the target is renamed or removed, the linker's wikilinks go stale.
   */
  wikilinkRefreshDocIds: Set<string>;

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
    /** A6-a: articles needing wikilink refresh only */
    wikilinkRefreshArticles: number;
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

// M9: pAllSettled extracted to ../utils/concurrency.ts (shared across 4 files).

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

/**
 * Extract the `entity_type:` value from a compiled article's frontmatter.
 * Returns null if not found. Used by the A6 ontology-aware diff to determine
 * which entity type an article belongs to.
 */
function parseEntityType(content: string): string | null {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;
  const match = fmMatch[1]!.match(/^entity_type:\s*(.+?)\s*$/m);
  return match ? match[1]!.trim() : null;
}

/**
 * A6 fix: Classify which entity types have breaking schema changes between
 * two compile manifests. Instead of marking ALL articles stale when the
 * ontology hash changes, only entity types with actual schema differences
 * trigger recompilation.
 *
 * Change classification:
 * - Entity type removed → articles of that type are stale
 * - Entity type schema changed (different field hash) → articles stale
 * - Entity type added → no existing articles affected (additive)
 * - Vocabulary/relationship changes → no existing articles affected (additive)
 * - Comment/whitespace changes → no existing articles affected (cosmetic)
 */
function classifyOntologyChange(
  previousSchemaHashes: Record<string, string> | undefined,
  currentSchemaHashes: Record<string, string>,
): Set<string> {
  if (!previousSchemaHashes) {
    // No previous schema info → can't do fine-grained diff.
    // Return empty set (don't mark anything stale from ontology alone).
    // The blunt ontologyHash check still applies as a fallback.
    return new Set();
  }

  const affected = new Set<string>();

  // Check for removed or changed entity types
  for (const [type, prevHash] of Object.entries(previousSchemaHashes)) {
    const currHash = currentSchemaHashes[type];
    if (!currHash) {
      // Entity type was removed → articles of this type are stale
      affected.add(type);
    } else if (currHash !== prevHash) {
      // Entity type schema changed → articles of this type are stale
      affected.add(type);
    }
  }

  // Added entity types don't affect existing articles (they have no articles yet)
  return affected;
}

/**
 * Compute per-entity-type schema hashes for A6 ontology-aware diff.
 *
 * ADR-012/Fix-7: Uses the same `yaml` library parser as the ontology loader
 * (loader.ts). The previous regex-based approach couldn't handle YAML anchors,
 * aliases, multi-line strings, or comments — producing silently different hashes
 * than the loader's view of the same file. This caused schema changes to go
 * undetected, skipping re-synthesis when it was needed.
 */
function computeEntityTypeSchemaHashes(ontologyContent: string): Record<string, string> {
  const hashes: Record<string, string> = {};

  try {
    const parsed = parseYamlLib(ontologyContent);
    if (!parsed || typeof parsed !== "object" || !parsed.entity_types) return hashes;

    const entityTypes = parsed.entity_types;
    if (typeof entityTypes !== "object" || entityTypes === null) return hashes;

    for (const [typeName, typeValue] of Object.entries(entityTypes)) {
      // Hash the serialised parsed object — guaranteed identical to what the loader sees
      hashes[typeName] = sha256(JSON.stringify(typeValue));
    }
  } catch {
    // YAML parse failure — return empty hashes → all types treated as "changed"
    // which triggers full re-synthesis (safe default)
  }

  return hashes;
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
  /** A6: Per-entity-type schema hashes (current) */
  private currentEntityTypeSchemaHashes: Record<string, string> = {};
  /** A6: Per-entity-type schema hashes (from previous manifest) */
  private previousEntityTypeSchemaHashes: Record<string, string> | null = null;

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

    // A6 fix: Ontology-aware differential classification.
    //
    // Previously (O1): any change to ontology.yaml marked ALL articles stale.
    // Now: we compare per-entity-type schema hashes to determine WHICH types
    // changed. Only articles of affected types are marked stale.
    //
    // Fallback: if the previous manifest has no entityTypeSchemaHashes
    // (compiled by an older version), we fall back to the blunt hash check.
    const ontologyChanged = !!(this.currentOntologyHash &&
      this.previousOntologyHash &&
      this.currentOntologyHash !== this.previousOntologyHash);

    // A6: Compute entity-type-level schema diffs
    const affectedEntityTypes = ontologyChanged
      ? classifyOntologyChange(
          this.previousEntityTypeSchemaHashes ?? undefined,
          this.currentEntityTypeSchemaHashes,
        )
      : new Set<string>();

    // A6: If ontology changed but we have no previous schema hashes (legacy
    // manifest), fall back to marking all articles stale (old O1 behavior).
    const legacyOntologyFallback = ontologyChanged && !this.previousEntityTypeSchemaHashes;

    // ── Step 2: Scan compiled articles ──────────────────────────────────────

    const compiledFiles = (await walkFiles(this.compiledDir)).filter((f) => f.endsWith(".md"));

    // Map: docId → set of RELATIVE source paths (relative to rawDir)
    const articleSources = new Map<string, Set<string>>();
    // A6: Map: docId → entity_type (for ontology-aware staleness)
    const articleEntityTypes = new Map<string, string>();
    // Bug 2 fix: Track stubs so they're never marked "clean"
    const stubDocIds = new Set<string>();

    await pAllSettled<void>(
      compiledFiles.map((filePath) => async () => {
        try {
          // P2-6: normalize CRLF so regex parsers work on Windows-edited files
          const content = (await readFile(filePath, "utf-8")).replace(/\r\n/g, "\n");

          // Derive docId from file path relative to compiledDir, strip .md
          const rel = relative(this.compiledDir, filePath);
          const docId = rel.replace(/\.md$/, "").replace(/\\/g, "/");

          // A6: Extract entity type for ontology-aware staleness
          const entityType = parseEntityType(content);
          if (entityType) articleEntityTypes.set(docId, entityType);

          // Bug 2 fix: detect stubs — they should never be skipped.
          // IMPORTANT: This MUST run before the sources.length === 0 early
          // return below. Stubs have compiled_from: [], so parseCompiledFrom
          // returns []. The old code returned here, which meant stubs were
          // never added to articleSources and the Bug 2 stale-classification
          // in Step 3 was dead code.
          if (/^stub:\s*true/m.test(content)) {
            stubDocIds.add(docId);
          }

          const sources = parseCompiledFrom(content);

          // Register the docId in articleSources even with empty sources.
          // This ensures stubs (compiled_from: []) reach Step 3's
          // classification loop where the Bug 2 fix marks them stale.
          // Previously, the early return here bypassed Step 3 entirely,
          // leaving stubs in limbo (neither clean nor stale).
          if (sources.length === 0) {
            articleSources.set(docId, new Set());
            return;
          }

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
      // Bug 2 fix: stubs are placeholder articles that need full synthesis.
      // They should NEVER be marked clean — always force re-synthesis so
      // the LLM can expand them from their source material.
      if (stubDocIds.has(docId)) {
        staleDocIds.add(docId);
        continue;
      }

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

      // A6 fix: ontology-aware staleness. Only mark this article stale if:
      // 1. Its sources changed, OR
      // 2. Ontology changed AND (legacy fallback OR this article's entity type was affected)
      const ontologyAffectsThis = legacyOntologyFallback ||
        (ontologyChanged && affectedEntityTypes.has(articleEntityTypes.get(docId) ?? ""));

      if (anySourceChanged || ontologyAffectsThis) {
        staleDocIds.add(docId);
      } else {
        cleanDocIds.add(docId);
      }
    }

    // ── A6-a: Wikilink staleness propagation ──────────────────────────────
    //
    // If article B is stale or orphaned, any clean article that links TO B
    // via [[wikilinks]] needs its links re-resolved (B may have been renamed
    // or deleted). These articles don't need full LLM re-synthesis — just
    // a postprocess pass to fix their wikilink targets.
    //
    // Cost: O(E) where E = total wikilink edges in the previous manifest.
    const wikilinkRefreshDocIds = new Set<string>();

    const prevManifest = this.previousHashes !== null
      ? await this.loadFullManifest()
      : null;

    if (prevManifest?.wikilinkDeps && !isFirstRun) {
      // Build reverse-link map: targetDocId → set of articles that link to it
      const reverseLinks = new Map<string, Set<string>>();
      for (const [sourceDocId, targets] of Object.entries(prevManifest.wikilinkDeps)) {
        for (const target of targets) {
          if (!reverseLinks.has(target)) reverseLinks.set(target, new Set());
          reverseLinks.get(target)!.add(sourceDocId);
        }
      }

      // Find clean articles that link to stale/orphaned targets
      const affectedTargets = new Set([...staleDocIds, ...orphanDocIds]);
      for (const targetId of affectedTargets) {
        const linkers = reverseLinks.get(targetId);
        if (!linkers) continue;
        for (const linkerId of linkers) {
          // Only add to refresh if it's currently clean (not already being re-synthesized)
          if (cleanDocIds.has(linkerId) && !staleDocIds.has(linkerId)) {
            wikilinkRefreshDocIds.add(linkerId);
          }
        }
      }
    }

    return {
      staleDocIds,
      cleanDocIds,
      orphanDocIds,
      wikilinkRefreshDocIds,
      addedFiles,
      changedFiles,
      deletedFiles,
      stats: {
        totalArticles: articleSources.size,
        staleArticles: staleDocIds.size,
        cleanArticles: cleanDocIds.size,
        orphanArticles: orphanDocIds.size,
        wikilinkRefreshArticles: wikilinkRefreshDocIds.size,
        totalRawFiles: allCurrentRel.size,
        changedRawFiles: changedRelPaths.size,
        ontologyChanged,
      },
    };
  }

  /**
   * Persist the current source hashes to `.kb-source-hashes.json`.
   * Call this after a successful compile to advance the baseline.
   *
   * @param wikilinkData - A6-a: Optional wikilink dependency data from postprocess
   */
  async save(wikilinkData?: {
    /** docId → array of docIds it links to */
    deps: Record<string, string[]>;
    /** docIds with unresolved [[wikilinks]] */
    unresolvedDocIds: string[];
  }): Promise<void> {
    const manifest: SourceHashManifest = {
      version: 1,
      generatedAt: Date.now(),
      hashes: this.currentHashes,
      ontologyHash: this.currentOntologyHash ?? undefined,
      // A6: persist per-entity-type schema hashes for fine-grained diff on next run
      entityTypeSchemaHashes: Object.keys(this.currentEntityTypeSchemaHashes).length > 0
        ? this.currentEntityTypeSchemaHashes
        : undefined,
      // A6-a: persist wikilink dependency graph
      wikilinkDeps: wikilinkData?.deps,
      // A6-b: persist unresolved wikilink docIds
      unresolvedWikilinkDocIds: wikilinkData?.unresolvedDocIds,
    };
    await atomicWriteFile(this.manifestPath, JSON.stringify(manifest, null, 2));
  }

  /**
   * A6-a: Load the full manifest JSON (not just the hashes field).
   * Used by computePlan() to access wikilinkDeps for staleness propagation.
   */
  private async loadFullManifest(): Promise<SourceHashManifest | null> {
    try {
      const raw = await readFile(this.manifestPath, "utf-8");
      return JSON.parse(raw) as SourceHashManifest;
    } catch {
      return null;
    }
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
      // Sprint 1b: Validate manifest with Zod schema
      const result = SourceHashManifestSchema.safeParse(JSON.parse(raw));
      if (result.success) {
        this.previousHashes = result.data.hashes;
        this.previousOntologyHash = result.data.ontologyHash ?? null;
        // A6: load per-entity-type schema hashes from previous manifest
        this.previousEntityTypeSchemaHashes = (result.data as Record<string, unknown>).entityTypeSchemaHashes as Record<string, string> | null ?? null;
      } else {
        this.previousHashes = null; // Malformed manifest = treat as first run
      }
    } catch {
      this.previousHashes = null; // First run
    }
  }

  /**
   * Compute the SHA-256 hash of the ontology file (O1).
   * A6: Also computes per-entity-type schema hashes for fine-grained diff.
   */
  private async hashOntology(): Promise<void> {
    if (!this.ontologyPath) return;
    try {
      const content = await readFile(this.ontologyPath, "utf-8");
      this.currentOntologyHash = sha256(content);
      // A6: Compute per-entity-type schema hashes
      this.currentEntityTypeSchemaHashes = computeEntityTypeSchemaHashes(content);
    } catch {
      this.currentOntologyHash = null;
    }
  }
}
