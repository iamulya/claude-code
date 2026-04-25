/**
 * Finding 18 — Ingestion Disk Cache
 *
 * Incremental mode re-ingests every raw file on every compile even when
 * nothing changed (the extractor needs full IngestedContent[] for cross-file
 * entity resolution). For large KBs with HTML→Markdown conversion or PDF
 * extraction, this is significant repeated I/O.
 *
 * This module implements a sha256-keyed per-file cache stored under
 * `{kbDir}/.kb-ingest-cache/`. Each entry is a JSON file containing:
 *   - `sourceHash` — sha256 hex of the raw source file bytes
 *   - `cachedAt`   — ISO timestamp
 *   - `content`    — the full serialized IngestedContent, including `images`
 *
 * The `images` field in `IngestedContent` is an `ImageRef[]` whose entries
 * contain local file paths (not base64 data). Paths are stable on disk, so
 * caching them is safe and necessary — vision-extracted PDFs store all
 * extracted image references in `images`, and a cache hit that strips them
 * would cause the synthesizer to silently lose those references.
 *
 * Cache hits avoid re-parsing; cache misses write a new entry. The cache
 * is intentionally append-only — stale entries for deleted source files
 * are pruned by `pruneIngestCache()` called at the end of each compile.
 *
 * **Image data is not cached.** The `images` array of IngestedContent can
 * contain base64-encoded binary data (for vision-extracted PDFs); caching
 * it would inflate the cache to gigabytes. On a cache hit, `images` is
 * restored as an empty array — the grounding/synthesis passes do not use
 * raw image bytes.
 */

import { readFile, mkdir, readdir, stat, unlink } from "fs/promises";
import { join, basename } from "path";
import { createHash } from "crypto";
import type { IngestedContent } from "./types.js";
import { atomicWriteFile } from "../atomicWrite.js";

// ── Types ─────────────────────────────────────────────────────────────────────

type CacheEntry = {
  /** sha256 hex of the source file's raw bytes at cache-write time */
  sourceHash: string;
  /** G-06: sha256 hex of JSON.stringify(content) for integrity verification */
  contentHash?: string;
  /** ISO timestamp when this entry was written */
  cachedAt: string;
  /** Serialized IngestedContent, including the `images` array (ImageRef paths, not binary data) */
  content: IngestedContent;
};

// ── Public API ────────────────────────────────────────────────────────────────

export class IngestCache {
  private readonly cacheDir: string;

  constructor(kbDir: string) {
    this.cacheDir = join(kbDir, ".kb-ingest-cache");
  }

  /**
   * Ensure the cache directory exists. Call once before using get/set.
   */
  async init(): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
  }

  /**
   * Hash a source file and look up a cached IngestedContent.
   *
   * @returns The cached IngestedContent (including images) on a hit, or null on a miss.
   */
  async get(sourceFilePath: string): Promise<IngestedContent | null> {
    try {
      const sourceHash = await hashFile(sourceFilePath);
      const entryPath = this.entryPath(sourceFilePath);
      const raw = await readFile(entryPath, "utf-8");
      const entry = JSON.parse(raw) as CacheEntry;
      if (entry.sourceHash !== sourceHash) {
        // File changed — cache miss.
        return null;
      }
      // G-06: verify content integrity if contentHash is present (new entries have it)
      if (entry.contentHash) {
        const actualHash = createHash("sha256").update(JSON.stringify(entry.content)).digest("hex");
        if (actualHash !== entry.contentHash) {
          // Corrupted or tampered entry — cache miss.
          return null;
        }
      }
      return entry.content;
    } catch {
      // File not found, unreadable, or parse error — cache miss.
      return null;
    }
  }

  /**
   * Write a new cache entry for a source file.
   *
   * B-02 fix: Accepts the already-read source bytes instead of re-reading the
   * file. This eliminates the TOCTOU race where the file could change between
   * the ingester's read and the cache's hash — the hash now matches exactly
   * the bytes that were actually ingested.
   *
   * G-06 fix: Stores a contentHash (SHA-256 of the serialized IngestedContent)
   * for integrity verification on cache reads.
   *
   * Cache write failures are silently ignored — the cache is an optimization
   * and must never block compilation.
   */
  async set(sourceFilePath: string, content: IngestedContent, sourceBytes?: Buffer): Promise<void> {
    try {
      // B-02: use provided bytes if available, otherwise read from disk (backward compat)
      const sourceHash = sourceBytes
        ? createHash("sha256").update(sourceBytes).digest("hex")
        : await hashFile(sourceFilePath);
      // G-06: integrity hash of the cached content
      const contentJson = JSON.stringify(content);
      const contentHash = createHash("sha256").update(contentJson).digest("hex");
      const entry: CacheEntry = {
        sourceHash,
        contentHash,
        cachedAt: new Date().toISOString(),
        content,
      };
      // ADR-012/Fix-10: Use atomicWriteFile for crash safety, consistent with all
      // other disk writes in the system. A crash during writeFile() would produce
      // a corrupt cache entry that silently returns garbage on cache hit.
      const entryPath = this.entryPath(sourceFilePath);
      await atomicWriteFile(entryPath, JSON.stringify(entry));
    } catch {
      // Non-fatal — cache write failure just means a cache miss next time.
    }
  }

  /**
   * Remove cache entries for source files that no longer exist on disk.
   *
   * @param activeSourcePaths Set of absolute paths to currently-present source files.
   *   Entries whose source file is NOT in this set are deleted.
   * @returns Number of stale entries removed.
   */
  async prune(activeSourcePaths: Set<string>): Promise<number> {
    let removed = 0;
    try {
      const entries = await readdir(this.cacheDir);
      for (const file of entries) {
        if (!file.endsWith(".json")) continue;
        const entryPath = join(this.cacheDir, file);
        try {
          const raw = await readFile(entryPath, "utf-8");
          const entry = JSON.parse(raw) as Partial<CacheEntry>;
          const sourcePath = entry.content?.sourceFile;
          if (!sourcePath || !activeSourcePaths.has(sourcePath)) {
            await unlink(entryPath);
            removed++;
          }
        } catch {
          // Corrupt entry — remove it.
          try { await unlink(entryPath); removed++; } catch { /* ignore */ }
        }
      }
    } catch {
      // cacheDir doesn't exist yet — nothing to prune.
    }
    return removed;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  /**
   * Derive a deterministic cache entry path for a given source file.
   * Uses sha256 of the canonical source path so filenames with special chars
   * are handled safely, and two files with different paths never collide.
   */
  private entryPath(sourceFilePath: string): string {
    const key = createHash("sha256").update(sourceFilePath).digest("hex").slice(0, 16);
    const name = basename(sourceFilePath).replace(/[^a-zA-Z0-9._-]/g, "_");
    return join(this.cacheDir, `${name}.${key}.json`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return sha256 hex of a file's raw bytes. */
async function hashFile(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

/** Compact stat: does the file exist and is it a regular file? */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    return s.isFile();
  } catch {
    return false;
  }
}
