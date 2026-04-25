---
summary: Provides structured, level-based logging capabilities for YAAF agents, including integration with observability plugins.
primary_files:
 - src/utils/logger.ts
title: Logging System
entity_type: subsystem
exports:
 - Logger
 - LogLevel
 - StructuredLogBackend
search_terms:
 - structured logging
 - how to log in yaaf
 - agent observability
 - pino integration
 - log levels
 - debug agent execution
 - custom log handler
 - ObservabilityAdapter
 - NDJSON logging
 - log namespace
 - fan out logs to plugins
 - set minimum log level
stub: false
compiled_at: 2026-04-24T18:16:41.134Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/logger.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Logging System provides a structured, level-based logging utility for YAAF agents [Source 1]. Its primary purpose is to offer a consistent way to record events, debug information, and errors throughout the framework and in agent applications. The system supports different log levels (`debug`, `info`, `warn`, `error`), namespacing to distinguish log sources, and attaching structured metadata to log entries [Source 1].

A key function of this subsystem is to integrate with the broader [Observability](../concepts/observability.md) capabilities of YAAF. It achieves this by fanning out all log entries to registered observability plugins, allowing for centralized log collection, monitoring, and analysis [Source 1].

## Architecture

The core of the Logging System is the `Logger` class. Instances of this class are typically created with a namespace string (e.g., `'MemoryStore'`) to identify the origin of the log messages [Source 1].

The system's configuration is managed through static methods on the `Logger` class. This allows for global setup of logging behavior, such as setting a minimum log level or registering a backend [Source 1].

The subsystem is designed to be extensible through a backend interface, `StructuredLogBackend`. This interface defines the methods required for a logging implementation (`debug`, `info`, `warn`, `error`, `child`) and is compatible with popular libraries like Pino. This allows developers to replace the default console logger with a more advanced, structured logging implementation [Source 1].

A planned feature is built-in support for a Pino backend to enable NDJSON (Newline Delimited JSON) structured logging, which can be activated by calling `Logger.enableStructuredLogging()` [Source 1].

## Integration Points

The primary integration point for the Logging System is with the YAAF plugin architecture. By calling `Logger.setPluginHost(host)`, the logging system connects to the agent's `PluginHost` [Source 1].

Once connected, every log entry is passed to all registered plugins that implement the `ObservabilityAdapter` interface. This process is additive, meaning logs are sent to plugins in addition to being processed by the configured backend (e.g., the console or a Pino instance). This mechanism allows plugins to capture and forward log data to external monitoring and observability platforms [Source 1].

## Key APIs

- **`class Logger`**: The main class used to create namespaced logger instances.
  - `new Logger(namespace: string)`: Creates a new logger for a specific component.
  - `debug(message: string, metadata?: Record<string, unknown>)`: Logs a debug-level message.
  - `info(message: string, metadata?: Record<string, unknown>)`: Logs an info-level message.
  - `warn(message: string, metadata?: Record<string, unknown>)`: Logs a warning-level message.
  - `error(message: string, metadata?: Record<string, unknown>)`: Logs an error-level message.

- **`Logger.setMinLevel(level: LogLevel)`**: A static method to set the minimum severity level for logs to be processed globally [Source 1].

- **`Logger.setPluginHost(host: PluginHost)`**: A static method to register the agent's `PluginHost`, enabling log entries to be fanned out to `ObservabilityAdapter` plugins [Source 1].

- **`Logger.setBackend(backend: StructuredLogBackend)`**: A static method to provide a custom logging implementation that conforms to the `StructuredLogBackend` interface [Source 1].

- **`Logger.enableStructuredLogging()`**: A static method to activate the built-in `pino` backend for NDJSON logging, if `pino` is installed [Source 1].

- **`type LogLevel`**: A type alias for the supported log levels: `"debug" | "info" | "warn" | "error"` [Source 1].

- **`interface StructuredLogBackend`**: An interface that defines the contract for a pluggable logging backend, enabling integration with libraries like Pino [Source 1].

## Configuration

Configuration of the Logging System is performed programmatically via static methods on the `Logger` class.

- **Log Verbosity**: The minimum log level is set using `Logger.setMinLevel('warn')`.
- **Observability**: Integration with plugins is enabled by passing the agent's `PluginHost` instance to `Logger.setPluginHost(host)`.
- **Log Backend**: The output format and destination are configured by either calling `Logger.enableStructuredLogging()` to use the optional Pino backend or by providing a custom implementation via `Logger.setBackend(myCustomBackend)` [Source 1].

An example of configuration:
```typescript
// Set minimum level to 'info'
Logger.setMinLevel('info');

// Register a PluginHost to fan out to ObservabilityAdapters
Logger.setPluginHost(host);

// Enable structured NDJSON logging (requires pino)
await Logger.enableStructuredLogging();
```
[Source 1]

## Extension Points

The Logging System offers two primary extension points:

1.  **Custom Backends**: Developers can provide their own logging implementation by creating a class that conforms to the `StructuredLogBackend` interface and registering it with `Logger.setBackend()`. This allows for integration with any logging framework or service [Source 1].
2.  **Observability Plugins**: Developers can create plugins that implement the `ObservabilityAdapter` interface. These plugins will receive every `LogEntry` generated by the system after a `PluginHost` has been registered. This is the standard way to export logs to external systems like Datadog, [OpenTelemetry](../concepts/open-telemetry.md), or other monitoring services [Source 1].

## Sources

[Source 1]: src/utils/logger.ts