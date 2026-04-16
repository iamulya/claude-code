---
summary: How to set up RBAC, ABAC, and data scoping for YAAF agents.
title: Configuring IAM and Access Control
entity_type: guide
stub: false
compiled_at: 2026-04-16T14:19:19.086Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/index.ts
confidence: 0.9
---

---
title: Configuring IAM and Access Control
entity_type: guide
summary: How to set up RBAC, ABAC, and data scoping for YAAF agents.
difficulty: intermediate

## Overview
YAAF provides a production-grade Identity and Access Management (IAM) system designed to secure LLM-powered agents. This guide demonstrates how to implement authorization and data scoping to ensure agents only execute tools and access data permitted for a specific user.

The YAAF IAM model operates across three distinct layers:
1.  **Identity**: Identifying the user via `UserContext`.
2.  **Authorization**: Determining if a user can call specific tools using Role-Based Access Control (RBAC) or Attribute-Based Access Control (ABAC).
3.  **Data Scoping**: Restricting the visibility of data (e.g., by tenant or ownership) via `DataScopeStrategy`.

## Prerequisites
*   A basic YAAF agent initialized with a set of tools.
*   Understanding of your application's user identity provider (e.g., Auth0, Clerk, or a custom database).

## Step-by-Step

### 1. Implement Role-Based Access Control (RBAC)
RBAC is the simplest way to manage tool access. You define roles and map them to tool name patterns using wildcards.

```typescript
import { Agent, rbac } from 'yaaf';

const agent = new Agent({
  tools: [/* ... */],
  accessPolicy: {
    authorization: rbac({
      viewer: ['search_*', 'read_*'],
      editor: ['search_*', 'read_*', 'write_*'],
      admin: ['*'],
    }),
  },
});
```

### 2. Implement Attribute-Based Access Control (ABAC)
For more granular control, use ABAC to evaluate user attributes (e.g., department, employment status) at runtime.

```typescript
import { Agent, abac, when } from 'yaaf';

const agent = new Agent({
  accessPolicy: {
    authorization: abac([
      when((u) => u.attributes?.isContractor).deny('delete_*', 'Contractors cannot delete'),
      when((u) => u.attributes?.department === 'finance').allow('query_invoices'),
    ]),
  },
});
```

### 3. Configure Data Scoping
Data scoping ensures that even if a user is authorized to use a tool, they only see data relevant to them (e.g., multi-tenancy).

```typescript
import { Agent, TenantScopeStrategy } from 'yaaf';

const agent = new Agent({
  accessPolicy: {
    dataScope: new TenantScopeStrategy({ 
      bypassRoles: ['super_admin'] 
    }),
  },
});
```

### 4. Combine Strategies
You can combine multiple authorization strategies using `CompositeStrategy`. This allows you to layer ABAC rules on top of standard RBAC.

```typescript
import { Agent, CompositeStrategy, rbac, abac, when } from 'yaaf';

const agent = new Agent({
  accessPolicy: {
    authorization: CompositeStrategy.firstMatch([
      abac([
        when((u) => u.attributes?.isContractor).deny('delete_*'),
      ]),
      rbac({ 
        viewer: ['read_*'], 
        admin: ['*'] 
      }),
    ]),
  },
});
```

### 5. Execute the Agent with User Context
When calling the agent, you must provide the `UserContext` in the run options. This context is used by the strategies defined in the `AccessPolicy`.

```typescript
await agent.run('Show me invoices', {
  user: { 
    userId: 'alice', 
    roles: ['viewer'], 
    attributes: { 
      tenantId: 'acme',
      department: 'finance'
    } 
  },
});
```

## Configuration Reference

### AccessPolicy
The primary configuration surface for IAM.

| Property | Type | Description |
| :--- | :--- | :--- |
| `authorization` | `AuthorizationStrategy` | Logic to permit or deny tool execution. |
| `dataScope` | `DataScopeStrategy` | Logic to filter data visibility. |

### UserContext
The identity object passed during agent execution.

| Property | Type | Description |
| :--- | :--- | :--- |
| `userId` | `string` | Unique identifier for the user. |
| `roles` | `string[]` | List of roles assigned to the user. |
| `attributes` | `Record<string, any>` | Arbitrary key-value pairs for ABAC and scoping. |

## Common Mistakes
*   **Missing User Context**: Forgetting to pass the `user` object in `agent.run()`. Without this context, most strategies will default to a "Deny" state for security.
*   **Overly Broad Wildcards**: Using `*` in RBAC for non-admin roles, which may inadvertently grant access to sensitive administrative tools.
*   **Strategy Order**: In `CompositeStrategy.firstMatch`, placing a broad "Allow" rule before a specific "Deny" rule. The first strategy to return a decision wins.

## Next Steps
*   Learn how to implement a custom `PermissionResolver` to query external systems like Jira or Confluence for permissions.
*   Explore `IdentityProvider` for automating user context resolution from incoming requests.

## Sources
* `src/iam/index.ts`