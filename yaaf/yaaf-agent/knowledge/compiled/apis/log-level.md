---
summary: Defines the standard logging levels (debug, info, warn, error) used by YAAF's Logger.
export_name: LogLevel
source_file: src/utils/logger.ts
category: type
title: LogLevel
entity_type: api
search_terms:
 - logging levels
 - log severity
 - debug log
 - info log
 - warn log
 - error log
 - how to set log level
 - logger configuration
 - structured logging types
 - YAAF logger
 - log verbosity
 - type for logging
stub: false
compiled_at: 2026-04-24T17:19:23.377Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/logger.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `LogLevel` type is a string literal type that defines the four standard severity levels for log messages within the YAAF framework [Source 1]. It is used by the `Logger` class to categorize log entries and to control the verbosity of the log output. The levels, in order of increasing severity, are `debug`, `info`, `warn`, and `error` [Source 1].

This type is fundamental to configuring the [Logging System](../subsystems/logging-system.md), for instance, [when](./when.md) setting the minimum level of logs to be processed or displayed [Source 1].

## Signature

`LogLevel` is a TypeScript type alias for a set of string literals.

```typescript
export type LogLevel = "debug" | "info" | "warn" | "error";
```
[Source 1]

## Examples

### Assigning a LogLevel

A variable can be typed with `LogLevel` to ensure it holds a valid logging level string.

```typescript
import { LogLevel } from 'yaaf';

const currentLevel: LogLevel = 'info';

function processLogs(level: LogLevel) {
  // ...
}

processLogs(currentLevel);
```

### Configuring the Logger

The `LogLevel` type is used in methods that configure the `Logger`, such as `Logger.setMinLevel`.

```typescript
import { Logger, LogLevel } from 'yaaf';

// This will configure the logger to only show 'warn' and 'error' messages.
const minimumLevel: LogLevel = 'warn';
Logger.setMinLevel(minimumLevel);
```
[Source 1]

## See Also

*   `Logger`: The primary class that consumes the `LogLevel` type for structured, level-based logging.

## Sources

*   [Source 1]: `src/utils/logger.ts`