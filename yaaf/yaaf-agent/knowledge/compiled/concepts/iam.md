---
summary: The framework-level approach to securing agent interactions through identity verification, tool authorization, and data visibility scoping.
title: Identity and Access Management
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:19:08.864Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/index.ts
confidence: 0.95
---

---
title: Identity and Access Management
entity_type: concept
summary: The framework-level approach to securing agent interactions through identity verification, tool authorization, and data visibility scoping.
related_subsystems:
  - iam

## What It Is
Identity and Access Management (IAM) in YAAF provides a production-grade security layer for LLM-powered agents. It ensures that agent interactions are authenticated and authorized, preventing unauthorized tool execution or data leakage. The framework implements IAM to solve the challenge of scoping an agent's capabilities to the specific permissions of the user interacting with it, rather than allowing the agent to operate with unrestricted "god-mode" access.

## How It Works in YAAF
The YAAF IAM subsystem is structured into three distinct layers that process every agent request:

1.  **Identity**: Determines the identity of the user or system interacting with the agent. This is represented by the `UserContext` and managed via an `IdentityProvider`.
2.  **Authorization**: Determines if the identified user has the permission to execute a specific tool or action. This is handled by an `AuthorizationStrategy`, which supports patterns such as Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC).
3.  **Data Scoping**: Restricts the visibility of data returned to or processed by the agent based on the user's context. This is managed by a `DataScopeStrategy`, which can filter data by tenant, ownership, or specific attributes.

### Key Components
*   **AccessPolicy**: A unified configuration surface that combines authorization and data scoping rules for an agent.
*   **PermissionResolver**: An interface used to query external systems (such as Jira, Confluence, or internal databases) to resolve permissions dynamically at runtime.
*   **CompositeStrategy**: Allows developers to combine multiple authorization strategies (e.g., checking ABAC rules before falling back to RBAC).

## Configuration
IAM is configured at the agent level through the `accessPolicy` property. Developers can define how the agent should handle tool authorization and data visibility.

### Role-Based Access Control (RBAC)
RBAC allows developers to map specific roles to tool execution permissions using glob patterns.

```ts
import { rbac } from 'yaaf'

const agent = new Agent({
  tools: [...],
  accessPolicy: {
    authorization: rbac({
      viewer: ['search_*', 'read_*'],
      editor: ['search_*', 'read_*', 'write_*'],
      admin: ['*'],
    }),
  },
})
```

### Attribute-Based Access Control (ABAC) and Data Scoping
ABAC provides more granular control by evaluating user attributes. This can be combined with data scoping to ensure multi-tenant isolation.

```ts
import { abac, when, CompositeStrategy, TenantScopeStrategy } from 'yaaf'

const agent = new Agent({
  accessPolicy: {
    authorization: CompositeStrategy.firstMatch([
      abac([
        when((u) => u.attributes?.isContractor).deny('delete_*', 'Contractors cannot delete'),
        when((u) => u.attributes?.department === 'finance').allow('query_invoices'),
      ]),
      rbac({ viewer: ['read_*'], admin: ['*'] }),
    ]),
    dataScope: new TenantScopeStrategy({ bypassRoles: ['super_admin'] }),
  },
})

// Executing the agent with user context
await agent.run('Show me invoices', {
  user: { userId: 'alice', roles: ['viewer'], attributes: { tenantId: 'acme' } },
})
```

## Sources
* `src/iam/index.ts`