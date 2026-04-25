---
title: AuthorizationDecision
summary: "Represents the outcome of an authorization evaluation: allow, deny, or abstain."
export_name: AuthorizationDecision
source_file: src/iam/types.ts
category: type
entity_type: api
search_terms:
 - authorization outcome
 - allow deny abstain
 - access control decision
 - IAM policy result
 - tool call permission
 - AuthorizationStrategy return value
 - what does evaluate return
 - security policy decision
 - RBAC result
 - ABAC result
 - access decision
 - policy evaluation result
stub: false
compiled_at: 2026-04-24T16:51:40.561Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `[[[[[[[[Authorization]]]]]]]]Decision` type represents the outcome of an Authorization check performed by an `AuthorizationStrategy`. It is a discriminated union that can take one of three states: `allow`, `deny`, or `abstain` [Source 1].

This type is the return value of the `evaluate` method on an `AuthorizationStrategy`. The YAAF IAM subsystem uses this decision to control agent behavior:

-   `allow`: The tool call is permitted and proceeds.
-   `deny`: The tool call is blocked, and an error is typically returned to the user.
-   `abstain`: The current strategy has no opinion on the request. This allows control to pass to the next strategy in a chain (e.g., within a `CompositeStrategy`), enabling layered security policies [Source 1].

## Signature

`AuthorizationDecision` is a union type where the `action` property determines the specific shape of the object [Source 1].

```typescript
export type AuthorizationDecision =
  | { action: "allow"; reason?: string }
  | { action: "deny"; reason: string }
  | { action: "abstain"; reason?: string };
```

### Properties

-   **`action`**: `("allow" | "deny" | "abstain")` (required)
    The core decision.

-   **`reason`**: `string` (optional for `allow` and `abstain`, required for `deny`)
    A human-readable string explaining the decision. This is particularly useful for logging, auditing, and providing feedback to the user [when](./when.md) a request is denied.

## Examples

### Allow Decision

This decision permits the tool call to proceed. A reason is optional but can be useful for audit logs.

```typescript
import { AuthorizationDecision } from "yaaf";

const allowDecision: AuthorizationDecision = {
  action: "allow",
  reason: "User role 'admin' has wildcard permissions.",
};
```

### Deny Decision

This decision blocks the tool call. A reason is required to explain why the action was denied.

```typescript
import { AuthorizationDecision } from "yaaf";

const denyDecision: AuthorizationDecision = {
  action: "deny",
  reason: "User lacks the required 'billing:write' permission.",
};
```

### Abstain Decision

This decision indicates that the current strategy cannot make a determination. It defers the decision to subsequent strategies.

```typescript
import { AuthorizationDecision } from "yaaf";

const abstainDecision: AuthorizationDecision = {
  action: "abstain",
  reason: "This strategy only handles read operations.",
};
```

## See Also

-   `AuthorizationStrategy`: The interface that authorization policies implement, which returns an `AuthorizationDecision`.
-   `AccessPolicy`: The configuration object where an `AuthorizationStrategy` is defined for an agent.

## Sources

[Source 1]: src/iam/types.ts