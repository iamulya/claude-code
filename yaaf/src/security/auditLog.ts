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
 * - Rolling retention with configurable TTL
 * - Export to JSON, NDJSON, or callback
 * - Statistics and threat intelligence summary
 *
 * @module security/auditLog
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type AuditSeverity = 'info' | 'warning' | 'critical'

export type AuditCategory =
  | 'prompt_injection'
  | 'output_sanitized'
  | 'pii_detected'
  | 'pii_redacted'
  | 'trust_violation'
  | 'grounding_failed'
  | 'rate_limited'
  | 'input_anomaly'
  | 'access_denied'
  | 'tool_blocked'
  | 'canary_triggered'
  | 'custom'

export type AuditEntry = {
  /** Unique event ID */
  id: string
  /** Event timestamp */
  timestamp: Date
  /** Severity level */
  severity: AuditSeverity
  /** Event category */
  category: AuditCategory
  /** Human-readable summary */
  summary: string
  /** Structured event data */
  data?: Record<string, unknown>
  /** User ID (from IAM) */
  userId?: string
  /** Session or conversation ID */
  sessionId?: string
  /** Source middleware that produced the event */
  source: string
}

export type AuditLogConfig = {
  /**
   * Maximum entries to retain in memory.
   * Oldest entries are evicted when exceeded.
   * Default: 10_000.
   */
  maxEntries?: number

  /**
   * Called for every new audit entry (real-time forwarding).
   * Use to pipe to external systems (SIEM, CloudWatch, etc.).
   */
  onEntry?: (entry: AuditEntry) => void

  /**
   * Only log events at or above this severity.
   * Default: 'info' (log everything).
   */
  minSeverity?: AuditSeverity

  /**
   * Session ID for event correlation.
   */
  sessionId?: string
}

export type AuditStats = {
  totalEntries: number
  bySeverity: Record<AuditSeverity, number>
  byCategory: Record<string, number>
  bySource: Record<string, number>
  topUsers: Array<{ userId: string; count: number }>
  timeRange: { earliest: Date; latest: Date } | null
}

// ── Severity ordering ────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<AuditSeverity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
}

// ── SecurityAuditLog ─────────────────────────────────────────────────────────

export class SecurityAuditLog {
  readonly name = 'security-audit-log'
  private readonly entries: AuditEntry[] = []
  private readonly maxEntries: number
  private readonly minSeverity: number
  private readonly sessionId?: string
  private readonly onEntry?: (entry: AuditEntry) => void
  private _nextId = 0
  /** GAP 5 FIX: plugin host for forwarding to ObservabilityAdapter + NotificationAdapter */
  private _pluginHost?: import('../plugin/types.js').PluginHost

  constructor(config: AuditLogConfig = {}) {
    this.maxEntries = config.maxEntries ?? 10_000
    this.minSeverity = SEVERITY_ORDER[config.minSeverity ?? 'info']
    this.sessionId = config.sessionId
    this.onEntry = config.onEntry
  }

