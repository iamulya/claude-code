---
title: AuditStats
entity_type: api
summary: Provides aggregated statistics about the audit log, such as total entries, counts by severity, and time range.
export_name: AuditStats
source_file: src/security/auditLog.ts
category: type
search_terms:
 - audit log summary
 - security event statistics
 - how to get audit log metrics
 - count security events
 - audit log aggregation
 - SecurityAuditLog stats
 - event counts by severity
 - event counts by category
 - top users in audit log
 - audit log time range
 - security monitoring data
 - compliance reporting metrics
 - threat intelligence summary
stub: false
compiled_at: 2026-04-24T16:51:26.642Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/auditLog.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `AuditStats` type defines the structure of an object containing aggregated statistics for the events stored in a `SecurityAuditLog` instance. This object provides a high-level summary of security-related activity, which is useful for monitoring, reporting, and threat analysis.

It includes a total count of all log entries, breakdowns of counts by severity, category, and source, a list of the most active users, and the time range covered by the logs. This data is typically retrieved by calling a method on a `SecurityAuditLog` instance (e.g., `getStats()`).

## Signature

`AuditStats` is a TypeScript type alias. Its structure is defined as follows:

```typescript
export type AuditStats = {
  /** The total number of entries in the audit log. */
  totalEntries: number;

  /** A record mapping each severity level to the number of entries with that severity. */
  bySeverity: Record<AuditSeverity, number>;

  /** A record mapping each event category to its occurrence count. */
  byCategory: Record<string, number>;

  /** A record mapping each event source (e.g., middleware name) to its occurrence count. */
  bySource: Record<string, number>;

  /** An array of objects, each containing a userId and their event count, sorted to show the most active users. */
  topUsers: Array<{ userId: string; count: number }>;

  /** An object containing the earliest and latest timestamps of all entries in the log, or null if the log is empty. */
  timeRange: { earliest: Date; latest: Date } | null;
};
```

## Examples

The following example demonstrates how to receive and use an `AuditStats` object, assuming it is returned by a `getStats()` method on a `SecurityAuditLog` instance.

```typescript
import { SecurityAuditLog, AuditStats } from 'yaaf';

// Assume auditLog is an instance of SecurityAuditLog that has been logging events.
const auditLog = new SecurityAuditLog();

// ... application runs and logs security events ...

// Retrieve the statistics object.
// Note: The getStats() method is hypothetical for this example.
const stats: AuditStats = auditLog.getStats();

// Use the statistics for monitoring or reporting.
console.log(`Total security events logged: ${stats.totalEntries}`);
console.log(`- Critical: ${stats.bySeverity.critical ?? 0}`);
console.log(`- Warning:  ${stats.bySeverity.warning ?? 0}`);
console.log(`- Info:     ${stats.bySeverity.info ?? 0}`);

if (stats.timeRange) {
  console.log(`Logs cover the period from ${stats.timeRange.earliest.toISOString()} to ${stats.timeRange.latest.toISOString()}.`);
}

const topUser = stats.topUsers[0];
if (topUser) {
  console.log(`Most active user: ${topUser.userId} with ${topUser.count} events.`);
}
```

## See Also

- `SecurityAuditLog`: The class that collects security events and from which `AuditStats` are generated.
- `AuditEntry`: The type definition for an individual log entry that is aggregated into `AuditStats`.
- `AuditSeverity`: The type defining the possible severity levels (`info`, `warning`, `critical`) used in the `bySeverity` breakdown.
- `AuditCategory`: The type defining the possible event categories used in the `byCategory` breakdown.

## Sources

[Source 1] src/security/auditLog.ts