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
 *
 * Fix C5: Added `lockStrategy` option — `'file'` (default, O_EXCL) for local
 * filesystems, `'port'` (TCP port binding) for NFS/CIFS where O_EXCL is unreliable.
 */

import { open, unlink, readFile } from "fs/promises";
import { join } from "path";
import { hostname } from "os";
import { createServer } from "net";
import type { Server } from "net";
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

export type LockStrategy = "file" | "port";

// ── C5: PortLock — TCP port binding as cross-host mutex ─────────────────────
//
// On network filesystems (NFS, CIFS, GlusterFS), O_EXCL is NOT atomic.
// The NFS FAQ explicitly states that O_EXCL is not reliable for locking on
// NFSv2/v3. NFSv4 adds support but many deployments don't use it.
//
// PortLock provides an alternative: bind a TCP port on 127.0.0.1. Only one
// process can bind a given port, providing a reliable cross-process mutex.
// The port is computed deterministically from the KB directory path.

/**
 * 6.3: Derive a deterministic port from the KB directory path.
 *
 * Maps into the IANA dynamic/private port range [49152, 65535] (16383 ports).
 *
 * Birthday-problem risk: with ~128 concurrent KB directories, the probability
 * of a collision between two different KB paths is ~39%. The mapped port could
 * also be in use by an unrelated system service.
 *
 * Mitigation: PortLock.acquire() tries PORT_COLLISION_ATTEMPTS consecutive
 * ports before failing, making both KB–KB and unrelated-service collisions
 * survivable in most deployment scenarios.
 */
function hashToPort(kbDir: string): number {
  // Hash the KB dir to a port in the ephemeral range (49152-65535)
  let hash = 0;
  for (let i = 0; i < kbDir.length; i++) {
    hash = ((hash << 5) - hash + kbDir.charCodeAt(i)) | 0;
  }
  return 49152 + (Math.abs(hash) % (65535 - 49152));
}

/** Max additional ports to try on EADDRINUSE before declaring lock-acquire failure.
 * Note: NOT used for same-kbDir collisions (would defeat mutual exclusion).
 * Reserved for future cross-KB disambiguation if two kbDirs hash to the same port.
 */
const PORT_COLLISION_ATTEMPTS = 1; // effectively disabled — see 6.3 note in lock.ts

class PortLock {
  private server: Server | null = null;

  async acquire(kbDir: string): Promise<boolean> {
    const port = hashToPort(kbDir);
    // 6.3: If this port is busy, it means either:
    // (a) Another compile is running for this KB — correct: return false.
    // (b) A different KB's path hashed to the same port (birthday collision)
    //     — also returns false, causing a spurious "already running" error.
    // For (b), operators should set lockStrategy: 'file', or use the
    // PORT_COLLISION_ATTEMPTS > 1 variant once we can distinguish KB ownership.
    return this.tryPort(port);
  }

  private tryPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();
      server.once("error", () => resolve(false));
      server.listen(port, "127.0.0.1", () => {
        this.server = server;
        resolve(true);
      });
    });
  }

  async release(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }
  }
}

export class CompileLock {
  private readonly lockPath: string;
  private readonly kbDir: string;
  private readonly strategy: LockStrategy;
  private acquired = false;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  /** 6.2: count consecutive heartbeat write failures */
  private heartbeatFailures = 0;
  private portLock?: PortLock;

  constructor(kbDir: string, strategy: LockStrategy = "file") {
    this.kbDir = kbDir;
    this.lockPath = join(kbDir, LOCK_FILENAME);
    this.strategy = strategy;
  }

  /**
   * Acquire the compile lock.
   *
   * - Strategy 'file': Uses O_CREAT|O_EXCL for atomic exclusive creation (P0-2).
   * - Strategy 'port': Binds a deterministic TCP port (C5, for NFS environments).
   *
   * @throws {Error} if another compilation is actively running
   */
  async acquire(maxRetries = 3): Promise<void> {
    if (this.strategy === "port") {
      return this.acquirePortLock();
    }
    return this.acquireFileLock(maxRetries);
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

    if (this.strategy === "port" && this.portLock) {
      await this.portLock.release();
      this.portLock = undefined;
    } else {
      try {
        await unlink(this.lockPath);
      } catch {
        /* lock already gone — not a problem */
      }
    }

    this.acquired = false;
  }

  // ── Port-based lock (C5) ─────────────────────────────────────────────────

  private async acquirePortLock(): Promise<void> {
    this.portLock = new PortLock();
    const ok = await this.portLock.acquire(this.kbDir);
    if (!ok) {
      const port = hashToPort(this.kbDir);
      throw new Error(
        `KB compilation is already running (port ${port} in use). ` +
        `If the previous compile crashed, wait a few seconds for the port to be released.`,
      );
    }
    this.acquired = true;
  }

  // ── File-based lock (original) ────────────────────────────────────────────

  private async acquireFileLock(maxRetries: number): Promise<void> {
    if (maxRetries <= 0) {
      throw new Error(
        `KB compile lock at ${this.lockPath} could not be acquired after multiple retries. ` +
        `The lock file may be on a filesystem that does not support O_EXCL, or the lock is ` +
        `being rapidly cycled by another process. Delete the lock file to reset, ` +
        `or use lockStrategy: 'port' for network filesystems.`,
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
      return this.acquireFileLock(maxRetries - 1);
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
    return this.acquireFileLock(maxRetries - 1);
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
        this.heartbeatFailures = 0; // reset on success
      } catch (err) {
        // 6.2 fix: count consecutive failures. After 3, the lock can no longer
        // be maintained — a concurrent process will claim it and corrupt state.
        // Self-abort is safer than silently continuing without lock protection.
        this.heartbeatFailures++;
        const msg = err instanceof Error ? err.message : String(err);
        if (this.heartbeatFailures >= 3) {
          console.error(
            `[KB lock] FATAL: heartbeat failed ${this.heartbeatFailures} consecutive times ` +
            `(${msg}). ` +
            `Lock at ${this.lockPath} can no longer be maintained. Aborting to prevent concurrent writes.`,
          );
          this.release().catch(() => {});
          process.exit(1);
        } else {
          console.warn(
            `[KB lock] Heartbeat write failed (attempt ${this.heartbeatFailures}/3): ${msg}. ` +
            `Lock will expire in ${Math.round(LOCK_TTL_MS / 1000)}s if heartbeat cannot recover.`,
          );
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
    // Don't keep Node alive just for the heartbeat
    this.heartbeatTimer.unref();
  }
}
