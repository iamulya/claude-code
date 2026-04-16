---
summary: The practice of recording security-critical events to ensure compliance and facilitate forensic analysis within LLM applications.
title: Security Auditing
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:33:54.048Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/auditLog.ts
confidence: 0.95
---

---
title: Security Auditing
entity_type: concept
summary: The practice of recording security-critical events to ensure compliance and facilitate forensic analysis within LLM applications.
related_subsystems:
  - Security

## What It Is
Security Auditing in YAAF is the centralized mechanism for collecting, classifying, and persisting security-critical events generated during the lifecycle of an LLM interaction. It provides an append-only, structured audit trail designed to support regulatory compliance, forensic investigation, and threat intelligence.

The system captures anomalies and violations detected by security middleware—such as prompt injections, PII leaks, or trust violations—and correlates them to specific users and sessions. This allows developers to monitor the security posture of their agents in real-time and analyze historical data for patterns of abuse.

## How It Works in YAAF
The auditing system is centered around the `SecurityAuditLog` class and the `AuditEntry` data structure. When security middleware identifies a noteworthy event, it generates an entry that includes metadata for correlation and analysis.

### Event Classification
Events are classified by **Severity** and **Category**:

*   **Severity Levels**:
    *   `info`: Routine security events or informational logs.
    *   `warning`: Potential security risks or non-critical policy violations.
    *   `critical`: Confirmed attacks or severe data leaks (e.g., successful prompt injection or blocked tool execution).

*   **Categories**:
    The framework defines several standard categories for events, including `prompt_injection`, `pii_detected`, `pii_redacted`, `trust_violation`, `grounding_failed`, `rate_limited`, `input_anomaly`, `access_denied`, and `canary_triggered`.

### Data Structure
Each `AuditEntry` contains:
*   **Identifiers**: Unique event ID, timestamp, and the source middleware that produced the event.
*   **Context**: `userId` (from IAM) and `sessionId` for correlating events across a single conversation or user history.
*   **Payload**: A human-readable summary and a structured `data` object containing event-specific details.

### Retention and Export
The `SecurityAuditLog` maintains a rolling in-memory buffer of events with a configurable maximum entry count. For production environments, the system supports real-time forwarding via callbacks, allowing logs to be piped to external Security Information and Event Management (SIEM) systems, cloud logging services (like AWS CloudWatch), or structured files (JSON/NDJSON).

The framework also provides `AuditStats`, which summarizes the log state, including total entries, distribution by severity/category, and identification of top users associated with security events.

## Configuration
Developers configure the auditing behavior through the `AuditLogConfig` object. This includes setting retention limits, minimum severity thresholds for logging, and integration hooks for external persistence.

```typescript
import { securityAuditLog } from 'yaaf/security';

const auditLog = securityAuditLog({
  /** Maximum entries to retain in memory before eviction */
  maxEntries: 5000,

  /** Minimum severity to record (e.g., ignore 'info' in production) */
  minSeverity: 'warning',

  /** Real-time forwarding to external systems */
  onEntry: (entry) => {
    console.log(`[SECURITY ${entry.severity.toUpperCase()}] ${entry.summary}`);
    // Example: sendToSIEM(entry);
  },

  /** Optional session correlation */
  sessionId: 'conv-12345'
});
```

## Sources
* `src/security/auditLog.ts`---