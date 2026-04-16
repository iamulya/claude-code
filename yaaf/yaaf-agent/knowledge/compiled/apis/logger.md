---
export_name: Logger
source_file: src/utils/logger.ts
category: class
title: Logger
entity_type: api
summary: A structured, level-based logging utility with namespace support and observability plugin integration.
stub: false
compiled_at: 2026-04-16T14:39:46.918Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/logger.ts
confidence: 0.98
---

## Overview
The `Logger` class provides a structured logging mechanism for YAAF agents. It supports hierarchical log levels, namespacing for identifying log sources, and the inclusion of arbitrary metadata. 

Beyond standard console output, the `Logger` can be integrated with a `PluginHost`. When a host is registered via `setPluginHost()`, all log entries are fanned out to every registered `ObservabilityAdapter` plugin. This integration is additive, meaning existing static handlers and console fallbacks remain active.

## Signature / Constructor

```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  /**
   * Creates a new Logger instance for a specific namespace.
   * @param namespace The category or component name for this logger (e.g., 'MemoryStore').
   */
  constructor(namespace: string);
}
```

## Methods & Properties

### Instance Methods
*   **debug(message: string, metadata?: Record<string, any>): void**
    Logs a message at the `debug` level with optional structured metadata.
*   **info(message: string, metadata?: Record<string, any>): void**
    Logs a message at the `info` level with optional structured metadata.
*   **warn(message: string, metadata?: Record<string, any>): void**
    Logs a message at the `warn` level with optional structured metadata.
*   **error(message: string, metadata?: Record<string, any>): void**
    Logs a message at the `error` level with optional structured metadata.

### Static Methods
*   **static setMinLevel(level: LogLevel): void**
    Sets the global minimum log level. Messages with a severity lower than this level will be suppressed.
*   **static setPluginHost(host: PluginHost): void**
    Registers a `PluginHost` to enable observability integration. Once set, log entries are forwarded to all registered `ObservabilityAdapter` plugins.

## Examples

### Basic Usage
```typescript
const log = new Logger('MemoryStore');

log.info('Loaded 42 memories');
log.debug('Scanning directory', { dir: '/path/to/memories' });
log.error('Failed to read file', { error: 'Access denied' });
```

### Global Configuration
```typescript
// Change minimum level globally so only warnings and errors are shown
Logger.setMinLevel('warn');

// Register a PluginHost to fan out logs to ObservabilityAdapters
// Logger.setPluginHost(host);
```

## See Also
*   `LogEntry` (type)
*   `PluginHost` (interface)
*   `ObservabilityAdapter` (interface)