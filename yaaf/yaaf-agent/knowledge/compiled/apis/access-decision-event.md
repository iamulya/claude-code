---
title: AccessDecisionEvent
entity_type: api
summary: A type representing the data payload for an event fired after an authorization decision is made.
export_name: AccessDecisionEvent
source_file: src/iam/index.ts
category: type
search_terms:
 - authorization event
 - access control event
 - IAM audit event
 - security decision log
 - what happens after an access check
 - rbac event
 - abac event
 - policy decision event
 - user permission event
 - tool access log
 - agent security auditing
 - permission check result
stub: false
compiled_at: 2026-04-25T00:03:55.737Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/index.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `AccessDecisionEvent` type defines the structure of the data payload for an event that is emitted after an authorization decision has been made within the Identity and Access Management (IAM) subsystem [Source 1].

This event captures the context and outcome of an access check, such as whether a user was allowed or denied from performing an action. It is typically used for auditing, logging, and monitoring security-related activities within an agent.

## Signature

`AccessDecisionEvent` is exported as a TypeScript type. Its specific definition is located in `src/iam/types.ts` and re-exported from the main IAM module [Source 1]. The provided source material does not include the detailed type definition, only its export.

```typescript
// Exported from: src/iam/index.ts
export type { AccessDecisionEvent } from "./types.js";
```

## Examples

The provided source material does not contain examples of how to consume or handle an `AccessDecisionEvent`.

## See Also

- [AccessPolicy](./access-policy.md): The main configuration surface for an agent's security policies.
- [AuthorizationDecision](./authorization-decision.md): The type representing the outcome of an authorization check (e.g., 'allow' or 'deny').
- [AuthorizationStrategy](./authorization-strategy.md): The interface for implementing different authorization models like RBAC or ABAC.

## Sources

[Source 1]: src/iam/index.ts