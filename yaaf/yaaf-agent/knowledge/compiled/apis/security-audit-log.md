---
title: SecurityAuditLog
entity_type: api
summary: A class that provides a centralized security event logger, collecting and persisting security events.
export_name: SecurityAuditLog
source_file: src/security/auditLog.ts
category: class
search_terms:
 - security logging
 - audit trail
 - compliance logging
 - security event monitoring
 - how to log security events
 - SIEM integration
 - prompt injection logging
 - PII detection events
 - log rotation
 - NDJSON logging
 - forensics and incident response
 - structured logging
 - threat intelligence
 - event correlation
stub: false
compiled_at: 2026-04-24T17:37:01.110Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/auditLog.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/auditLog.ts
compiled_from_quality: unknown
confidence: 0.98
---
## Overview

The `SecurityAuditLog` class provides a centralized logger for security-related events within the YAAF framework [Source 1]. It is designed to collect and persist events from security middleware, creating a structured and queryable audit trail suitable for compliance, forensics, and threat analysis [Source 1].

Key features include:
- An append-only, structured event log.
- Classification of events by severity (`info`, `warning`, `critical`) and category.
- Correlation of events by session or user ID.
- In-[Memory](../concepts/memory.md) retention with a configurable limit.
- Export capabilities via synchronous callbacks or to a file in NDJSON format.
- Built-in file sink with automatic log rotation based on size.
- Observable sink failure handling and [Backpressure](../concepts/backpressure.md) for async notifications to prevent silent data loss or memory exhaustion [Source 1].


---

[Next: Signature / Constructor →](security-audit-log-part-2.md) | 
*Part 1 of 2*