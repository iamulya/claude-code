/**
 * lock.ts — Compile lock file
 *
 * Prevents concurrent `KBCompiler.compile()` calls from corrupting the KB.
 *
 * Fix P0-2: Uses `open('wx')` (O_WRONLY | O_CREAT | O_EXCL) for atomic exclusive
 * lock acquisition — the only correct cross-process mutex on POSIX filesystems.
 * The previous read-then-write approach had a TOCTOU race where two processes
 * could both observe "no lock" and both succeed.
 *
 * Fix P2-8: Uses ESM `import { hostname } from 'os'` — `require('os')` silently
 * fails in ESM modules, causing hostname to always read 'unknown'.
 *
 * Fix P3-2: Heartbeat refreshes `startedAt` every 2 minutes so a live process's
 * lock never expires. Effective TTL = 3 × heartbeat = 6 minutes (down from 10).
 * A crashed process's lock expires in at most 6 minutes; a live process's never.
 */

import { open, unlink, readFile } from "fs/promises";
import { join } from "path";
import { hostname } from "os";
import { atomicWriteFile } from "./atomicWrite.js";

const LOCK_FILENAME = ".kb-compile.lock";
// P3-2: heartbeat-based TTL — must be > heartbeat interval to survive one missed beat
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;        // 2 minutes
const LOCK_TTL_MS           = 3 * HEARTBEAT_INTERVAL_MS; // 6 minutes effective TTL

interface LockContent {
  pid: number;
  /** Timestamp when the lock was first acquired — for user-facing duration reporting. */
  createdAt: number;
  /**
   * Timestamp of the most recent heartbeat — used for TTL liveness check.
   * Refreshed every HEARTBEAT_INTERVAL_MS by startHeartbeat().
   * T-6: Kept separate from createdAt so the error message can report accurate
   * compile duration (createdAt) while TTL uses the heartbeat time (startedAt).
   */
  startedAt: number;
  hostname: string;
}

export class CompileLock {
  private readonly lockPath: string;
  private acquired = false;
  private heartbeatTimer?: ReturnType<typeof setInterval>;

  constructor(kbDir: string) {
    this.lockPath = join(kbDir, LOCK_FILENAME);
  }

  /**
   * Acquire the compile lock.
   *
   * - Uses O_CREAT|O_EXCL for atomic exclusive creation (P0-2).
   * - If the lock already exists: checks TTL vs heartbeat-refreshed startedAt.
   * - If stale (age > 6 min): deletes and retries once.
   * - If live: throws with a user-actionable message.
   *
   * @throws {Error} if another compilation is actively running
   */
  async acquire(maxRetries = 3): Promise<void> {
    if (maxRetries <= 0) {
      throw new Error(
        `KB compile lock at ${this.lockPath} could not be acquired after multiple retries. ` +
        `The lock file may be on a filesystem that does not support O_EXCL, or the lock is ` +
        `being rapidly cycled by another process. Delete the lock file to reset.`,
      );
    }

    const lockContent: LockContent = {
      pid: process.pid,
      createdAt: Date.now(),   // T-6: creation time for user-facing message
      startedAt: Date.now(),   // heartbeat time for TTL liveness check
      hostname: hostname(), // P2-8: ESM import, not require()
    };
    const content = JSON.stringify(lockContent, null, 2);

    // P0-2: O_CREAT | O_EXCL — atomic exclusive create.
    // Exactly one process wins; the loser gets EEXIST.
    try {
      const fh = await open(this.lockPath, "wx"); // wx = O_WRONLY | O_CREAT | O_EXCL
      try {
        await fh.writeFile(content, "utf-8");
      } finally {
        await fh.close();
      }
      this.acquired = true;
      this.startHeartbeat(lockContent);
      return;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      // Lock file exists — fall through to TTL check
    }

    // Read existing lock and check liveness
    let existing: LockContent;
    try {
      const raw = await readFile(this.lockPath, "utf-8");
      existing = JSON.parse(raw) as LockContent;
    } catch {
      // Malformed or disappeared mid-check — retry with decremented counter
      return this.acquire(maxRetries - 1);
    }

    const ageMs = Date.now() - existing.startedAt; // TTL based on last heartbeat
    if (ageMs < LOCK_TTL_MS) {
      // T-6: Use createdAt for the duration the user sees (how long the compile has been running).
      // startedAt is the heartbeat time and reports "45s ago" for a 30-min compile.
      const compileAgeMs = Date.now() - (existing.createdAt ?? existing.startedAt);
      const compileDurationS = Math.round(compileAgeMs / 1000);
      throw new Error(
        `KB compilation is already running (PID ${existing.pid} on ${existing.hostname}, ` +
        `started ${compileDurationS}s ago). ` +
        `If the previous compile crashed, delete ${this.lockPath} to unlock.`,
      );
    }

    // Stale lock (no heartbeat for > 6 min) — delete and retry
    try { await unlink(this.lockPath); } catch { /* already gone */ }
    return this.acquire(maxRetries - 1);
  }

  /**
   * Release the compile lock.
   * Always call this in a `finally` block. Safe to call even if `acquire()` was not called.
   */
  async release(): Promise<void> {
    if (!this.acquired) return;
    // P3-2: stop heartbeat before releasing
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    try {
      await unlink(this.lockPath);
    } catch {
      /* lock already gone — not a problem */
    }
    this.acquired = false;
  }

  // ── P3-2: Heartbeat ────────────────────────────────────────────────────────

  /**
   * Refresh the lock's `startedAt` timestamp every HEARTBEAT_INTERVAL_MS.
   * This prevents a live compile from being evicted by a concurrent process
   * that sees an age > TTL.
   *
   * Calls `unref()` so the heartbeat does not keep the Node.js process alive
   * after everything else has finished.
   */
  private startHeartbeat(initial: LockContent): void {
    this.heartbeatTimer = setInterval(async () => {
      if (!this.acquired) {
        clearInterval(this.heartbeatTimer);
        return;
      }
      try {
        // T-6: Refresh only startedAt (heartbeat time). createdAt is immutable.
        const refreshed: LockContent = { ...initial, startedAt: Date.now() };
        await atomicWriteFile(this.lockPath, JSON.stringify(refreshed, null, 2));
      } catch {
        /* heartbeat failure is non-fatal — lock will expire naturally */
      }
    }, HEARTBEAT_INTERVAL_MS);
    // Don't keep Node alive just for the heartbeat
    this.heartbeatTimer.unref();
  }
}
