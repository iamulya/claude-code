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
 *
 * Sprint 5: Optional Pino backend for NDJSON structured logging.
 * Call `Logger.enableStructuredLogging()` to activate if `pino` is installed.
 */

import type { PluginHost, LogEntry } from "../plugin/types.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Minimal interface for a structured logging backend (compatible with Pino).
 * Consumers can provide any logger that implements these methods.
 */
export interface StructuredLogBackend {
  debug(obj: Record<string, unknown>, msg: string): void;
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
  child(bindings: Record<string, unknown>): StructuredLogBackend;
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
 *
 * // Sprint 5: Enable structured NDJSON logging (requires pino)
 * await Logger.enableStructuredLogging();
 *
 * // Or provide your own structured backend
 * Logger.setBackend(myPinoInstance);
 * ```
 */
export class Logger {
  /**
   * W10-02: Process-global minimum log level. All Logger instances share this
   * default UNLESS overridden at construction time via `new Logger(ns, { level })`.
   *
   * WARNING — SINGLETON RISK: In a multi-agent server process, all agents share
   * this static. Calling `Logger.setMinLevel('debug')` affects every agent in the
   * process. Use per-instance `level` options when different agents need different
   * verbosity settings.
   */
  private static minLevel: LogLevel = "info";
  private static customHandler?: (entry: {
    level: LogLevel;
    namespace: string;
    message: string;
    data?: Record<string, unknown>;
    timestamp: string;
  }) => void;
  /** Optional PluginHost for ObservabilityAdapter fan-out. */
  private static pluginHost?: PluginHost;
  /**
   * Sprint 5: Optional structured logging backend (e.g. Pino).
   * When set, log output goes through this instead of console.
   */
  private static backend?: StructuredLogBackend;

  private readonly namespace: string;
  /**
   * Per-instance level override.
   * When set, this takes priority over the global static `Logger.minLevel`.
   * Allows different Agent instances in the same process to have independent
   * log verbosity without interfering with each other.
   *
   * @example
   * ```ts
   * const debugLogger = new Logger('agent-A', { level: 'debug' })
   * const quietLogger = new Logger('agent-B', { level: 'error' })
   * // agent-A logs at debug; agent-B only logs errors — both in the same process
   * ```
   */
  private readonly instanceLevel: LogLevel | undefined;
  /** Per-instance child logger from the backend (carries namespace binding). */
  private readonly childBackend?: StructuredLogBackend;

  constructor(namespace: string, opts?: { level?: LogLevel }) {
    this.namespace = namespace;
    this.instanceLevel = opts?.level;
    // Sprint 5: Create a child logger with the namespace binding, so each
    // instance's logs carry component context without per-call overhead.
    if (Logger.backend) {
      this.childBackend = Logger.backend.child({ component: namespace });
    }
  }

  /** Set the minimum log level globally */
  static setMinLevel(level: LogLevel): void {
    Logger.minLevel = level;
  }

  /** Set a custom log handler (replaces console output, keeps plugin fan-out) */
  static setHandler(handler: typeof Logger.customHandler): void {
    Logger.customHandler = handler;
  }

  /**
   * Register a PluginHost for ObservabilityAdapter fan-out.
   * Called by Agent after construction so all loggers share the host.
   */
  static setPluginHost(host: PluginHost | undefined): void {
    Logger.pluginHost = host;
  }

  /**
   * Sprint 5: Set a structured logging backend directly.
   * Any object implementing `StructuredLogBackend` works (Pino, Winston, Bunyan).
   *
   * @example
   * ```ts
   * import pino from 'pino';
   * Logger.setBackend(pino({ level: 'debug' }));
   * ```
   */
  static setBackend(backend: StructuredLogBackend | undefined): void {
    Logger.backend = backend;
  }

  /**
   * Sprint 5: Auto-detect and enable Pino structured logging.
   * Dynamically imports `pino` — if not installed, silently falls back to console.
   * Returns true if Pino was successfully enabled.
   *
   * @example
   * ```ts
   * const enabled = await Logger.enableStructuredLogging();
   * // enabled === true → NDJSON output
   * // enabled === false → console fallback (pino not installed)
   * ```
   */
  static async enableStructuredLogging(
    options?: { level?: LogLevel; prettyPrint?: boolean },
  ): Promise<boolean> {
    try {
      const pinoModule = await import("pino");
      const pino = pinoModule.default ?? pinoModule;
      const pinoOpts: Record<string, unknown> = {
        level: options?.level ?? Logger.minLevel,
      };
      // Pretty printing for dev — requires pino-pretty to be installed
      if (options?.prettyPrint) {
        pinoOpts.transport = {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        };
      }
      const instance = pino(pinoOpts) as unknown as StructuredLogBackend;
      Logger.setBackend(instance);
      return true;
    } catch {
      // pino not installed — continue with console fallback
      return false;
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log("error", message, data);
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    // Per-instance level override takes priority over global static.
    const effectiveMinLevel = this.instanceLevel ?? Logger.minLevel;
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[effectiveMinLevel]) {
      return;
    }

    const entry: LogEntry = {
      level,
      namespace: this.namespace,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    // 1. Fan out to ObservabilityAdapter plugins (best-effort, never throws)
    if (Logger.pluginHost) {
      Logger.pluginHost.emitLog(entry);
    }

    // 2. Custom handler (replaces console when set)
    if (Logger.customHandler) {
      Logger.customHandler(entry);
      return;
    }

    // 3. Sprint 5: Structured backend (Pino / custom)
    if (this.childBackend) {
      const logData = data ?? {};
      this.childBackend[level](logData, message);
      return;
    }

    // 4. Console fallback
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${this.namespace}]`;
    const msg = data ? `${prefix} ${message} ${JSON.stringify(data)}` : `${prefix} ${message}`;

    switch (level) {
      case "debug":
        console.debug(msg);
        break;
      case "info":
        console.info(msg);
        break;
      case "warn":
        console.warn(msg);
        break;
      case "error":
        console.error(msg);
        break;
    }
  }
}

