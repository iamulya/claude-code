/**
 * SkillWatcher — Production-grade file watching for skill hot-reload.
 *
 * Watches skill directories for `.md`/`.mdx` file changes and batches them
 * into debounced reload events. Uses chokidar for cross-platform reliability
 * with write-stability detection, atomic write handling, and symlink support.
 *
 * Features over bare `fs.watch`:
 * - `awaitWriteFinish` — prevents reacting to partial writes
 * - Cross-platform event normalization
 * - Atomic write detection (editor temp-file-then-rename)
 * - Symlink following
 * - Automatic deduplication of rapid OS-level events
 * - Error recovery from transient EPERM/EACCES
 *
 * @module skills/watcher
 */

import chokidar, { type FSWatcher } from "chokidar";
import * as path from "path";
import { Logger } from "../utils/logger.js";

const logger = new Logger("skills:watcher");

// ── Types ────────────────────────────────────────────────────────────────────

export type SkillChangeEvent = {
  /** Newly added skill files */
  added: string[];
  /** Modified skill files */
  changed: string[];
  /** Removed skill files */
  removed: string[];
  /** Wall-clock timestamp when the batch was flushed */
  timestamp: number;
};

export type SkillWatcherConfig = {
  /** Directories to watch for skill files */
  dirs: string[];
  /**
   * Debounce window for batching rapid file changes (ms).
   * All changes within this window are merged into a single event.
   * Default: 300ms.
   */
  debounceMs?: number;
  /**
   * Wait for file writes to stabilize before emitting (ms).
   * Prevents reacting to partial writes from editors that save in chunks.
   * Default: 1000ms.
   */
  stabilityThreshold?: number;
  /**
   * Polling interval for write-stability checks (ms).
   * Default: 100ms.
   */
  pollInterval?: number;
  /**
   * File extensions to watch. Default: ['.md', '.mdx'].
   */
  extensions?: string[];
  /**
   * Maximum directory depth to watch.
   * Default: 2 (supports skill-name/SKILL.md pattern).
   */
  depth?: number;
  /**
   * Use stat-based polling instead of native OS events.
   * Set to true when native watchers are unreliable (e.g. Bun's kqueue deadlock).
   * Default: false.
   */
  usePolling?: boolean;
  /**
   * Callback invoked when skill files change.
   * Receives a batched event with all changes since the last flush.
   */
  onChange: (event: SkillChangeEvent) => void | Promise<void>;
  /**
   * Optional error handler for watcher errors.
   * If not set, errors are logged via the Logger.
   */
  onError?: (error: Error) => void;
};

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_STABILITY_THRESHOLD_MS = 1000;
const DEFAULT_POLL_INTERVAL_MS = 100;
const DEFAULT_EXTENSIONS = [".md", ".mdx"];
const DEFAULT_DEPTH = 2;

// ── SkillWatcher ─────────────────────────────────────────────────────────────

export class SkillWatcher {
  private watcher: FSWatcher | null = null;
  private pendingChanges = new Map<string, "add" | "change" | "unlink">();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly extensions: string[];
  private readonly debounceMs: number;
  private readonly stabilityThreshold: number;
  private readonly pollInterval: number;
  private readonly depth: number;
  private readonly usePolling: boolean;
  private readonly dirs: string[];
  private readonly onChangeFn: SkillWatcherConfig["onChange"];
  private readonly onErrorFn: SkillWatcherConfig["onError"];
  private _started = false;
  private _disposed = false;

  constructor(config: SkillWatcherConfig) {
    if (!config.dirs || config.dirs.length === 0) {
      throw new Error("SkillWatcher: dirs must be a non-empty array");
    }
    this.dirs = [...config.dirs]; // Defensive copy — prevent caller mutation
    this.debounceMs = config.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.stabilityThreshold = config.stabilityThreshold ?? DEFAULT_STABILITY_THRESHOLD_MS;
    this.pollInterval = config.pollInterval ?? DEFAULT_POLL_INTERVAL_MS;
    this.extensions = [...(config.extensions ?? DEFAULT_EXTENSIONS)]; // Defensive copy
    this.depth = config.depth ?? DEFAULT_DEPTH;
    this.usePolling = config.usePolling ?? false;
    this.onChangeFn = config.onChange;
    this.onErrorFn = config.onError;
  }

  /** Whether the watcher is currently active */
  get isWatching(): boolean {
    return this._started && !this._disposed;
  }

  /** Number of pending (unbatched) changes */
  get pendingCount(): number {
    return this.pendingChanges.size;
  }