  /**
   * GAP 5 FIX: Register a PluginHost so audit entries are forwarded to plugins.
   *
   * - **All entries** → `ObservabilityAdapter.log()` (external SIEM, Datadog, etc.)
   * - **`'critical'` entries** → `NotificationAdapter.notify()` (PagerDuty, Slack, etc.)
   *
   * @example
   * ```ts
   * const auditLog = new SecurityAuditLog()
   * auditLog.setPluginHost(agent._pluginHost) // or the PluginHost you built
   *
   * // Now every security event flows to your observability and notification plugins
   * ```
   */
  setPluginHost(host: import('../plugin/types.js').PluginHost): void {
    this._pluginHost = host
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
      data?: Record<string, unknown>
      userId?: string
      sessionId?: string
    },
  ): AuditEntry | null {
    // Severity filter — return null instead of a phantom entry that
    // looks real but isn't stored or forwarded to onEntry.
    if (SEVERITY_ORDER[severity] < this.minSeverity) {
      return null
    }

    const entry: AuditEntry = {
      id: `audit_${this._nextId++}`,
      timestamp: new Date(),
      severity,
      category,
      summary,
      source,
      data: options?.data,
      userId: options?.userId,
      sessionId: options?.sessionId ?? this.sessionId,
    }

    this.entries.push(entry)

    // Evict oldest if over limit
    while (this.entries.length > this.maxEntries) {
      this.entries.shift()
    }

    // Forward to user callback
    this.onEntry?.(entry)

    // GAP 5 FIX: Fan-out to ObservabilityAdapter + NotificationAdapter plugins.
    // Uses best-effort (never throws) to keep the audit log non-fatal.
    if (this._pluginHost) {
      try {
        this._pluginHost.emitLog({
          level: severity === 'critical' ? 'error' : severity === 'warning' ? 'warn' : 'info',
          namespace: `security.audit.${source}`,
          message: `[${category}] ${summary}`,
          data: { ...entry, timestamp: entry.timestamp.toISOString() },
          timestamp: entry.timestamp.toISOString(),
        })
      } catch { /* swallow */ }

      // Page on-call for critical security events
      if (severity === 'critical') {
        void this._pluginHost.notify({
          type: 'needs_attention',
          title: `⚠️ Security Alert: ${category}`,
          message: summary,
          metadata: { source, userId: entry.userId, sessionId: entry.sessionId },
        }).catch(() => { /* best-effort */ })
      }
    }

    return entry
  }

  /** Shorthand for info-level log */
  info(category: AuditCategory, source: string, summary: string, options?: { data?: Record<string, unknown>; userId?: string }): AuditEntry | null {
    return this.log('info', category, source, summary, options)
  }

  /** Shorthand for warning-level log */
  warn(category: AuditCategory, source: string, summary: string, options?: { data?: Record<string, unknown>; userId?: string }): AuditEntry | null {
    return this.log('warning', category, source, summary, options)
  }

  /** Shorthand for critical-level log */
  critical(category: AuditCategory, source: string, summary: string, options?: { data?: Record<string, unknown>; userId?: string }): AuditEntry | null {
    return this.log('critical', category, source, summary, options)
  }

  // ── Query ───────────────────────────────────────────────────────────────

  /**
   * Get all entries, optionally filtered.
   */
  query(filter?: {
    severity?: AuditSeverity
    category?: AuditCategory
    source?: string
    userId?: string
    since?: Date
    limit?: number
  }): AuditEntry[] {
    let result = [...this.entries]

    if (filter?.severity) {
      const minSev = SEVERITY_ORDER[filter.severity]
      result = result.filter(e => SEVERITY_ORDER[e.severity] >= minSev)
    }
    if (filter?.category) {
      result = result.filter(e => e.category === filter.category)
    }
    if (filter?.source) {
      result = result.filter(e => e.source === filter.source)
    }
    if (filter?.userId) {
      result = result.filter(e => e.userId === filter.userId)
    }
    if (filter?.since) {
      result = result.filter(e => e.timestamp >= filter.since!)
    }
    if (filter?.limit) {
      result = result.slice(-filter.limit)
    }

    return result
  }

  /**
   * Get aggregate statistics.
   */
  stats(): AuditStats {
    const bySeverity: Record<AuditSeverity, number> = { info: 0, warning: 0, critical: 0 }
    const byCategory: Record<string, number> = {}
    const bySource: Record<string, number> = {}
    const byUser: Record<string, number> = {}

    for (const entry of this.entries) {
      bySeverity[entry.severity]++
      byCategory[entry.category] = (byCategory[entry.category] ?? 0) + 1
      bySource[entry.source] = (bySource[entry.source] ?? 0) + 1
      if (entry.userId) {
        byUser[entry.userId] = (byUser[entry.userId] ?? 0) + 1
      }
    }

    const topUsers = Object.entries(byUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }))

    const timeRange = this.entries.length > 0
      ? { earliest: this.entries[0]!.timestamp, latest: this.entries[this.entries.length - 1]!.timestamp }
      : null

    return {
      totalEntries: this.entries.length,
      bySeverity,
      byCategory,
      bySource,
      topUsers,
      timeRange,
    }
  }

  /** Total entries count */
  get count(): number {
    return this.entries.length
  }

  // ── Export ───────────────────────────────────────────────────────────────

  /**
   * Export all entries as NDJSON (Newline Delimited JSON).
   * Standard format for log ingestion pipelines.
   */
  toNDJSON(): string {
    return this.entries
      .map(e => JSON.stringify({
        ...e,
        timestamp: e.timestamp.toISOString(),
      }))
      .join('\n')
  }

  /**
   * Export entries as a JSON array.
   */
  toJSON(): object[] {
    return this.entries.map(e => ({
      ...e,
      timestamp: e.timestamp.toISOString(),
    }))
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.entries.length = 0
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
          event.severity === 'high' ? 'critical' : 'warning',
          'prompt_injection',
          'PromptGuard',
          `Prompt injection detected: ${event.patternName} (${event.action})`,
          { data: event as unknown as Record<string, unknown>, userId },
        )
      },

      outputSanitizer: (event: { type: string; count: number }) => {
        this.info('output_sanitized', 'OutputSanitizer',
          `Output sanitized: ${event.type} (${event.count} items)`,
          { data: event as unknown as Record<string, unknown>, userId })
      },

      piiRedactor: (event: { category: string; direction: string; count: number; action: string }) => {
        this.log(
          event.action === 'redacted' ? 'warning' : 'info',
          event.action === 'redacted' ? 'pii_redacted' : 'pii_detected',
          'PiiRedactor',
          `PII ${event.action}: ${event.count}x ${event.category} (${event.direction})`,
          { data: event as unknown as Record<string, unknown>, userId },
        )
      },

      trustPolicy: (event: { target: string; name: string; result: string; reason: string }) => {
        this.log(
          event.result === 'blocked' ? 'critical' : event.result === 'warning' ? 'warning' : 'info',
          'trust_violation',
          'TrustPolicy',
          `${event.target} "${event.name}": ${event.result} — ${event.reason}`,
          { data: event as unknown as Record<string, unknown>, userId },
        )
      },

      groundingValidator: (event: { score: number; action: string; totalSentences: number }) => {
        this.log(
          event.action === 'overridden' ? 'warning' : 'info',
          'grounding_failed',
          'GroundingValidator',
          `Grounding score: ${Math.round(event.score * 100)}% (${event.action})`,
          { data: event as unknown as Record<string, unknown>, userId },
        )
      },

      rateLimiter: (event: { userId: string; resource: string; action: string; current: number; limit: number }) => {
        this.log(
          event.action === 'blocked' ? 'critical' : 'warning',
          'rate_limited',
          'PerUserRateLimiter',
          `User "${event.userId}" ${event.resource}: ${event.current}/${event.limit} (${event.action})`,
          { data: event as unknown as Record<string, unknown>, userId: event.userId },
        )
      },

      inputAnomaly: (event: { type: string; detail: string; severity: string }) => {
        this.log(
          event.severity === 'block' ? 'critical' : 'warning',
          'input_anomaly',
          'InputAnomalyDetector',
          `Input anomaly: ${event.detail}`,
          { data: event as unknown as Record<string, unknown>, userId },
        )
      },
    }
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function securityAuditLog(config?: AuditLogConfig): SecurityAuditLog {
  return new SecurityAuditLog(config)
}
