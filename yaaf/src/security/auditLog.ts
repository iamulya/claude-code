/**
 * SecurityAuditLog — Centralized Security Event Logger
 *
 * Collects and persists all security events from YAAF security middleware
 * into a structured, queryable audit trail for compliance and forensics.
 *
 * Features:
 * - Append-only structured event log
 * - Severity classification (info, warning, critical)
 * - Event correlation by session/user/conversation
 * - Rolling retention with configurable maxEntries
 * - Export to JSON, NDJSON, or callback
 * - A1 FIX: Observable sink failures via onSinkError (no silent swallows)
 * - A2 FIX: Async notification backpressure with configurable maxQueueDepth
 * - A3 FIX: Built-in file sink with NDJSON append and write-error detection
 * - Statistics and threat intelligence summary
 *
 * @module security/auditLog
 */

import {
  appendFile as fsAppendFile,
  stat as fsStat,
  rename as fsRename,
  unlink as fsUnlink,
} from "node:fs/promises";

// ── Types ────────────────────────────────────────────────────────────────────

export type AuditSeverity = "info" | "warning" | "critical";

export type AuditCategory =
  | "prompt_injection"
  | "output_sanitized"
  | "pii_detected"
  | "pii_redacted"
  | "trust_violation"
  | "grounding_failed"
  | "rate_limited"
  | "input_anomaly"
  | "access_denied"
  | "tool_blocked"
  | "canary_triggered"
  | "custom";

export type AuditEntry = {
  /** Unique event ID */
  id: string;
  /** Event timestamp */
  timestamp: Date;
  /** Severity level */
  severity: AuditSeverity;
  /** Event category */
  category: AuditCategory;
  /** Human-readable summary */
  summary: string;
  /** Structured event data */
  data?: Record<string, unknown>;
  /** User ID (from IAM) */
  userId?: string;
  /** Session or conversation ID */
  sessionId?: string;
  /** Source middleware that produced the event */
  source: string;
};

export type AuditLogConfig = {
  /**
   * Maximum entries to retain in memory.
   * Oldest entries are evicted when exceeded.
   * Default: 10_000.
   */
  maxEntries?: number;

  /**
   * Called synchronously for every new audit entry (real-time forwarding).
   * Use to pipe to external systems (SIEM, CloudWatch, etc.).
   * Note: this runs synchronously inside log() — keep it fast.
   */
  onEntry?: (entry: AuditEntry) => void;

  /**
   * Only log events at or above this severity.
   * Default: 'info' (log everything).
   */
  minSeverity?: AuditSeverity;

  /**
   * Session ID for event correlation.
   */
  sessionId?: string;

  /**
   * Called when a sink (pluginHost.emitLog, pluginHost.notify, or file
   * append) fails to deliver an entry.
   *
   * Default: `console.error` — guarantees operator visibility even without a
   * dedicated handler. Set to `() => {}` to explicitly opt out (use only if you
   * have another monitoring path).
   *
   * @example
   * ```ts
   * const auditLog = new SecurityAuditLog({
   * onSinkError: (err, entry) => {
   * myMetrics.increment('audit.sink.error', { category: entry.category })
   * }
   * })
   * ```
   */
  onSinkError?: (error: unknown, entry: AuditEntry) => void;

  /**
   * Maximum number of in-flight async notifications (pluginHost.notify)
   * before overflow entries are dropped and `onSinkError` is called.
   *
   * Default: 1000. Set to `Infinity` to disable backpressure (not recommended
   * — a slow notification endpoint could exhaust memory).
   */
  maxQueueDepth?: number;

  /**
   * Append NDJSON audit entries to this file path.
   *
   * Each log entry is appended as a single JSON line (newline-delimited JSON),
   * compatible with most log ingestion pipelines (Filebeat, Fluentbit, etc.).
   * Write errors are reported via `onSinkError`.
   *
   * @example
   * ```ts
   * const auditLog = new SecurityAuditLog({
   * filePath: '/var/log/yaaf/audit.ndjson',
   * })
   * ```
   */
  filePath?: string;

  /**
   * A4: Maximum file size in bytes before the log rotates to a new file.
   * When the active file reaches this size, it is renamed to `<filePath>.1`,
   * older rotated files are shifted (.1 → .2 → ...), and a new file is created.
   *
   * Requires `filePath` to be set. Default: undefined (no rotation).
   *
   * @example
   * ```ts
   * const auditLog = new SecurityAuditLog({
   * filePath: '/var/log/yaaf/audit.ndjson',
   * maxFileSizeBytes: 50 * 1024 * 1024, // 50 MB
   * maxRotatedFiles: 7, // keep 7 days of logs
   * })
   * ```
   */
  maxFileSizeBytes?: number;

  /**
   * A4: Maximum number of rotated files to retain alongside the active file.
   * Files beyond this count are deleted when rotation occurs.
   * Default: 5. Requires `maxFileSizeBytes` to be set.
   */
  maxRotatedFiles?: number;
};

