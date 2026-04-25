---
title: AccessPolicy
summary: The unified configuration surface for the YAAF IAM system, combining authorization, data scoping, and audit.
export_name: AccessPolicy
source_file: src/iam/types.ts
category: type
entity_type: api
search_terms:
 - IAM configuration
 - agent security settings
 - how to configure authorization
 - data scoping setup
 - audit logging for agents
 - RBAC and ABAC configuration
 - identity provider setup
 - tool access control
 - user permissions in agent
 - secure agent configuration
 - access control policy
 - onDecision callback
 - TenantScopeStrategy setup
stub: false
compiled_at: 2026-04-24T16:46:38.545Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `AccessPolicy` type is a configuration object that serves as the unified surface for the YAAF Identity and Access Management (IAM) system [Source 1]. It is provided to the `Agent` constructor to define the security posture of an agent.

This object combines several key security concerns into a single configuration:
- **[Authorization](../concepts/authorization.md)**: Deciding whether a user is permitted to invoke a specific tool.
- **[Data Scoping](../concepts/data-scoping.md)**: Determining the subset of data that [Tools](../subsystems/tools.md) are allowed to access for a given user.
- **Identity**: Resolving the user's identity from an incoming request in server environments.
- **Auditing**: Logging access control decisions for compliance and monitoring.

By centralizing these settings, `AccessPolicy` provides a consistent and comprehensive way to manage agent security [Source 1].

## Signature

`AccessPolicy` is a TypeScript type alias for an object with the following properties [Source 1]:

```typescript
export type AccessPolicy = {
  /**
   * Authorization strategy — decides if a tool call is allowed.
   * Default: allow all (backward-compatible)
   */
  authorization?: AuthorizationStrategy;

  /**
   * Data scoping strategy — determines what data tools can access.
   * Default: no scoping (unrestricted)
   */
  dataScope?: DataScopeStrategy;

  /**
   * Identity provider — resolve UserContext from incoming requests.
   * Only used in server modes (A2A, HTTP, WebSocket).
   */
  identityProvider?: IdentityProvider;

  /**
   * Audit callback — called after every authorization decision.
   * Use for compliance logging.
   */
  onDecision?: (event: AccessDecisionEvent) => void;
};
```

### Properties

- **`authorization`** (optional): An instance of an `AuthorizationStrategy`. This strategy evaluates each tool call against the user's context and decides whether to allow or deny it. If not provided, all [Tool Calls](../concepts/tool-calls.md) are allowed by default [Source 1].
- **`dataScope`** (optional): An instance of a `DataScopeStrategy`. This strategy resolves a `DataScope` for the current request, which tools then use to filter queries and API calls. If not provided, tools have unrestricted access to data [Source 1].
- **`identityProvider`** (optional): An instance of an `IdentityProvider`. This is used in server runtimes (like HTTP or WebSocket) to resolve a `UserContext` from an incoming request. It is not needed for standalone agent execution [Source 1].
- **`onDecision`** (optional): A callback function that is invoked after every authorization decision. It receives an `AccessDecisionEvent` and is primarily used for audit logging and compliance purposes [Source 1].

## Examples

The following example demonstrates how to configure an `Agent` with an `AccessPolicy` that uses a role-based authorization strategy, a tenant-based data scoping strategy, and an audit logger [Source 1].

```typescript
import { Agent, rbac, TenantScopeStrategy } from 'yaaf';

// A simple audit logger
const auditLog = {
  write: (event) => {
    console.log('AUDIT:', JSON.stringify(event));
  }
};

const agent = new Agent({
  // ... other agent configuration like tools
  tools: [/* ... your tools ... */],

  accessPolicy: {
    // Use a Role-Based Access Control (RBAC) strategy.
    // 'viewer' role can call tools starting with 'read_'.
    // 'admin' role can call any tool ('*').
    authorization: rbac({
      viewer: ['read_*'],
      admin: ['*']
    }),

    // Isolate data by tenant ID from the user's attributes.
    dataScope: new TenantScopeStrategy(),

    // Log every access decision.
    onDecision: (event) => auditLog.write(event),
  },
});
```

## Sources

[Source 1] src/iam/types.ts