---
summary: A unified configuration interface that combines identity, authorization, and data scoping strategies for an agent.
export_name: AccessPolicy
source_file: src/iam/types.ts
category: type
title: AccessPolicy
entity_type: api
stub: false
compiled_at: 2026-04-16T14:19:18.259Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/index.ts
confidence: 0.92
---

## Overview
`AccessPolicy` is the primary configuration interface for Identity and Access Management (IAM) within the YAAF framework. It provides a unified surface to define how an agent identifies users, authorizes tool execution, and scopes data access.

The policy architecture is divided into three functional layers:
1.  **Identity**: Determining the identity of the user (typically via `UserContext` or an `IdentityProvider`).
2.  **Authorization**: Determining if a user is permitted to call specific tools (e.g., using RBAC or ABAC strategies).
3.  **Data Scoping**: Determining what specific data subsets a user is allowed to see or interact with (e.g., tenant-based or ownership-based isolation).

`AccessPolicy` is passed to the `Agent` constructor to enforce these security constraints during the agent's runtime.

## Signature / Constructor

```typescript
export type AccessPolicy = {
  authorization?: AuthorizationStrategy;
  dataScope?: DataScopeStrategy;
};
```

### Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `authorization` | `AuthorizationStrategy` | Optional. Defines the logic for permitting or denying tool execution. Common implementations include RBAC and ABAC. |
| `dataScope` | `DataScopeStrategy` | Optional. Defines how data should be filtered or restricted based on the user's attributes, such as tenant IDs or department codes. |

## Examples

### Basic Role-Based Access Control (RBAC)
This example demonstrates a simple policy where tool access is restricted based on the user's assigned role.

```typescript
import { Agent, rbac } from 'yaaf'

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

### Advanced ABAC and Data Scoping
This example combines Attribute-Based Access Control (ABAC) with a multi-tenant data scoping strategy.

```typescript
import { Agent, abac, when, CompositeStrategy, TenantScopeStrategy } from 'yaaf'

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

// The policy is evaluated when the agent runs
await agent.run('Show me invoices', {
  user: { 
    userId: 'alice', 
    roles: ['viewer'], 
    attributes: { tenantId: 'acme', department: 'finance' } 
  },
})
```

## See Also
- `AuthorizationStrategy`
- `DataScopeStrategy`
- `UserContext`