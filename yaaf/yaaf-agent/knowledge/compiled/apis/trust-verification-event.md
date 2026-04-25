---
summary: Represents an event generated during the trust verification process, detailing the target, result, and reason.
export_name: TrustVerificationEvent
source_file: src/security/trustPolicy.ts
category: type
title: TrustVerificationEvent
entity_type: api
search_terms:
 - trust policy event
 - security verification log
 - plugin integrity check
 - mcp server verification
 - tool allowlist event
 - onVerification callback type
 - what is TrustVerificationEvent
 - security audit event
 - plugin loading status
 - blocked plugin reason
 - unknown plugin policy
 - trust policy logging
stub: false
compiled_at: 2026-04-24T17:46:35.332Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/trustPolicy.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `TrustVerificationEvent` type defines the structure of an object that captures the outcome of a single security check performed by a `TrustPolicy`. These events are generated for every plugin, MCP server, and MCP tool that undergoes verification.

This type is primarily used as the argument for the `onVerification` callback function within the `TrustPolicyConfig`. It provides a detailed record for auditing, logging, and real-time monitoring of the security decisions made by the framework. Each event contains information about what was verified, the result of the check, a human-readable reason for the outcome, and a timestamp.

## Signature

`TrustVerificationEvent` is a TypeScript type alias with the following structure:

```typescript
export type TrustVerificationEvent = {
  /** What was verified */
  target: "plugin" | "mcp_server" | "mcp_tool";
  /** Name of the entity */
  name: string;
  /** Result of verification */
  result: "trusted" | "verified" | "warning" | "blocked" | "unknown";
  /** Reason for the result */
  reason: string;
  /** Timestamp */
  timestamp: Date;
};
```

### Properties

- **`target`**: `"plugin" | "mcp_server" | "mcp_tool"`
  - Specifies the type of entity that was verified.

- **`name`**: `string`
  - The unique identifier of the entity, such as the plugin name or MCP server name.

- **`result`**: `"trusted" | "verified" | "warning" | "blocked" | "unknown"`
  - The outcome of the verification check.
    - `trusted`: The entity was explicitly marked as trusted and bypassed other checks.
    - `verified`: The entity passed all required checks (e.g., SHA-256 hash match).
    - `warning`: A check failed, but the policy is in `warn` mode, so loading was permitted.
    - `blocked`: A check failed, and the policy is in `strict` mode, so loading was denied.
    - `unknown`: The entity was not found in the trust policy manifest.

- **`reason`**: `string`
  - A human-readable message explaining the `result`. For example, "SHA-256 hash mismatch" or "Tool is not in the allowlist."

- **`timestamp`**: `Date`
  - The `Date` object representing [when](./when.md) the verification event occurred.

## Examples

The most common use of `TrustVerificationEvent` is within the `onVerification` callback when configuring a `TrustPolicy`. This allows for custom logging or monitoring of all security checks.

```typescript
import { TrustPolicy, TrustVerificationEvent } from 'yaaf';

// A custom logger for security events
function logSecurityEvent(event: TrustVerificationEvent) {
  console.log(
    `[${event.timestamp.toISOString()}] [${event.result.toUpperCase()}] ` +
    `${event.target} "${event.name}": ${event.reason}`
  );
}

// Configure a TrustPolicy to use the custom logger
const trustPolicy = new TrustPolicy({
  mode: 'strict',
  plugins: {
    'my-secure-plugin': {
      sha256: 'expected-hash-value',
    },
  },
  onVerification: logSecurityEvent,
});

// When the agent attempts to load plugins, the onVerification
// function will be called for each one, and log messages like:
//
// [2023-10-27T10:00:00.000Z] [VERIFIED] plugin "my-secure-plugin": SHA-256 hash matched.
// [2023-10-27T10:00:01.000Z] [BLOCKED] plugin "untrusted-plugin": Plugin not found in trust manifest.
```

## See Also

- `TrustPolicy`: The class that performs security verifications and generates these events.
- `TrustPolicyConfig`: The configuration object where the `onVerification` callback using this event type is defined.
- `trustPolicy`: The factory function for creating `TrustPolicy` instances.

## Sources

- [Source 1]: `src/security/trustPolicy.ts`