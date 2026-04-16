---
title: Access Policy
entity_type: concept
summary: Identity-aware authorization and data scoping for agents, supporting RBAC and ABAC patterns.
related_subsystems:
  - iam
  - security
stub: false
compiled_at: 2026-04-16T14:12:41.354Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agent.ts
confidence: 0.9
---

## What It Is
An Access Policy is a framework-level mechanism in YAAF used to implement identity-aware authorization and data scoping. While standard permissions focus on the inherent safety of a tool (e.g., "is this tool allowed to run?"), an Access Policy focuses on the identity of the requester (e.g., "is *this specific user* allowed to run this tool on *this specific data*?").

This concept is essential for production-grade agents operating in multi-tenant environments or applications with complex Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC) requirements. It ensures that agents do not inadvertently leak data across tenant boundaries or perform unauthorized actions on behalf of a user.

## How It Works in YAAF
The Access Policy system operates as a secondary layer of defense that complements the `PermissionPolicy`. In the YAAF execution lifecycle, the framework first evaluates the general permission policy to determine if a tool is safe to execute. If permitted, the `AccessPolicy` then evaluates the request against the provided user identity.

The system relies on four primary components:
1.  **Authorization**: Determines if a user's roles or attributes permit the execution of a specific tool (supporting RBAC and ABAC patterns).
2.  **Data Scoping**: Filters or restricts the data accessible to the agent through its tools based on the user's identity (e.g., limiting results to a specific `tenantId`).
3.  **Identity Resolution**: Utilizes a `UserContext` object passed during the agent's execution to identify the requester.
4.  **Audit**: Provides hooks to log every authorization decision for compliance and monitoring.

### User Context
To enforce an Access Policy, the developer must provide a `UserContext` when calling `agent.run()` or `agent.runStream()`. This context typically includes:
*   `userId`: A unique identifier for the user.
*   `roles`: A list of assigned roles (e.g., `['editor', 'viewer']`).
*   `attributes`: A key-value map of metadata used for ABAC or scoping (e.g., `tenantId`, `department`).

## Configuration
Access Policies are configured within the `Agent` constructor. Developers can define authorization rules, data scoping strategies, and decision hooks.

### Defining a Policy
The following example demonstrates an agent configured with RBAC and a tenant-based data scoping strategy:

```ts
import { Agent, rbac, TenantScopeStrategy } from 'yaaf';

const agent = new Agent({
  accessPolicy: {
    authorization: rbac({
      viewer: ['search_*', 'read_*'],
      admin: ['*'],
    }),
    dataScope: new TenantScopeStrategy({ bypassRoles: ['super_admin'] }),
    onDecision: (event) => {
      console.log(`Access ${event.decision}: ${event.user.userId} attempted ${event.action}`);
    },
  },
});
```

### Executing with Identity
When running the agent, the `user` context must be provided in the `RunOptions` to trigger the policy enforcement:

```ts
await agent.run('Show invoices', {
  user: {
    userId: 'alice-123',
    roles: ['editor'],
    attributes: { 
      tenantId: 'acme', 
      department: 'finance' 
    },
  },
});
```

## See Also
* [[Permission Policy]]
* [[Agent]]