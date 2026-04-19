/**
 * Article Versioning — Phase 1A
 *
 * Before writing a compiled article, this module:
 * 1. Checks if the content is identical (SHA-256 hash) — skips if unchanged
 * 2. Copies the existing article to .versions/{docId}/{timestamp}.md
 * 3. Writes the new version
 * 4. Prunes old versions beyond maxVersions
 *
 * This prevents data loss when the LLM produces a degraded article.
 */

import { readFile, mkdir, readdir, unlink, stat } from "fs/promises";
import { join, dirname, relative } from "path";
import { createHash } from "crypto";
import { atomicWriteFile } from "./atomicWrite.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ArticleVersion {
  hash: string;
  timestamp: number;
  wordCount: number;
  sizeBytes: number;
}

export interface WriteResult {
  action: "created" | "updated" | "unchanged";
  previousHash?: string;
  currentHash: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_MAX_VERSIONS = 5;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Write an article to disk with versioning.
 * If the content is identical to the existing file, returns 'unchanged'.
 * Otherwise, backs up the existing file and writes the new content.
 */
export async function writeWithVersioning(
  outputPath: string,
  newContent: string,
  versionsDir: string,
  compiledDir: string,           // P1-5: full relative path requires knowing compiled root
  maxVersions: number = DEFAULT_MAX_VERSIONS,
): Promise<WriteResult> {
  const newHash = contentHash(newContent);

  // Check if file exists and compare
  let existingContent: string | null = null;
  try {
    existingContent = await readFile(outputPath, "utf-8");
  } catch {
    /* file doesn't exist — will create */
  }

  if (existingContent !== null) {
    const existingHash = contentHash(existingContent);

    // Identical content — skip write
    if (existingHash === newHash) {
      return { action: "unchanged", previousHash: existingHash, currentHash: newHash };
    }

    // Back up existing version
    await backupVersion(outputPath, existingContent, versionsDir, compiledDir);

    // Prune old versions
    await pruneVersions(outputPath, versionsDir, compiledDir, maxVersions);
  }

  // Write new version (P0-3: atomic write prevents crash-induced corruption)
  await mkdir(dirname(outputPath), { recursive: true });
  await atomicWriteFile(outputPath, newContent);

  return {
    action: existingContent !== null ? "updated" : "created",
    previousHash: existingContent !== null ? contentHash(existingContent) : undefined,
    currentHash: newHash,
  };
}

/**
 * List all saved versions of an article, newest first.
 *
 * @param compiledDir - Root compiled/ directory. Required for full-path version
 *   subdirectory resolution (P1-5). Pass the same compiledDir used by KnowledgeSynthesizer.
 */
export async function listVersions(
  outputPath: string,
  versionsDir: string,
  compiledDir: string,
): Promise<ArticleVersion[]> {
  const versionDir = versionDirForArticle(outputPath, versionsDir, compiledDir);
  try {
    const files = await readdir(versionDir);
    const versions: ArticleVersion[] = [];

    for (const file of files.sort().reverse()) {
      if (!file.endsWith(".md")) continue;
      const fullPath = join(versionDir, file);
      try {
        const content = await readFile(fullPath, "utf-8");
        const s = await stat(fullPath);
        versions.push({
          hash: contentHash(content),
          timestamp: s.mtimeMs,
          wordCount: content.split(/\s+/).filter(Boolean).length,
          sizeBytes: s.size,
        });
      } catch {
        /* skip unreadable */
      }
    }

    return versions;
  } catch {
    return [];
  }
}

/**
 * Roll back an article to a previous version.
 * The current version is saved as a new version before rollback.
 */
export async function rollbackToVersion(
  outputPath: string,
  versionsDir: string,
  compiledDir: string,           // P1-5
  timestamp: number,
): Promise<boolean> {
  const versionDir = versionDirForArticle(outputPath, versionsDir, compiledDir);
  try {
    const files = await readdir(versionDir);
    const targetFile = files.find((f) => {
      const ts = parseInt(f.replace(".md", ""), 10);
      return Math.abs(ts - timestamp) < 1000; // within 1 second
    });

    if (!targetFile) return false;

    const versionContent = await readFile(join(versionDir, targetFile), "utf-8");

    // Back up current before rollback
    try {
      const current = await readFile(outputPath, "utf-8");
      await backupVersion(outputPath, current, versionsDir, compiledDir);
    } catch {
      /* no current file — that's fine */
    }

    await atomicWriteFile(outputPath, versionContent); // P0-3: atomic rollback write
    return true;
  } catch {
    return false;
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function contentHash(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex").slice(0, 16);
}

/**
 * P1-5: Use the full relative path (from compiledDir) as the version subdirectory.
 * The old implementation used only the last 2 path segments, causing collisions
 * when two articles share the same basename under different subdirectories
 * (e.g. compiled/concepts/transformer.md vs compiled/research-papers/concepts/transformer.md).
 */
function versionDirForArticle(
  outputPath: string,
  versionsDir: string,
  compiledDir: string,
): string {
  const relPath = relative(compiledDir, outputPath)
    .replace(/\.md$/, "")
    .replace(/\\/g, "/");  // normalize Windows separators
  return join(versionsDir, relPath);
}

async function backupVersion(
  outputPath: string,
  content: string,
  versionsDir: string,
  compiledDir: string,
): Promise<void> {
  const versionDir = versionDirForArticle(outputPath, versionsDir, compiledDir);
  await mkdir(versionDir, { recursive: true });
  const timestamp = Date.now();
  // A2 fix: append a 6-char content hash suffix to avoid filename collision when
  // two articles are updated concurrently at the same millisecond. The suffix is
  // deterministic (same content → same suffix) so retries are idempotent.
  const hashSuffix = contentHash(content).slice(0, 6);
  const versionPath = join(versionDir, `${timestamp}-${hashSuffix}.md`);
  await atomicWriteFile(versionPath, content); // P0-3: atomic backup
}

async function pruneVersions(
  outputPath: string,
  versionsDir: string,
  compiledDir: string,
  maxVersions: number,
): Promise<void> {
  const versionDir = versionDirForArticle(outputPath, versionsDir, compiledDir);
  try {
    const files = (await readdir(versionDir)).filter((f) => f.endsWith(".md")).sort(); // oldest first (timestamp filenames)

    if (files.length <= maxVersions) return;

    const toDelete = files.slice(0, files.length - maxVersions);
    await Promise.all(toDelete.map((f) => unlink(join(versionDir, f))));
  } catch {
    /* version dir may not exist */
  }
}
