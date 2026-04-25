---
summary: A type representing the result of a permission policy check for a tool call.
export_name: PermissionOutcome
source_file: src/permissions.ts
category: type
title: PermissionOutcome
entity_type: api
search_terms:
 - permission check result
 - tool call authorization
 - allow deny escalate
 - permission policy outcome
 - agent security policy
 - what does a permission check return
 - YAAF security model
 - tool use approval
 - PermissionPolicy result
 - authorization decision
 - tool call action
stub: false
compiled_at: 2026-04-24T17:27:48.183Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/permissions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `PermissionOutcome` type represents the decision made by the YAAF [Permission System](../subsystems/permission-system.md) [when](./when.md) evaluating a tool call against a `PermissionPolicy`. This type is used internally by the framework to determine whether a tool call should be allowed, denied, or escalated for manual approval.

According to the documentation comments for the permission system, a check can result in one of three outcomes [Source 1]:
1.  **Allow**: The tool call is permitted to proceed.
2.  **Deny**: The tool call is blocked.
3.  **Escalate**: The decision is deferred to an `ApprovalHandler` for manual user confirmation.

The provided source extract for the `PermissionOutcome` type only explicitly defines the structure for the `allow` outcome. The structures for `deny` and `escalate` are implied by the behavior of the `PermissionPolicy` class but are not present in the source snippet [Source 1].

## Signature

The type is defined as a discriminated union based on the `action` property.

```typescript
export type PermissionOutcome =
  | { action: "allow" };
```

### Properties

*   `action`: A string literal indicating the decision. In the provided source, the only visible value is `"allow"`.

## Examples

The `PermissionOutcome` type is used internally by the `PermissionPolicy` and the agent runtime. It is not typically instantiated or consumed directly in user code. The primary interaction with the permission system is through configuring a `PermissionPolicy`, which implicitly generates `PermissionOutcome` objects.

```typescript
// Example of configuring a PermissionPolicy that produces different outcomes.
// Source: src/permissions.ts

const agent = new Agent({
  systemPrompt: '...',
  permissions: new PermissionPolicy()
    // This rule produces an { action: "allow" } outcome for 'search_*' tools.
    .allow('search_*')
    // This rule produces an outcome that requires approval.
    .requireApproval('book_trip', 'Booking requires your confirmation')
    // This rule produces a 'deny' outcome.
    .deny('delete_*', 'Deletion is not permitted')
    .onRequest(async (toolName, args, reason) => {
      const answer = await readline.question(`Allow ${toolName}? [y/N] `);
      return answer.toLowerCase() === 'y';
    }),
});
```

## See Also

*   `PermissionPolicy`: The class used to define [Authorization](../concepts/authorization.md) rules for [Tool Calls](../concepts/tool-calls.md).
*   `ApprovalHandler`: A function type for handling escalated permission requests that require manual approval.

## Sources

[Source 1]: src/permissions.ts