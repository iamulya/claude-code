---
summary: Provides centralized logging, persistence, and analysis for security-related events within YAAF.
primary_files:
 - src/security/auditLog.ts
title: Audit Logging System
entity_type: subsystem
exports:
 - SecurityAuditLog
 - securityAuditLog
 - AuditEntry
 - AuditLogConfig
 - AuditSeverity
 - AuditCategory
 - AuditStats
search_terms:
 - security event logging
 - how to log security events
 - YAAF audit trail
 - compliance logging
 - forensics in YAAF
 - SIEM integration
 - prompt injection logging
 - PII detection logs
 - structured security logs
 - NDJSON audit log
 - log rotation for security
 - onSinkError handler
 - security middleware events
 - threat intelligence summary
stub: false
compiled_at: 2026-04-25T00:28:03.118Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/auditLog.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Audit Logging System provides a centralized mechanism for collecting, persisting, and querying security-related events generated within the YAAF framework [Source 1]. Its primary purpose is to create a structured, append-only audit trail that can be used for security compliance, forensic analysis, and real-time threat monitoring. It captures events from various security middleware components, ensuring a comprehensive record of security-sensitive operations [Source 1].

## Architecture

The core of the system is the `SecurityAuditLog` class, which manages an in-memory, append-only log of [AuditEntry](../apis/audit-entry.md) objects [Source 1]. Each entry is a structured record containing a unique ID, timestamp, severity, category, a human-readable summary, and optional structured data. Events can be correlated by user and session IDs [Source 1].

The system is designed for production environments with several key features:

- **In-Memory Retention**: It maintains a configurable number of recent log entries in memory, evicting the oldest ones when the `maxEntries` limit is reached [Source 1].
- **Persistent File Sink**: The system can be configured to append all audit entries to a file in newline-delimited JSON (NDJSON) format. This format is compatible with common log ingestion pipelines like Filebeat and Fluentbit [Source 1].
- **Log Rotation**: To manage disk space, the file sink supports automatic log rotation based on file size (`maxFileSizeBytes`) and the number of retained archive files (`maxRotatedFiles`) [Source 1].
- **Error Handling**: It provides an `onSinkError` callback to handle failures when writing to a file or forwarding to other systems, preventing silent data loss [Source 1].
- **Backpressure Management**: For asynchronous notifications, a `maxQueueDepth` setting prevents slow downstream consumers from exhausting system memory by dropping overflow entries and reporting an error [Source 1].
- **Statistics**: The system can generate [AuditStats](../apis/audit-stats.md), providing summaries of events by severity, category, source, and top users over a given time range [Source 1].

## Integration Points

The Audit Logging System is primarily integrated with other security subsystems within YAAF, which act as the source of audit events.

- **Security Middleware**: Components like the [Input Security System](./input-security-system.md) or [Authorization System](./authorization-system.md) generate events for actions such as detected prompt injections, PII redaction, or access denials, which are then logged by this system [Source 1].
- **External Monitoring Systems**: The `onEntry` callback allows for real-time, synchronous forwarding of audit entries to external systems like a Security Information and Event Management (SIEM) platform or cloud logging services [Source 1].
- **Log Ingestion Pipelines**: The optional NDJSON file output at `filePath` serves as a direct integration point for log collectors like Filebeat or Fluentbit [Source 1].
- **Custom Error Monitoring**: The `onSinkError` callback allows developers to integrate with their own metrics or alerting systems (e.g., Prometheus, Datadog) to monitor the health of the audit pipeline [Source 1].

## Key APIs

- [SecurityAuditLog](../apis/security-audit-log.md): The main class that manages the collection, storage, and querying of audit events [Source 1].
- `securityAuditLog`: A factory function for creating and configuring an instance of `SecurityAuditLog` [Source 1].
- [AuditEntry](../apis/audit-entry.md): The interface defining the structure of a single security event record [Source 1].
- [AuditLogConfig](../apis/audit-log-config.md): The configuration object used to initialize the `SecurityAuditLog`, specifying retention policies, sinks, and error handlers [Source 1].
- [AuditSeverity](../apis/audit-severity.md): A type defining the severity levels for an audit event: `"info"`, `"warning"`, or `"critical"` [Source 1].
- [AuditCategory](../apis/audit-category.md): A type defining the categories of security events, such as `"prompt_injection"`, `"pii_detected"`, or `"access_denied"` [Source 1].
- [AuditStats](../apis/audit-stats.md): The interface for the summary statistics object returned by the log [Source 1].

## Configuration

The Audit Logging System is configured via the [AuditLogConfig](../apis/audit-log-config.md) object when instantiating `SecurityAuditLog`. Key configuration options include:

- `maxEntries`: Sets the maximum number of log entries to retain in memory. Defaults to 10,000 [Source 1].
- `minSeverity`: Filters out logs below the specified severity level. Defaults to `'info'` [Source 1].
- `onEntry`: A callback function for synchronous, real-time forwarding of new entries [Source 1].
- `filePath`: Specifies a path to a file where logs will be appended in NDJSON format. Enables the persistent file sink [Source 1].
- `maxFileSizeBytes` and `maxRotatedFiles`: Control the log rotation policy for the file sink [Source 1].
- `onSinkError`: A callback to handle errors from log sinks, such as file write errors. Defaults to `console.error` [Source 1].
- `maxQueueDepth`: Configures backpressure for asynchronous notifications. Defaults to 1000 [Source 1].

Example configuration for a file-based audit log with rotation:
```typescript
const auditLog = new SecurityAuditLog({
  filePath: '/var/log/yaaf/audit.ndjson',
  maxFileSizeBytes: 50 * 1024 * 1024, // 50 MB
  maxRotatedFiles: 7, // keep 7 rotated log files
  onSinkError: (err, entry) => {
    myMetrics.increment('audit.sink.error', { category: entry.category })
  }
})
```
[Source 1]

## Extension Points

The primary way to extend the functionality of the Audit Logging System is through the callback handlers provided in its configuration:

- **`onEntry`**: This synchronous callback allows developers to implement custom logic for every new audit entry, such as streaming events to a real-time dashboard or a custom database [Source 1].
- **`onSinkError`**: This callback allows for custom error handling and monitoring logic when a log sink fails, enabling robust integration with external observability platforms [Source 1].

## Sources

[Source 1]: src/security/auditLog.ts