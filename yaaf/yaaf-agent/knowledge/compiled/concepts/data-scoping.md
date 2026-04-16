---
title: Data Scoping
entity_type: concept
summary: Determines what specific data a tool or agent can access based on user context and organizational rules, distinct from call authorization.
related_subsystems:
  - IAM
  - Tools
stub: false
compiled_at: 2026-04-16T14:19:28.605Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/scoping.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/types.ts
confidence: 1
---

## What It Is
Data Scoping is a security mechanism in YAAF that governs the visibility and boundaries of data available to an agent's tools during execution. While **Authorization** determines *whether* a user is permitted to invoke a specific tool, Data Scoping determines *what* specific records or resources that tool is allowed to interact with once invoked.

This concept is critical for building production-grade agents in multi-tenant environments, hierarchical organizations, or systems with complex data ownership rules. It prevents "data bleeding" by ensuring that even if an agent is authorized to use a "Search Documents" tool, it can only retrieve documents the specific end-user is permitted to see.

## How It Works in YAAF
Data Scoping is implemented through the `DataScopeStrategy` interface. When an agent processes a request, the framework uses the configured strategy to resolve a `DataScope` object based on the `UserContext`.

### The DataScope Object
The result of a scoping operation is a `DataScope` object, which contains:
- **filters**: A key-value map (e.g., `{ "tenantId": "acme-corp" }`) that tools apply to database queries or API calls.
- **unrestricted**: A boolean flag. If `true`, the tool may skip filtering (typically reserved for super-admins).
- **description**: A human-readable string used for audit logging and transparency.

### Scoping Strategies
YAAF provides several built-in strategies to handle common organizational patterns:

1.  **TenantScopeStrategy**: Provides multi-tenant isolation by filtering data based on a tenant identifier (e.g., `tenantId`) found in the user's attributes.
2.  **OwnershipScopeStrategy**: Filters data based on resource ownership. It can be configured to allow users to see their own data, while allowing managers to see data owned by their team members.
3.  **AttributeScopeStrategy**: The most flexible strategy, using Attribute-Based Access Control (ABAC) logic. It evaluates rules against the `UserContext` to produce dynamic filters.
4.  **HierarchyScopeStrategy**: Uses an organizational chart or tree structure to determine access. It can resolve access "down" (managers seeing reports), "up" (employees seeing department data), or "both".
5.  **ResolverScopeStrategy**: Integrates with external systems (like Confluence, Jira, or Google Drive) via a `PermissionResolver`. It queries the external system to discover what resources the user can access and translates those into filters.
6.  **CompositeScope**: Allows developers to combine multiple strategies using `merge` (combining all filters) or `firstMatch` (priority-based) logic.
7.  **SystemAwareScope**: Routes scoping requests to different strategies based on the tool being called. For example, a Jira tool might use a `ResolverScopeStrategy` while a local database tool uses a `TenantScopeStrategy`.

## Configuration
Data Scoping is configured within the `AccessPolicy` of an `Agent`. If no strategy is provided, the framework defaults to unrestricted access.

### Example: Tenant and Attribute Scoping
This example demonstrates a multi-tenant setup where non-admins are further restricted by their department.

```typescript
import { Agent, TenantScopeStrategy, AttributeScopeStrategy, CompositeScope } from '@yaaf/core';

const tenantStrategy = new TenantScopeStrategy({
  tenantKey: 'tenantId',
  bypassRoles: ['super_admin'],
});

const departmentStrategy = new AttributeScopeStrategy({
  rules: [
    {
      condition: (user) => !user.roles?.includes('admin'),
      filters: (user) => ({ department: user.attributes?.department }),
      description: (user) => `Scoped to department: ${user.attributes?.department}`,
    },
  ],
});

const agent = new Agent({
  tools: [...],
  accessPolicy: {
    // Merge both strategies: user must match tenant AND department
    dataScope: CompositeScope.merge([tenantStrategy, departmentStrategy]),
  },
});
```

### Example: External System Scoping
For tools interacting with third-party SaaS platforms, the `ResolverScopeStrategy` maps external permissions to tool filters.

```typescript
const scope = new ResolverScopeStrategy({
  resolver: new ConfluencePermissionResolver({ /* config */ }),
  toScope: (grants) => ({
    strategy: 'confluence',
    filters: { allowedSpaces: grants.map(g => g.resourceId) },
  }),
  cache: { ttl: 300, maxEntries: 1000 },
});
```