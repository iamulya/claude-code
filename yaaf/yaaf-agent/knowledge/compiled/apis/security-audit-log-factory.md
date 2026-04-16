---
summary: Factory function to create and configure a SecurityAuditLog instance.
export_name: securityAuditLog
source_file: src/security/auditLog.ts
category: function
title: securityAuditLog
entity_type: api
stub: false
compiled_at: 2026-04-16T14:33:53.057Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/auditLog.ts
confidence: 1
---

## Overview
`securityAuditLog` is a factory function used to initialize the centralized security auditing subsystem in YAAF. It creates an instance of the `SecurityAuditLog` class, which collects and persists security events from various middleware components into a structured, queryable audit trail. This system is designed for compliance, forensics, and threat intelligence, supporting features like rolling retention, severity classification, and real-time event forwarding.

## Signature / Constructor

```typescript
function securityAuditLog(config?: AuditLogConfig): SecurityAuditLog
```

### Configuration Types

#### AuditLogConfig
The configuration object used to initialize the audit log.

| Property | Type | Description |
| :--- | :--- | :--- |
| `maxEntries` | `number` | Maximum entries to retain in memory before evicting oldest entries. Default: `10_000`. |
| `onEntry` | `(entry: AuditEntry) => void` | Callback for real-time forwarding of new audit entries to external systems (e.g., SIEM). |
| `minSeverity` | `AuditSeverity` | Minimum severity level to log. Default: `'info'`. |
| `sessionId` | `string` | Optional session ID for event correlation. |

#### AuditEntry
The structure of a single log entry.

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique event identifier. |
| `timestamp` | `Date` | Event occurrence time. |
| `severity` | `AuditSeverity` | Level: `'info'`, `'warning'`, or `'critical'`. |
| `category` | `AuditCategory` | The type of security event (see below). |
| `summary` | `string` | Human-readable description. |
| `data` | `Record<string, unknown>` | Optional structured event metadata. |
| `userId` | `string` | Optional IAM user identifier. |
| `sessionId` | `string` | Optional session or conversation identifier. |
| `source` | `string` | The middleware or component that produced the event. |

#### AuditCategory
Supported security event categories:
- `prompt_injection`
- `output_sanitized`
- `pii_detected`
- `pii_redacted`
- `trust_violation`
- `grounding_failed`
- `rate_limited`
- `input_anomaly`
- `access_denied`
- `tool_blocked`
- `canary_triggered`
- `custom`

## Methods & Properties
The `SecurityAuditLog` instance returned by this function provides the following capabilities:

- **Append-only Logging**: Maintains a structured event log with rolling retention based on `maxEntries`.
- **Event Correlation**: Groups events by session, user, or conversation.
- **Exporting**: Supports exporting the audit trail to JSON or NDJSON formats.
- **Statistics**: Provides a summary of threat intelligence via `AuditStats`, including:
    - Total entry counts.
    - Distribution by severity, category, and source.
    - Top users by event frequency.
    - Time range of captured data.

## Examples

### Basic Initialization
Creating a standard audit log with default settings.

```typescript
import { securityAuditLog } from 'yaaf';

const auditLog = securityAuditLog();
```

### External Integration
Configuring the audit log to forward critical events to an external monitoring service.

```typescript
import { securityAuditLog, AuditEntry } from 'yaaf';

const auditLog = securityAuditLog({
  maxEntries: 5000,
  minSeverity: 'warning',
  onEntry: (entry: AuditEntry) => {
    if (entry.severity === 'critical') {
      // Forward to external SIEM or alerting service
      sendToCloudWatch(entry);
    }
  }
});
```

### Accessing Statistics
Retrieving a summary of security events.

```typescript
const stats = auditLog.getStats();

console.log(`Total security events: ${stats.totalEntries}`);
console.log(`Critical events: ${stats.bySeverity.critical}`);
```