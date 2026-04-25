---
summary: Structured, level-based logging utility for YAAF agents.
export_name: Logger
source_file: src/utils/logger.ts
category: class
title: Logger
entity_type: api
search_terms:
 - structured logging
 - how to log in yaaf
 - agent observability
 - log levels
 - pino integration
 - ndjson logging
 - debug agent execution
 - log namespace
 - custom log handler
 - ObservabilityAdapter logging
 - logging utility
 - error logging
 - set log level
stub: false
compiled_at: 2026-04-24T17:19:36.120Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/authorization.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/logger.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `Logger` class provides a structured, level-based logging utility for YAAF agents. It supports different log levels (`debug`, `info`, `warn`, `error`), namespaces for categorizing log messages, and attaching structured metadata to log entries [Source 2].

A key feature of the `Logger` is its integration with the YAAF [Plugin System](../subsystems/plugin-system.md). By registering a `PluginHost` using the static `Logger.setPluginHost()` method, all log entries are automatically fanned out to any registered `[[[[[[[[[[[[Observability]]]]]]]]Adapter]]]]` plugins. This allows for seamless integration with external Observability and monitoring platforms [Source 2].

The logger can also be configured to use a `pino`-compatible backend for NDJSON (Newline Delimited JSON) structured logging, which is suitable for production environments. This can be activated by calling `Logger.enableStructuredLogging()` if `pino` is installed, or by providing a custom backend instance via `Logger.setBackend()` [Source 2].

## Signature / Constructor

An instance of `Logger` is created with a namespace string, which helps to identify the source of log messages [Source 2].

```typescript
export class Logger {
  constructor(namespace: string);

  // ... methods
}
```

### Related Types

The `Logger` class uses the following associated types [Source 2]:

```typescript
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Minimal interface for a structured logging backend (compatible with Pino).
 */
export interface StructuredLogBackend {
  debug(obj: Record<string, unknown>, msg: string): void;
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
  child(bindings: Record<string, unknown>): StructuredLogBackend;
}
```

## Methods & Properties

### Instance Methods

Instance methods are used for writing log entries at different severity levels.

- **`debug(message: string, metadata?: Record<string, unknown>)`**: Logs a message at the 'debug' level, typically for verbose, diagnostic information.
- **`info(message: string, metadata?: Record<string, unknown>)`**: Logs a message at the 'info' level, for general operational information.
- **`warn(message: string, metadata?: Record<string, unknown>)`**: Logs a message at the 'warn' level, for potentially harmful situations.
- **`error(message: string, metadata?: Record<string, unknown>)`**: Logs a message at the 'error' level, for errors that do not halt the application.

### Static Methods

Static methods are used to configure the global logging behavior across all `Logger` instances.

- **`static setMinLevel(level: LogLevel)`**: Sets the minimum log level that will be processed. Messages below this level are ignored.
- **`static setPluginHost(host: PluginHost)`**: Registers a `PluginHost` instance. Once set, all log entries are forwarded to the host's registered `[[[[[[ObservabilityAdapter]]]]]]` plugins [Source 2].
- **`static async enableStructuredLogging()`**: Enables structured NDJSON logging by attempting to use `pino` if it is installed. This is an asynchronous operation [Source 2].
- **`static setBackend(backend: StructuredLogBackend)`**: Sets a custom structured logging backend that conforms to the `StructuredLogBackend` interface [Source 2].

## Examples

The following example demonstrates common usage patterns for the `Logger` class [Source 2].

```typescript
import { Logger } from 'yaaf';

// Create a logger instance with a namespace
const log = new Logger('MemoryStore');

// Log messages at different levels with optional metadata
log.info('Loaded 42 memories');
log.debug('Scanning directory', { dir: '/path/to/memories' });

try {
  // ... some operation that might fail
  throw new Error('File not found');
} catch (err) {
  log.error('Failed to read file', { error: err.message });
}

// --- Global Configuration ---

// Change the minimum log level for all logger instances
// After this call, the log.debug message above would be ignored.
Logger.setMinLevel('warn');

// Register a PluginHost to fan out logs to ObservabilityAdapters
// const host = new PluginHost(...);
// Logger.setPluginHost(host);

// Enable structured NDJSON logging (requires pino to be installed)
// This is useful for production environments.
await Logger.enableStructuredLogging();

// Or, provide your own custom pino-compatible instance
// import pino from 'pino';
// const myPinoInstance = pino({ level: 'info' });
// Logger.setBackend(myPinoInstance);
```

## See Also

- **ObservabilityAdapter**: The plugin type that receives log entries [when](./when.md) a `PluginHost` is registered with the `Logger`.

## Sources

[Source 1]: src/iam/[Authorization](../concepts/authorization.md).ts
[Source 2]: src/utils/logger.ts