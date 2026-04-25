---
title: AuditLogConfig
entity_type: api
summary: Configuration options for the SecurityAuditLog, including retention, sink handlers, file logging, and rotation.
export_name: AuditLogConfig
source_file: src/security/auditLog.ts
category: type
search_terms:
 - security log settings
 - audit trail configuration
 - how to configure SecurityAuditLog
 - log retention policy
 - log rotation settings
 - SIEM integration
 - log to file
 - NDJSON logging
 - audit log sink
 - backpressure configuration
 - log severity level
 - onSinkError handler
 - maxEntries for logs
stub: false
compiled_at: 2026-04-24T16:51:21.761Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/auditLog.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`AuditLogConfig` is a TypeScript type alias for the configuration object used to customize the behavior of a `SecurityAuditLog` instance [Source 1]. It allows developers to control various aspects of the security audit trail, such as in-[Memory](../concepts/memory.md) log retention, severity-based filtering, real-time forwarding to external systems, file-based logging with automatic rotation, and error handling for log delivery failures [Source 1].

This configuration object is passed to the `SecurityAuditLog` class constructor or the `securityAuditLog` factory function to initialize a new logger instance [Source 1].

## Signature

`AuditLogConfig` is a type alias for an object with the following properties [Source 1]:

```typescript
export type AuditLogConfig = {
  /**
   * Maximum entries to retain in memory.
   * Oldest entries are evicted [[[[[[[[when]]]]]]]] exceeded.
   * Default: 10_000.
   */
  maxEntries?: number;

  /**
   * Called synchronously for every new audit entry (real-time forwarding).
   * Use to pipe to external systems (SIEM, CloudWatch, etc.).
   * Note: this runs synchronously inside log() — keep it fast.
   */
  onEntry?: (entry: AuditEntry) => void;

  /**
   * Only log events at or above this severity.
   * Default: 'info' (log everything).
   */
  minSeverity?: AuditSeverity;

  /**
   * Session ID for event correlation.
   */
  sessionId?: string;

  /**
   * Called when a sink (e.g., file append) fails to deliver an entry.
   * Default: `console.error`. Set to `() => {}` to explicitly opt out.
   */
  onSinkError?: (error: unknown, entry: AuditEntry) => void;

  /**
   * Maximum number of in-flight async notifications before overflow
   * entries are dropped and `onSinkError` is called.
   * Default: 1000. Set to `Infinity` to disable backpressure.
   */
  maxQueueDepth?: number;

  /**
   * Append NDJSON audit entries to this file path.
   * Write errors are reported via `onSinkError`.
   */
  filePath?: string;

  /**
   * Maximum file size in bytes before the log rotates to a new file.
   * Requires `filePath` to be set. Default: undefined (no rotation).
   */
  maxFileSizeBytes?: number;

  /**
   * Maximum number of rotated files to retain.
   * Default: 5. Requires `maxFileSizeBytes` to be set.
   */
  maxRotatedFiles?: number;
};
```

## Examples

### Basic Configuration

This example configures an audit log to retain up to 5,000 entries in memory and only log events with a severity of `warning` or higher [Source 1].

```typescript
import { SecurityAuditLog, AuditLogConfig } from 'yaaf';

const config: AuditLogConfig = {
  maxEntries: 5000,
  minSeverity: 'warning',
};

const auditLog = new SecurityAuditLog(config);
```

### File Logging with Rotation

This example sets up file-based logging to an NDJSON file. The log file will rotate when it reaches 50 MB, and up to 7 rotated log files will be kept [Source 1].

```typescript
import { SecurityAuditLog, AuditLogConfig } from 'yaaf';

const config: AuditLogConfig = {
  filePath: '/var/log/yaaf/audit.ndjson',
  maxFileSizeBytes: 50 * 1024 * 1024, // 50 MB
  maxRotatedFiles: 7,
};

const auditLog = new SecurityAuditLog(config);
```

### Custom Sink and Error Handling

This example demonstrates forwarding log entries to an external system via the `onEntry` callback and implementing a custom error handler for sink failures using `onSinkError` [Source 1].

```typescript
import { SecurityAuditLog, AuditLogConfig, AuditEntry } from 'yaaf';

// A mock metrics client
const myMetrics = {
  increment: (metric: string, tags: Record<string, string>) => {
    console.log(`METRIC: ${metric}`, tags);
  },
};

// A mock external logging service
const externalLogger = {
  send: (entry: AuditEntry) => {
    console.log('Sending to external system:', entry);
    // This could be an API call to a SIEM like Splunk or Datadog
  },
};

const config: AuditLogConfig = {
  // Forward every entry to our external logger
  onEntry: (entry) => {
    externalLogger.send(entry);
  },
  // Handle errors if the file sink (or another sink) fails
  onSinkError: (err, entry) => {
    console.error('Failed to deliver audit entry:', err);
    myMetrics.increment('audit.sink.error', { category: entry.category });
  },
  filePath: '/var/log/yaaf/audit.ndjson',
};

const auditLog = new SecurityAuditLog(config);
```

## See Also

*   `SecurityAuditLog`: The class that consumes this configuration object.
*   `securityAuditLog`: A factory function for creating `SecurityAuditLog` instances.
*   `AuditEntry`: The type for the log entry object passed to handlers like `onEntry` and `onSinkError`.

## Sources

[Source 1] src/security/auditLog.ts