export type AuditStats = {
  totalEntries: number;
  bySeverity: Record<AuditSeverity, number>;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
  timeRange: { earliest: Date; latest: Date } | null;
};

// ── Severity ordering ────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<AuditSeverity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

// ── SecurityAuditLog ─────────────────────────────────────────────────────────

export class SecurityAuditLog {
  readonly name = "security-audit-log";
  private readonly entries: AuditEntry[] = [];
  private readonly maxEntries: number;
  private readonly minSeverity: number;
  private readonly sessionId?: string;
  private readonly onEntry?: (entry: AuditEntry) => void;
  private _nextId = 0;

  /** plugin host for forwarding to ObservabilityAdapter + NotificationAdapter */
  private _pluginHost?: import("../plugin/types.js").PluginHost;

  // Observable sink error handler
  private readonly _onSinkError: (error: unknown, entry: AuditEntry) => void;

  // Backpressure for async notifications
  private readonly _maxQueueDepth: number;
  private _pendingNotifications = 0;

  // NDJSON file sink
  private readonly _filePath?: string;
  // A4: Log rotation
  private readonly _maxFileSizeBytes?: number;
  private readonly _maxRotatedFiles: number = 5;

  constructor(config: AuditLogConfig = {}) {
    this.maxEntries = config.maxEntries ?? 10_000;
    this.minSeverity = SEVERITY_ORDER[config.minSeverity ?? "info"];
    this.sessionId = config.sessionId;
    this.onEntry = config.onEntry;

    // Default onSinkError writes to console.error so failures are always
    // visible, even without an explicit handler configured. This prevents the
    // "silent swallow" that was an OWASP A09 violation.
    this._onSinkError =
      config.onSinkError ??
      ((err, entry) =>
        console.error(
          `[yaaf/audit] Sink delivery failed for entry "${entry.id}" (${entry.category}):`,
          err,
        ));

    // Configurable backpressure depth
    this._maxQueueDepth = config.maxQueueDepth ?? 1000;

    // Optional NDJSON file sink
    this._filePath = config.filePath;
    // A4: Optional log rotation
    this._maxFileSizeBytes = config.maxFileSizeBytes;
    this._maxRotatedFiles = config.maxRotatedFiles ?? 5;
  }

  // ── Sensitive key scrubbing ──────────────────────────────────────────────

  /**
   * Known-sensitive field names whose values should never appear
   * in the audit log's `data` field (they may contain credentials, tokens, etc.).
   */
  private static readonly SENSITIVE_KEYS = new Set([
    "password",
    "passwd",
    "secret",
    "token",
    "apikey",
    "api_key",
    "key",
    "credentials",
    "credential",
    "authorization",
    "auth",
    "cookie",
    "access_token",
    "refresh_token",
    "id_token",
    "private_key",
    "arguments",
    "args",
    "input",
  ]);

