/**
 * Logger — Structured, level-based logging utility
 *
 * Structured logger for YAAF agents.
 * Supports log levels, namespaces, and structured metadata.
 *
 * Observability integration: if a `PluginHost` is registered via
 * `Logger.setPluginHost()`, all log entries are also fanned out to every
 * registered `ObservabilityAdapter` plugin. This is additive \u2014 the existing
 * static `customHandler` and console fallback are still honoured.
 */

import type { PluginHost, LogEntry } from '../plugin/types.js'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * Structured logger with namespace support.
 *
 * @example
 * ```ts
 * const log = new Logger('MemoryStore');
 * log.info('Loaded 42 memories');
 * log.debug('Scanning directory', { dir: '/path/to/memories' });
 * log.error('Failed to read file', { error: err.message });
 *
 * // Change minimum level
 * Logger.setMinLevel('warn'); // Only warn and error are shown
 *
 * // Register a PluginHost to fan out to ObservabilityAdapters
 * Logger.setPluginHost(host);
 * ```
 */
export class Logger {
  private static minLevel: LogLevel = 'info'
  private static customHandler?: (entry: {
    level: LogLevel
    namespace: string
    message: string
    data?: Record<string, unknown>
    timestamp: string
  }) => void
  /** Optional PluginHost for ObservabilityAdapter fan-out. */
  private static pluginHost?: PluginHost

  private readonly namespace: string

  constructor(namespace: string) {
    this.namespace = namespace
  }

  /** Set the minimum log level globally */
  static setMinLevel(level: LogLevel): void {
    Logger.minLevel = level
  }

  /** Set a custom log handler (replaces console output, keeps plugin fan-out) */
  static setHandler(handler: typeof Logger.customHandler): void {
    Logger.customHandler = handler
  }

  /**
   * Register a PluginHost for ObservabilityAdapter fan-out.
   * Called by Agent after construction so all loggers share the host.
   */
  static setPluginHost(host: PluginHost | undefined): void {
    Logger.pluginHost = host
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data)
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data)
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data)
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data)
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[Logger.minLevel]) {
      return
    }

    const entry: LogEntry = {
      level,
      namespace: this.namespace,
      message,
      data,
      timestamp: new Date().toISOString(),
    }

    // 1. Fan out to ObservabilityAdapter plugins (best-effort, never throws)
    if (Logger.pluginHost) {
      Logger.pluginHost.emitLog(entry)
    }

    // 2. Custom handler (replaces console when set)
    if (Logger.customHandler) {
      Logger.customHandler(entry)
      return
    }

    // 3. Console fallback
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${this.namespace}]`
    const msg = data
      ? `${prefix} ${message} ${JSON.stringify(data)}`
      : `${prefix} ${message}`

    switch (level) {
      case 'debug':
        console.debug(msg)
        break
      case 'info':
        console.info(msg)
        break
      case 'warn':
        console.warn(msg)
        break
      case 'error':
        console.error(msg)
        break
    }
  }
}
