---
export_name: LogLevel
source_file: src/utils/logger.ts
category: type
title: LogLevel
entity_type: api
summary: A union type representing the supported severity levels for the YAAF logging system.
stub: false
compiled_at: 2026-04-16T14:39:46.820Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/logger.ts
confidence: 0.95
---

## Overview
`LogLevel` is a TypeScript type alias that defines the valid severity levels for the YAAF logging system. It is used by the `Logger` class to categorize log entries and to filter output based on a minimum threshold. When a `PluginHost` is configured, these levels are also used to route log data to registered observability adapters.

## Signature / Constructor
```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

## Values
The `LogLevel` type consists of the following string literals, ordered by increasing severity:

| Value | Description |
| :--- | :--- |
| `debug` | Fine-grained informational events intended for development and troubleshooting. |
| `info` | Standard informational messages highlighting application progress. |
| `warn` | Notifications regarding potentially harmful or unexpected situations that do not stop execution. |
| `error` | Critical events indicating failures or conditions that may require immediate attention. |

## Examples

### Setting a Minimum Log Level
The `LogLevel` type is used when configuring the global logging threshold.

```typescript
import { Logger, type LogLevel } from 'yaaf';

const level: LogLevel = 'warn';
Logger.setMinLevel(level);

const log = new Logger('Agent');
log.info('This will not be shown');
log.error('This will be shown');
```

### Type Safety in Custom Handlers
When implementing custom logic that processes log entries, `LogLevel` ensures that only valid severity strings are handled.

```typescript
import { type LogLevel } from 'yaaf';

function processLog(message: string, level: LogLevel) {
  if (level === 'error') {
    // Trigger alert system
  }
}
```

## See Also
* `Logger` (class)
* `LogEntry` (interface)