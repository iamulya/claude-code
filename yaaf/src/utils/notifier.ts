/**
 * Notifier — lifecycle notification system for agents.
 *
 * Inspired by the main repo's notifier.ts. Delivers notifications to users
 * when background agents finish, fail, or need attention. Supports multiple
 * channels simultaneously (console, webhook, custom).
 *
 * @example
 * ```ts
 * const notifier = new CompositeNotifier([
 *   new ConsoleNotifier(),
 *   new WebhookNotifier('https://hooks.slack.com/...'),
 * ]);
 *
 * // Wire into orchestrator
 * orchestrator.on('agent:completed', (agentId, result) => {
 *   notifier.notify({
 *     type: 'completed',
 *     title: `Agent ${agentId} finished`,
 *     message: result.summary,
 *   });
 * });
 *
 * // Or use custom notifier
 * const custom = new CallbackNotifier(async (notif) => {
 *   await sendEmail(notif.title, notif.message);
 * });
 * ```
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = 'completed' | 'failed' | 'needs_attention' | 'warning' | 'info'

export type Notification = {
  type: NotificationType
  title: string
  message: string
  /** Optional metadata (agent ID, cost, duration, etc.) */
  metadata?: Record<string, unknown>
  /** Timestamp (auto-set if omitted) */
  timestamp?: string
}

/**
 * A notification channel delivers notifications to users via some medium.
 */
export interface NotificationChannel {
  /** Send a notification. Should not throw — errors are logged and swallowed. */
  notify(notification: Notification): Promise<void>
  /** Optional cleanup. */
  destroy?(): Promise<void>
}

// ── Built-in Channels ────────────────────────────────────────────────────────

/** Logs notifications to console with emoji indicators. */
export class ConsoleNotifier implements NotificationChannel {
  async notify(notif: Notification): Promise<void> {
    const emoji = EMOJI_MAP[notif.type] ?? 'ℹ️'
    const ts = notif.timestamp ?? new Date().toISOString()
    console.log(`${emoji} [${ts}] ${notif.title}: ${notif.message}`)
  }
}

const EMOJI_MAP: Record<NotificationType, string> = {
  completed: '✅',
  failed: '❌',
  needs_attention: '⚠️',
  warning: '🟡',
  info: 'ℹ️',
}

/** Sends notifications to a webhook URL via POST. */
export class WebhookNotifier implements NotificationChannel {
  constructor(
    private readonly url: string,
    private readonly headers?: Record<string, string>,
  ) {}

  async notify(notif: Notification): Promise<void> {
    try {
      await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        body: JSON.stringify({
          ...notif,
          timestamp: notif.timestamp ?? new Date().toISOString(),
        }),
      })
    } catch {
      // Best-effort — notifications should not crash the agent
    }
  }
}

/** Invokes a custom async callback with the notification. */
export class CallbackNotifier implements NotificationChannel {
  constructor(
    private readonly callback: (notif: Notification) => Promise<void> | void,
  ) {}

  async notify(notif: Notification): Promise<void> {
    try {
      await this.callback(notif)
    } catch {
      // Swallow callback errors
    }
  }
}

/**
 * Fans out notifications to multiple channels simultaneously.
 * Errors in individual channels do not affect others.
 */
export class CompositeNotifier implements NotificationChannel {
  private readonly channels: NotificationChannel[]

  constructor(channels: NotificationChannel[]) {
    this.channels = [...channels]
  }

  async notify(notif: Notification): Promise<void> {
    const filled: Notification = {
      ...notif,
      timestamp: notif.timestamp ?? new Date().toISOString(),
    }
    await Promise.allSettled(
      this.channels.map(ch => ch.notify(filled)),
    )
  }

  /** Add a channel dynamically. */
  add(channel: NotificationChannel): void {
    this.channels.push(channel)
  }

  async destroy(): Promise<void> {
    await Promise.allSettled(
      this.channels.map(ch => ch.destroy?.()),
    )
  }
}

/**
 * Buffers notifications in memory for later retrieval.
 * Useful for testing or batch processing.
 */
export class BufferNotifier implements NotificationChannel {
  private readonly _buffer: Notification[] = []
  private readonly _maxSize: number

  constructor(maxSize = 100) {
    this._maxSize = maxSize
  }

  async notify(notif: Notification): Promise<void> {
    const filled: Notification = {
      ...notif,
      timestamp: notif.timestamp ?? new Date().toISOString(),
    }
    this._buffer.push(filled)
    // Evict oldest if over capacity
    while (this._buffer.length > this._maxSize) {
      this._buffer.shift()
    }
  }

  /** Get all buffered notifications. */
  get notifications(): readonly Notification[] {
    return this._buffer
  }

  /** Get the most recent notification, or null. */
  get last(): Notification | null {
    return this._buffer.length > 0 ? this._buffer[this._buffer.length - 1]! : null
  }

  /** Clear the buffer. */
  clear(): void {
    this._buffer.length = 0
  }
}

// ── GAP 7 FIX: Bridge NotificationChannel ↔ NotificationAdapter ──────────────
//
// Two parallel notification systems existed:
//   1. `NotificationChannel` / `CompositeNotifier` — this file (standalone utility)
//   2. `NotificationAdapter` — plugin system in plugin/types.ts
//
// This factory wraps any `NotificationChannel` as a `NotificationAdapter` plugin,
// so users can register their existing CompositeNotifier/WebhookNotifier/etc.
// with a PluginHost and receive ALL notifications from Vigil, AgentOrchestrator,
// SecurityAuditLog, and the CostTracker in one place.
//
// @example
// ```ts
// const slackNotifier = new WebhookNotifier('https://hooks.slack.com/...')
// const agent = await Agent.create({
//   model: 'gpt-4o',
//   plugins: [notificationAdapterFromChannel('slack-notifier', slackNotifier)],
// })
// // Now Vigil.brief(), orchestrator failures, and audit critical events → Slack
// ```

/**
 * Wrap any `NotificationChannel` as a `NotificationAdapter` plugin that can
 * be registered with an agent's `PluginHost`.
 *
 * This bridges the `utils/notifier.ts` utility system and the plugin system,
 * so `Vigil.brief()`, `AgentOrchestrator` lifecycle events, and
 * `SecurityAuditLog` critical alerts all flow to the same channel.
 */
export function notificationAdapterFromChannel(
  name: string,
  channel: NotificationChannel,
): import('../plugin/types.js').NotificationAdapter {
  return {
    name,
    version: '1.0.0',
    capabilities: ['notification'] as const,
    async initialize() {},
    async destroy() { await channel.destroy?.() },
    async notify(notification) {
      await channel.notify({
        type: (notification.type as import('./notifier.js').NotificationType) ?? 'info',
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata as Record<string, unknown> | undefined,
        timestamp: notification.timestamp,
      })
    },
  }
}