  private static scrubData(
    data: Record<string, unknown> | undefined,
  ): Record<string, unknown> | undefined {
    if (!data) return data;
    const scrubbed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (SecurityAuditLog.SENSITIVE_KEYS.has(k.toLowerCase())) {
        scrubbed[k] = "[REDACTED by audit log]";
      } else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        scrubbed[k] = SecurityAuditLog.scrubData(v as Record<string, unknown>);
      } else {
        scrubbed[k] = v;
      }
    }
    return scrubbed;
  }

  /**
   * Register a PluginHost so audit entries are forwarded to plugins.
   *
   * - **All entries** → `ObservabilityAdapter.log()` (external SIEM, Datadog, etc.)
   * - **`'critical'` entries** → `NotificationAdapter.notify()` (PagerDuty, Slack, etc.)
   *
   * @example
   * ```ts
   * const auditLog = new SecurityAuditLog()
   * auditLog.setPluginHost(agent._pluginHost)
   * ```
   */
  setPluginHost(host: import("../plugin/types.js").PluginHost): void {
    this._pluginHost = host;
  }

  /**
   * Log a security event.
   * Returns null if the event was below `minSeverity` and was not stored.
   */
  log(
    severity: AuditSeverity,
    category: AuditCategory,
    source: string,
    summary: string,
    options?: {
      data?: Record<string, unknown>;
      userId?: string;
      sessionId?: string;
    },
  ): AuditEntry | null {
    // Severity filter — return null instead of a phantom entry
    if (SEVERITY_ORDER[severity] < this.minSeverity) {
      return null;
    }

    const entry: AuditEntry = {
      id: `audit_${this._nextId++}`,
      timestamp: new Date(),
      severity,
      category,
      summary,
      source,
      // Scrub sensitive keys before persisting
      data: SecurityAuditLog.scrubData(options?.data),
      userId: options?.userId,
      sessionId: options?.sessionId ?? this.sessionId,
    };

    this.entries.push(entry);

    // Replace O(n²) shift() loop with a single O(n) splice() call
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }

    // Synchronous user callback (kept sync for backward compat — keep fast)
    this.onEntry?.(entry);

    // Async file sink (fire-and-forget, errors go to onSinkError)
    this.appendToFile(entry);

    // GAP 5 FIX + A1 FIX: Forward to plugins with observable failure reporting
    this.emitToPluginHost(entry);

    return entry;
  }

  /** Shorthand for info-level log */
  info(
    category: AuditCategory,
    source: string,
    summary: string,
    options?: { data?: Record<string, unknown>; userId?: string },
  ): AuditEntry | null {
    return this.log("info", category, source, summary, options);
  }

  /** Shorthand for warning-level log */
  warn(
    category: AuditCategory,
    source: string,
    summary: string,
    options?: { data?: Record<string, unknown>; userId?: string },
  ): AuditEntry | null {
    return this.log("warning", category, source, summary, options);
  }

  /** Shorthand for critical-level log */
  critical(
    category: AuditCategory,
    source: string,
    summary: string,
    options?: { data?: Record<string, unknown>; userId?: string },
  ): AuditEntry | null {
    return this.log("critical", category, source, summary, options);
  }

  // ── A1 FIX: Observable sink delivery ────────────────────────────────────

  /**
   * Forward an entry to the PluginHost with A1-compliant error reporting.
   * Never throws. All failures go to onSinkError.
   */
  private emitToPluginHost(entry: AuditEntry): void {
    if (!this._pluginHost) return;

    // Sync emitLog — catch and report instead of swallowing
    try {
      this._pluginHost.emitLog({
        level:
          entry.severity === "critical" ? "error" : entry.severity === "warning" ? "warn" : "info",
        namespace: `security.audit.${entry.source}`,
        message: `[${entry.category}] ${entry.summary}`,
        data: { ...entry, timestamp: entry.timestamp.toISOString() },
        timestamp: entry.timestamp.toISOString(),
      });
    } catch (err) {
      this.handleSinkError(err, entry);
    }

    // Critical events: async paging with backpressure
    if (entry.severity === "critical") {
      // Drop and report when queue is full
      if (this._pendingNotifications >= this._maxQueueDepth) {
        this.handleSinkError(
          new Error(
            `[yaaf/audit] Critical notification queue full (${this._maxQueueDepth} pending) ` +
              `— alert for "${entry.category}" dropped`,
          ),
          entry,
        );
        return;
      }

      this._pendingNotifications++;
      this._pluginHost
        .notify({
          type: "needs_attention",
          title: `⚠️ Security Alert: ${entry.category}`,
          message: entry.summary,
          metadata: { source: entry.source, userId: entry.userId, sessionId: entry.sessionId },
        })
        .catch((err) => this.handleSinkError(err, entry))
        .finally(() => {
          this._pendingNotifications--;
        });
    }
  }

  /**
   * Append a single NDJSON line to the configured file sink.
   * Rotates the file if it exceeds maxFileSizeBytes.
   * Never throws. Write errors go to onSinkError.
   */
  private appendToFile(entry: AuditEntry): void {
    if (!this._filePath) return;
    const line =
      JSON.stringify({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
      }) + "\n";

    const doAppend = () =>
      fsAppendFile(this._filePath!, line, "utf8").catch((err) => this.handleSinkError(err, entry));

    // A4: Check file size antes de appendar — rotate if needed
    if (this._maxFileSizeBytes !== undefined) {
      fsStat(this._filePath)
        .then((s) => {
          if (s.size >= this._maxFileSizeBytes!) {
            return this.rotateLogs().then(doAppend);
          }
          return doAppend();
        })
        .catch(() => doAppend()); // stat failed (file doesn't exist yet) — just append
    } else {
      doAppend();
    }
  }

  /**
   * A4: Rolling log rotation.
   * Renames: active → .1, .1 → .2, ..., oldest deleted if over maxRotatedFiles.
   * Returns a Promise; errors are swallowed (rotation is best-effort).
   */
  private async rotateLogs(): Promise<void> {
    if (!this._filePath) return;
    try {
      // Delete oldest rotated file if at limit
      const oldest = `${this._filePath}.${this._maxRotatedFiles}`;
      await fsUnlink(oldest).catch(() => {}); // ok if it doesn't exist

      // Shift existing rotated files: .N-1 → .N (skip .1 — handled below)
      for (let i = this._maxRotatedFiles - 1; i >= 2; i--) {
        await fsRename(`${this._filePath}.${i - 1}`, `${this._filePath}.${i}`).catch(() => {});
      }
      // Rename active → .1
      await fsRename(this._filePath, `${this._filePath}.1`).catch(() => {});
    } catch {
      // Rotation is best-effort — don't let it block the append
    }
  }

  /**
   * Central sink error handler.
   * Calls onSinkError, protecting against handler throws.
   */
  private handleSinkError(error: unknown, entry: AuditEntry): void {
    try {
      this._onSinkError(error, entry);
    } catch {
      // If the error handler itself throws, there is nothing more we can do.
      // At least we tried — the original `catch { /* swallow */ }` didn't.
    }
  }

  // ── Query ───────────────────────────────────────────────────────────────

  /**
   * Get all entries, optionally filtered.
   */
  query(filter?: {
    severity?: AuditSeverity;
    category?: AuditCategory;
    source?: string;
    userId?: string;
    since?: Date;
    limit?: number;
  }): AuditEntry[] {
    let result = [...this.entries];

    if (filter?.severity) {
      const minSev = SEVERITY_ORDER[filter.severity];
      result = result.filter((e) => SEVERITY_ORDER[e.severity] >= minSev);
    }
    if (filter?.category) {
      result = result.filter((e) => e.category === filter.category);
    }
    if (filter?.source) {
      result = result.filter((e) => e.source === filter.source);
    }
    if (filter?.userId) {
      result = result.filter((e) => e.userId === filter.userId);
    }
    if (filter?.since) {
      result = result.filter((e) => e.timestamp >= filter.since!);
    }
    if (filter?.limit) {
      result = result.slice(-filter.limit);
    }

    return result;
  }

  /**
   * Get aggregate statistics.
   */
  stats(): AuditStats {
    const bySeverity: Record<AuditSeverity, number> = { info: 0, warning: 0, critical: 0 };
    const byCategory: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byUser: Record<string, number> = {};

    for (const entry of this.entries) {
      bySeverity[entry.severity]++;
      byCategory[entry.category] = (byCategory[entry.category] ?? 0) + 1;
      bySource[entry.source] = (bySource[entry.source] ?? 0) + 1;
      if (entry.userId) {
        byUser[entry.userId] = (byUser[entry.userId] ?? 0) + 1;
      }
    }

    const topUsers = Object.entries(byUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));

    const timeRange =
      this.entries.length > 0
        ? {
            earliest: this.entries[0]!.timestamp,
            latest: this.entries[this.entries.length - 1]!.timestamp,
          }
        : null;

    return {
      totalEntries: this.entries.length,
      bySeverity,
      byCategory,
      bySource,
      topUsers,
      timeRange,
    };
  }

  /** Total entries count */
  get count(): number {
    return this.entries.length;
  }

  /** Number of in-flight async notifications (useful for monitoring) */
  get pendingNotifications(): number {
    return this._pendingNotifications;
  }

  // ── Export ───────────────────────────────────────────────────────────────

  /**
   * Export all entries as NDJSON (Newline Delimited JSON).
   * Standard format for log ingestion pipelines.
   */
  toNDJSON(): string {
    return this.entries
      .map((e) =>
        JSON.stringify({
          ...e,
          timestamp: e.timestamp.toISOString(),
        }),
      )
      .join("\n");
  }

  /**
   * Export entries as a JSON array.
   */
  toJSON(): object[] {
    return this.entries.map((e) => ({
      ...e,
      timestamp: e.timestamp.toISOString(),
    }));
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.entries.length = 0;
  }

  // ── Integration helpers ─────────────────────────────────────────────────

  /**
   * Create callback functions for all security middleware.
   * Wire these into each middleware's `onDetection`/`onSanitize`/etc. callback.
   */
  createCallbacks(userId?: string) {
    return {
      promptGuard: (event: { patternName: string; severity: string; action: string }) => {
        this.log(
          event.severity === "high" ? "critical" : "warning",
          "prompt_injection",
          "PromptGuard",
          `Prompt injection detected: ${event.patternName} (${event.action})`,
          { data: event as unknown as Record<string, unknown>, userId },
        );
      },

      outputSanitizer: (event: { type: string; count: number }) => {
        this.info(
          "output_sanitized",
          "OutputSanitizer",
          `Output sanitized: ${event.type} (${event.count} items)`,
          { data: event as unknown as Record<string, unknown>, userId },
        );
      },

      piiRedactor: (event: {
        category: string;
        direction: string;
        count: number;
        action: string;
      }) => {
        this.log(
          event.action === "redacted" ? "warning" : "info",
          event.action === "redacted" ? "pii_redacted" : "pii_detected",
          "PiiRedactor",
          `PII ${event.action}: ${event.count}x ${event.category} (${event.direction})`,
          { data: event as unknown as Record<string, unknown>, userId },
        );
      },

      trustPolicy: (event: { target: string; name: string; result: string; reason: string }) => {
        this.log(
          event.result === "blocked" ? "critical" : event.result === "warning" ? "warning" : "info",
          "trust_violation",
          "TrustPolicy",
          `${event.target} "${event.name}": ${event.result} — ${event.reason}`,
          { data: event as unknown as Record<string, unknown>, userId },
        );
      },

      groundingValidator: (event: { score: number; action: string; totalSentences: number }) => {
        this.log(
          event.action === "overridden" ? "warning" : "info",
          "grounding_failed",
          "GroundingValidator",
          `Grounding score: ${Math.round(event.score * 100)}% (${event.action})`,
          { data: event as unknown as Record<string, unknown>, userId },
        );
      },

      rateLimiter: (event: {
        userId: string;
        resource: string;
        action: string;
        current: number;
        limit: number;
      }) => {
        this.log(
          event.action === "blocked" ? "critical" : "warning",
          "rate_limited",
          "PerUserRateLimiter",
          `User "${event.userId}" ${event.resource}: ${event.current}/${event.limit} (${event.action})`,
          { data: event as unknown as Record<string, unknown>, userId: event.userId },
        );
      },

      inputAnomaly: (event: { type: string; detail: string; severity: string }) => {
        this.log(
          event.severity === "block" ? "critical" : "warning",
          "input_anomaly",
          "InputAnomalyDetector",
          `Input anomaly: ${event.detail}`,
          { data: event as unknown as Record<string, unknown>, userId },
        );
      },
    };
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function securityAuditLog(config?: AuditLogConfig): SecurityAuditLog {
  return new SecurityAuditLog(config);
}
