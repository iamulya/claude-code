---
title: AuditSeverity
entity_type: api
summary: "Defines the possible severity levels for an audit event: 'info', 'warning', or 'critical'."
export_name: AuditSeverity
source_file: src/security/auditLog.ts
category: type
search_terms:
 - audit log levels
 - security event severity
 - info warning critical
 - classifying audit entries
 - how to set log level
 - SecurityAuditLog severity
 - YAAF security logging
 - audit event classification
 - log filtering by severity
 - minSeverity type
 - AuditEntry severity property
stub: false
compiled_at: 2026-04-24T16:51:18.048Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/auditLog.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`AuditSeverity` is a TypeScript string literal type that defines the set of possible severity levels for a security audit event within the YAAF framework [Source 1]. It is used to classify the importance and potential impact of a logged event, enabling filtering, alerting, and prioritization of security-related incidents.

This type is a core component of the `SecurityAuditLog` subsystem. It is used in the `AuditEntry` type to specify the severity of each log entry and in the `AuditLogConfig` to set the minimum severity level for events to be processed [Source 1].

The three defined levels are:
- **`info`**: For routine, informational events.
- **`warning`**: For potential security issues or anomalies that may require attention.
- **`critical`**: For high-impact security events that indicate a likely threat or system compromise.

## Signature

`AuditSeverity` is defined as a union of three string literals [Source 1].

```typescript
export type AuditSeverity = "info" | "warning" | "critical";
```

## Examples

### Assigning Severity to an Audit Entry

This example shows how `AuditSeverity` is used [when](./when.md) creating an `AuditEntry` object.

```typescript
import { AuditEntry, AuditSeverity } from 'yaaf';

const entry: AuditEntry = {
  id: 'evt-12345',
  timestamp: new Date(),
  severity: 'warning', // Using the AuditSeverity type
  category: 'pii_detected',
  summary: 'PII detected in user prompt',
  source: 'PiiDetectionMiddleware',
  sessionId: 'sess-abcde',
};
```

### Configuring Minimum Severity

This example demonstrates using `AuditSeverity` to configure a `SecurityAuditLog` instance to only process events that are 'warning' or 'critical'.

```typescript
import { SecurityAuditLog, AuditSeverity } from 'yaaf';

const auditLog = new SecurityAuditLog({
  // Only log events with severity 'warning' or higher
  minSeverity: 'warning',
});
```

## See Also

- `SecurityAuditLog`: The class that manages and logs security events.
- `AuditEntry`: The type representing a single entry in the audit log.
- `AuditLogConfig`: The configuration object for the `SecurityAuditLog`.

## Sources

[Source 1]: src/security/auditLog.ts