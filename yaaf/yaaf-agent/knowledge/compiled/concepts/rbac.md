---
summary: An authorization model in YAAF that maps user roles to tool permissions.
title: Role-Based Access Control (RBAC)
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:20:03.250Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/types.ts
confidence: 0.95
---

---
title: Role-Based Access Control (RBAC)
entity_type: concept
summary: An authorization model in YAAF that maps user roles to tool permissions.
related_subsystems:
  - IAM

## What It Is
Role-Based Access Control (RBAC) is an authorization pattern in YAAF used to regulate access to tools based on the roles assigned to an end-user. Instead of assigning permissions to users individually, permissions are grouped into roles (e.g., "editor", "admin", "viewer"), which are then assigned to users.

In the context of an LLM-powered agent, RBAC ensures that the agent only invokes specific tools if the user on whose behalf it is acting possesses the required roles. This prevents unauthorized actions, such as a "viewer" user triggering a tool that modifies production data.

## How It Works in YAAF
RBAC is implemented through the interaction of user identity, authorization strategies, and the agent's access policy.

### User Identity
The `UserContext` object represents the identity of the end-user making a request. It contains a `roles` property, which is an array of strings representing the roles assigned to that user.

### Authorization Strategy
The core logic for RBAC resides in the `RoleStrategy`, which implements the `AuthorizationStrategy` interface. When an agent attempts to call a tool, the strategy's `evaluate` method is invoked with an `AuthorizationContext`. 

The strategy compares the user's roles against a defined mapping of roles to tool permissions. The evaluation results in an `AuthorizationDecision`:
*   **allow**: The tool call is permitted to proceed.
*   **deny**: The tool call is blocked, typically accompanied by a reason for audit logs.
*   **abstain**: The strategy has no opinion on the request and defers the decision to the next strategy in a chain (common in `CompositeStrategy` setups).

### Integration
RBAC is configured within the `AccessPolicy` of an `Agent`. This policy coordinates the `AuthorizationStrategy` with other IAM components like `DataScopeStrategy` (for data-level filtering) and `IdentityProvider` (for extracting user context from incoming requests).

## Configuration
Developers configure RBAC by defining a mapping of roles to tool patterns within the agent's access policy. Patterns can include wildcards to match multiple tools.

```typescript
import { Agent, rbac } from '@yaaf/core';

const agent = new Agent({
  tools: [...],
  accessPolicy: {
    // Define RBAC mapping: role -> allowed tool patterns
    authorization: rbac({ 
      viewer: ['read_*', 'search_docs'], 
      admin: ['*'],
      engineer: ['read_*', 'restart_service', 'query_logs']
    }),
    // Optional: Audit callback for compliance
    onDecision: (event) => {
      console.log(`User ${event.userId} ${event.decision.action} for tool ${event.toolId}`);
    },
  },
});
```

In this configuration, a user with the `viewer` role can only invoke tools starting with `read_` or the specific `search_docs` tool. A user with the `admin` role is granted access to all tools via the `*` wildcard.