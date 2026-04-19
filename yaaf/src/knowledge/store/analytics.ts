/**
 * KBAnalytics — Runtime document hit analytics for compile feedback (GAP-1)
 *
 * Records which documents are fetched and searched during agent sessions.
 * Writes asynchronously to a ring-buffer JSONL file (.kb-analytics.jsonl)
 * so it never blocks the critical path.
 *
 * The compiler's Discovery phase can consume this file to prioritize
 * re-synthesis of frequently-accessed but stale articles.
 *
 * Usage:
 * ```ts
 * const analytics = new KBAnalytics(kbDir)
 * store.setAnalytics(analytics)
 * // ... agent session ...
 * await analytics.destroy() // flush on server shutdown
 * ```
 */

import { appendFile, mkdir } from "fs/promises";
import { join, dirname } from "path";

const ANALYTICS_FILENAME = ".kb-analytics.jsonl";
const FLUSH_DEBOUNCE_MS = 5_000; // flush every 5 seconds of idle time
const MAX_BUFFER_SIZE = 500;     // force flush if buffer grows beyond this

// ── Types ─────────────────────────────────────────────────────────────────────

export type KBHitRecord = {
  /** Unix timestamp (ms) */
  ts: number;
  /** The docId that was accessed */
  docId: string;
  /** The search query that led to this hit (empty for direct fetch) */
  query: string;
  /** Relevance score from the search adapter (0–1), or 1.0 for direct fetch */
  score: number;
  /** Namespace prefix if this was a federated access */
  namespace?: string;
};

// ── KBAnalytics ───────────────────────────────────────────────────────────────

export class KBAnalytics {
  private readonly analyticsPath: string;
  private buffer: KBHitRecord[] = [];
  private flushTimer?: ReturnType<typeof setTimeout>;
  private destroyed = false;

  constructor(kbDir: string) {
    this.analyticsPath = join(kbDir, ANALYTICS_FILENAME);
  }

  /**
   * Record a document hit.
   *
   * Non-blocking — appends to an in-memory buffer and schedules a debounced flush.
   * Never throws; analytics failures are fully non-fatal.
   *
   * @param record - Hit to record (ts is added automatically)
   */
  recordHit(record: Omit<KBHitRecord, "ts">): void {
    if (this.destroyed) return;
    this.buffer.push({ ts: Date.now(), ...record });

    // Force flush if buffer is getting large
    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      void this.flush();
      return;
    }

    // Schedule debounced flush
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => void this.flush(), FLUSH_DEBOUNCE_MS);
      // Don't keep Node.js alive just for analytics
      if (typeof this.flushTimer?.unref === "function") {
        this.flushTimer.unref();
      }
    }
  }

  /**
   * Flush in-memory buffer to disk.
   * Appends records as newline-delimited JSON to .kb-analytics.jsonl.
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    if (this.buffer.length === 0) return;

    const records = this.buffer.splice(0); // atomic-ish drain
    const lines = records.map((r) => JSON.stringify(r)).join("\n") + "\n";

    try {
      await mkdir(dirname(this.analyticsPath), { recursive: true });
      await appendFile(this.analyticsPath, lines, "utf-8");
    } catch {
      // Non-fatal: analytics loss is acceptable
    }
  }

  /**
   * Flush pending records and release all resources.
   * Call during server shutdown to avoid losing the last batch.
   */
  async destroy(): Promise<void> {
    this.destroyed = true;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    await this.flush();
  }

  /**
   * The path where analytics are written.
   * Useful for passing to the compiler's Discovery phase.
   */
  get path(): string {
    return this.analyticsPath;
  }
}
