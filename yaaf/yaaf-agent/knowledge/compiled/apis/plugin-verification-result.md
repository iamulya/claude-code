---
summary: Represents the outcome of a plugin verification, indicating if it's allowed and the reason.
export_name: PluginVerificationResult
source_file: src/security/trustPolicy.ts
category: type
title: PluginVerificationResult
entity_type: api
search_terms:
 - plugin security check
 - trust policy result
 - verify plugin integrity
 - plugin allow or deny
 - plugin verification outcome
 - how to check if a plugin is trusted
 - TrustVerificationEvent for plugins
 - plugin loading security
 - allowed plugin reason
 - blocked plugin reason
 - YAAF security types
 - plugin integrity status
stub: false
compiled_at: 2026-04-24T17:28:56.746Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/trustPolicy.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `PluginVerificationResult` type is a data structure that encapsulates the outcome of a security check performed on a plugin by a `TrustPolicy`. It provides a clear, consolidated result indicating whether a plugin is permitted to be loaded, a human-readable reason for the decision, and the detailed audit event that was generated during the verification process.

This type is primarily used internally by the `TrustPolicy` class to return the result of its verification logic. It serves as a standard format for communicating plugin trust status within the framework.

## Signature

`PluginVerificationResult` is an object type with the following structure [Source 1]:

```typescript
export type PluginVerificationResult = {
  /**
   * Whether the plugin is allowed to be loaded.
   * `true` if verification passed or the policy is in 'warn' mode.
   * `false` if verification failed in 'strict' mode.
   */
  allowed: boolean;

  /**
   * A human-readable string explaining the verification outcome.
   */
  reason: string;

  /**
   * The detailed audit event generated for this verification.
   */
  event: TrustVerificationEvent;
};
```

The `event` property uses the `TrustVerificationEvent` type, which is defined as [Source 1]:

```typescript
export type TrustVerificationEvent = {
  /** What was verified (will be 'plugin' in this context) */
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

## Properties

- **`allowed`**: `boolean`
  A boolean flag that is `true` if the plugin is permitted to load and `false` if it is blocked. The final value depends on the verification outcome and the `TrustPolicy`'s configured `mode` (`strict` or `warn`).

- **`reason`**: `string`
  A human-readable message detailing why the `allowed` status was determined. For example, "SHA-256 hash matched" for a successful verification, or "Plugin is not registered and unknownPolicy is 'deny'" for a blocked unknown plugin.

- **`event`**: `TrustVerificationEvent`
  The complete audit log object for the verification attempt. This provides structured, machine-readable data about the check, including the target, name, result, reason, and timestamp.

## Examples

Below are examples of what a `PluginVerificationResult` object might look like in different scenarios. These objects would typically be returned by a `TrustPolicy`'s internal methods.

### Allowed Plugin

This example shows the result for a plugin that was successfully verified against its SHA-256 hash in the trust policy.

```typescript
const successfulResult: PluginVerificationResult = {
  allowed: true,
  reason: "Plugin 'my-plugin' verified with matching SHA-256 hash.",
  event: {
    target: "plugin",
    name: "my-plugin",
    result: "verified",
    reason: "SHA-256 hash matched.",
    timestamp: new Date("2023-10-27T10:00:00Z"),
  },
};
```

### Blocked Plugin

This example shows the result for a plugin that failed verification due to a hash mismatch while the `TrustPolicy` was in `strict` mode.

```typescript
const blockedResult: PluginVerificationResult = {
  allowed: false,
  reason: "Plugin 'risky-plugin' blocked due to SHA-256 hash mismatch.",
  event: {
    target: "plugin",
    name: "risky-plugin",
    result: "blocked",
    reason: "SHA-256 hash mismatch. Expected 'abc...', got 'def...'.",
    timestamp: new Date("2023-10-27T10:05:00Z"),
  },
};
```

## See Also

- `TrustPolicy`: The class that performs plugin and MCP server verification.
- `TrustVerificationEvent`: The type used for detailed audit logging of verification events.

## Sources

[Source 1] src/security/trustPolicy.ts