  /**
   * Start watching the configured directories.
   *
   * Returns a promise that resolves when chokidar's initial scan is complete
   * (the `ready` event). After this, file change events will fire.
   *
   * @throws If already started or disposed
   */
  async start(): Promise<void> {
    if (this._disposed) {
      throw new Error("SkillWatcher: cannot start a disposed watcher");
    }
    if (this._started) {
      throw new Error("SkillWatcher: already started");
    }

    this._started = true;

    logger.info("Starting skill file watcher", {
      dirs: this.dirs,
      debounceMs: this.debounceMs,
      stabilityThreshold: this.stabilityThreshold,
      extensions: this.extensions,
    });

    this.watcher = chokidar.watch(this.dirs, {
      persistent: true,
      ignoreInitial: true,
      depth: this.depth,
      awaitWriteFinish: {
        stabilityThreshold: this.stabilityThreshold,
        pollInterval: this.pollInterval,
      },
      ignored: (filePath: string, stats) => {
        // Allow directories (chokidar needs them for traversal)
        if (stats?.isDirectory()) return false;
        // Allow paths without stats (chokidar's pre-stat check)
        if (!stats) return false;
        // Ignore dotfiles and underscore-prefixed files
        const base = path.basename(filePath);
        if (base.startsWith(".") || base.startsWith("_")) return true;
        // Only watch configured extensions
        const ext = path.extname(filePath).toLowerCase();
        if (!this.extensions.includes(ext)) return true;
        return false;
      },
      ignorePermissionErrors: true,
      usePolling: this.usePolling,
      atomic: true, // Detect atomic writes (editor temp→rename)
    });

    // Wire up event handlers
    this.watcher
      .on("add", (p: string) => this.queueChange(p, "add"))
      .on("change", (p: string) => this.queueChange(p, "change"))
      .on("unlink", (p: string) => this.queueChange(p, "unlink"))
      .on("error", (err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        if (this.onErrorFn) {
          this.onErrorFn(error);
        } else {
          logger.error("File watcher error", { error: error.message });
        }
      });

    // Wait for chokidar to finish initial scan
    await new Promise<void>((resolve) => {
      this.watcher!.on("ready", () => {
        logger.debug("File watcher ready");
        resolve();
      });
    });
  }

  /**
   * Stop watching and clean up all resources.
   *
   * Cancels any pending debounce timer (pending changes are dropped).
   * Can be called multiple times safely (idempotent).
   */
  async stop(): Promise<void> {
    if (this._disposed) return;
    this._disposed = true;

    // Cancel pending debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Close chokidar watcher
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    // Clear any unflushed changes
    this.pendingChanges.clear();

    logger.info("Skill file watcher stopped");
  }

  /**
   * Force-flush any pending changes immediately, bypassing the debounce timer.
   * Useful for testing and graceful shutdown.
   */
  async flush(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.pendingChanges.size > 0) {
      await this.flushChanges();
    }
  }

  // ── Private ──────────────────────────────────────────────────────────────

  /**
   * Queue a file change and (re)start the debounce timer.
   * Coalesces events within the debounce window:
   * - add → change = still "add" (new file, immediate edit)
   * - add → unlink = cancel both (ephemeral file, never reported)
   * - change → unlink = "unlink" (last event wins)
   */
  private queueChange(filePath: string, type: "add" | "change" | "unlink"): void {
    // Guard: ignore events after stop() — chokidar may fire events
    // between _disposed=true and watcher.close() completing
    if (this._disposed) return;

    // Normalize path for consistent Map keys
    const normalized = path.normalize(filePath);

    // Coalesce events within the debounce window
    const existing = this.pendingChanges.get(normalized);
    if (existing === "add" && type === "change") {
      // File was just added and immediately modified → still an 'add'
      return;
    }
    if (existing === "add" && type === "unlink") {
      // File was added then deleted within the same window → cancel both
      this.pendingChanges.delete(normalized);
      return;
    }

    this.pendingChanges.set(normalized, type);

    // (Re)start debounce timer
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(
      () => void this.flushChanges(),
      this.debounceMs,
    );
  }

  /**
   * Flush all pending changes into a single SkillChangeEvent.
   */
  private async flushChanges(): Promise<void> {
    // Snapshot and clear atomically
    const changes = new Map(this.pendingChanges);
    this.pendingChanges.clear();
    this.debounceTimer = null;

    if (changes.size === 0) return;

    const event: SkillChangeEvent = {
      added: [],
      changed: [],
      removed: [],
      timestamp: Date.now(),
    };

    for (const [filePath, type] of changes) {
      switch (type) {
        case "add":
          event.added.push(filePath);
          break;
        case "change":
          event.changed.push(filePath);
          break;
        case "unlink":
          event.removed.push(filePath);
          break;
      }
    }

    logger.info("Skill files changed", {
      added: event.added.length,
      changed: event.changed.length,
      removed: event.removed.length,
    });

    try {
      await this.onChangeFn(event);
    } catch (err) {
      logger.error("onChange handler failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
