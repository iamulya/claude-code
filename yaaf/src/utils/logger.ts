/**
 * Logger — Structured, level-based logging utility
 *
 * Structured logger for YAAF agents.
 * Supports log levels, namespaces, and structured metadata.
 */

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

  private readonly namespace: string

  constructor(namespace: string) {
    this.namespace = namespace
  }

  /** Set the minimum log level globally */
  static setMinLevel(level: LogLevel): void {
    Logger.minLevel = level
  }

  /** Set a custom log handler (replaces console output) */
  static setHandler(handler: typeof Logger.customHandler): void {
    Logger.customHandler = handler
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

    const entry = {
      level,
      namespace: this.namespace,
      message,
      data,
      timestamp: new Date().toISOString(),
    }

    if (Logger.customHandler) {
      Logger.customHandler(entry)
      return
    }

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
