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

import { writeFile, rename, unlink } from "fs/promises";

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
    await rename(tmpPath, targetPath);
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
