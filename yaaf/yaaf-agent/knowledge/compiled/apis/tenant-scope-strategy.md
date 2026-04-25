---
summary: An implementation of DataScopeStrategy that enforces multi-tenancy for data access.
export_name: TenantScopeStrategy
source_file: src/iam/index.ts
category: class
title: TenantScopeStrategy
entity_type: api
search_terms:
 - multi-tenant data isolation
 - SaaS data scoping
 - how to restrict data by tenant
 - tenantId filtering
 - user data segregation
 - application multi-tenancy
 - DataScopeStrategy implementation
 - bypass tenant scope
 - super admin access
 - user attribute scoping
 - tenant-based access control
 - isolate user data
stub: false
compiled_at: 2026-04-25T00:15:34.588Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/scoping.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`TenantScopeStrategy` is a class that implements the [DataScopeStrategy](./data-scope-strategy.md) interface to enforce multi-tenant data isolation. It is a fundamental component for building secure, multi-tenant applications with YAAF, ensuring that users can only access data belonging to their designated tenant [Source 2].

This strategy works by inspecting the `attributes` of the `UserContext` for a tenant identifier. It then generates a [DataScope](./data-scope.md) object containing a filter that restricts data access to that specific tenant. For example, if a user has an attribute `tenantId: 'acme'`, this strategy will produce a scope that filters data where the `tenantId` field is `'acme'` [Source 2].

The strategy also provides a mechanism to bypass this isolation for privileged users. By configuring a list of `bypassRoles`, users with those roles (e.g., 'super_admin') will be granted unrestricted data access [Source 2].

## Constructor

The `TenantScopeStrategy` is instantiated with an optional configuration object of type `TenantScopeConfig`.

```typescript
import type { DataScopeStrategy } from 'yaaf';

export class TenantScopeStrategy implements DataScopeStrategy {
  constructor(config?: TenantScopeConfig);
  // ... implementation
}
```

### `TenantScopeConfig`

The configuration object allows customization of the tenant scoping behavior [Source 2].

```typescript
export type TenantScopeConfig = {
  /**
   * The key in `user.attributes` that holds the tenant identifier.
   * @default 'tenantId'
   */
  tenantKey?: string;

  /**
   * The field name to use in the generated filter. If not provided, it
   * defaults to the value of `tenantKey`.
   */
  filterField?: string;

  /**
   * A list of roles that should bypass tenant isolation and receive
   * unrestricted data access.
   */
  bypassRoles?: string[];
};
```

## Examples

### Basic Usage

This example demonstrates creating a `TenantScopeStrategy` that uses the default `tenantId` attribute and allows users with the `super_admin` role to bypass scoping [Source 2].

```typescript
import { TenantScopeStrategy } from 'yaaf';

const scopeStrategy = new TenantScopeStrategy({
  tenantKey: 'tenantId',
  bypassRoles: ['super_admin'],
});

// For a user with tenantId='acme', the strategy would produce a scope like:
// { filters: { tenantId: 'acme' } }

// For a user with the 'super_admin' role, it would produce:
// { unrestricted: true }
```

### Integration with an Agent

Here, `TenantScopeStrategy` is used within an [Agent](./agent.md)'s [AccessPolicy](./access-policy.md) to apply tenant-based data scoping to all tool calls made by the agent [Source 1].

```typescript
import { Agent, TenantScopeStrategy } from 'yaaf';

const agent = new Agent({
  // ... other agent configuration
  accessPolicy: {
    dataScope: new TenantScopeStrategy({ bypassRoles: ['super_admin'] }),
  },
});

// When this agent runs for a user in the 'acme' tenant, all data
// access will be automatically filtered by `tenantId: 'acme'`.
await agent.run('Show me recent activity', {
  user: { userId: 'alice', roles: ['viewer'], attributes: { tenantId: 'acme' } },
});
```

## See Also

- [DataScopeStrategy](./data-scope-strategy.md): The interface that `TenantScopeStrategy` implements.
- [AccessPolicy](./access-policy.md): The configuration object where data scoping strategies are applied to an [Agent](./agent.md).
- [Agent](./agent.md): The primary class for creating and running LLM agents, where access policies are enforced.

## Sources

- [Source 1]: `src/iam/index.ts`
- [Source 2]: `src/iam/scoping.ts`