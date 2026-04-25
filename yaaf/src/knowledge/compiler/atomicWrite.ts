/**
 * atomicWrite.ts — Atomic filesystem write helper
 *
 * Prevents partial-write corruption in KB metadata files (.kb-registry.json,
 * .kb-lint-report.json, ontology.yaml, .kb-source-hashes.json, etc.)
 * by using a write-then-rename strategy.
 *
 * If the process crashes after writeFile() but before rename(), the temp file
 * is left behind but the target file is intact. On the next run, the .tmp file
 * is harmless and ignored.
 */

import { writeFile, rename, unlink, copyFile } from "fs/promises";

// A1 fix: monotonic counter to guarantee unique tmp filenames within one process.
// PID alone is insufficient when two concurrent calls target the same path —
// both would write to `{path}.{pid}.tmp` and the second write silently
// overwrites the first's tmp file before the first rename fires.
let _atomicSeq = 0;

/**
 * Write `content` to `targetPath` atomically.
 * Writes to `{targetPath}.{pid}-{seq}.tmp` then renames to `targetPath`.
 *
 * The `{pid}-{seq}` suffix guarantees a unique tmp name per call within a process.
 * Cross-process: each process uses its own PID so no collision exists.
 *
 * M1: If rename() fails with EXDEV (cross-device link — target and tmp are on
 * different mount points), falls back to copyFile + unlink. This is NOT atomic
 * but is the best we can do across mount points. Windows EPERM is retried once
 * as it often indicates a transient file lock.
 *
 * @throws if the write or rename fails (the tmp file is cleaned up on error)
 *
 * @example
 * ```ts
 * await atomicWriteFile('/path/to/.kb-registry.json', JSON.stringify(data, null, 2))
 * ```
 */
export async function atomicWriteFile(targetPath: string, content: string): Promise<void> {
  const seq = ++_atomicSeq;
  const tmpPath = `${targetPath}.${process.pid}-${seq}.tmp`;
  try {
    await writeFile(tmpPath, content, "utf-8");
    try {
      await rename(tmpPath, targetPath);
    } catch (renameErr) {
      const code = (renameErr as NodeJS.ErrnoException).code;
      if (code === "EXDEV") {
        // M1: Cross-device link — rename impossible. Fall back to copy + unlink.
        // This is NOT fully atomic (a crash between copy and unlink leaves a .tmp),
        // but it's the best we can do without same-device guarantees.
        await copyFile(tmpPath, targetPath);
        try { await unlink(tmpPath); } catch { /* best-effort cleanup */ }
      } else if (code === "EPERM" && process.platform === "win32") {
        // M1: Windows EPERM — often a transient file lock from antivirus or indexer.
        // Wait briefly and retry once.
        await new Promise((r) => setTimeout(r, 50));
        await rename(tmpPath, targetPath);
      } else {
        throw renameErr;
      }
    }
  } catch (err) {
    // Best-effort cleanup: remove the temp file so stale .tmp files don't accumulate
    try {
      await unlink(tmpPath);
    } catch {
      /* cleanup failed — ignore, the .tmp is harmless */
    }
    throw err;
  }
}
