---
title: TenantScopeStrategy
entity_type: api
summary: Implements multi-tenant isolation by filtering data based on a tenant identifier in the user context.
export_name: TenantScopeStrategy
source_file: src/iam/scoping.ts
category: class
stub: false
compiled_at: 2026-04-16T14:19:31.136Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/scoping.ts
confidence: 0.9
---

## Overview
`TenantScopeStrategy` is a data scoping strategy used to enforce multi-tenant isolation in SaaS applications. It determines what data a tool can access by extracting a tenant identifier from the user's context and applying it as a data filter. 

The strategy operates by checking the user's attributes for a specific key (defaulting to `tenantId`). If the user belongs to a role defined in the `bypassRoles` list, the strategy grants unrestricted access. Otherwise, it produces a filter object that restricts data access to the user's specific tenant.

## Signature / Constructor

```typescript
export class TenantScopeStrategy implements DataScopeStrategy {
  constructor(config: TenantScopeConfig);
}

export type TenantScopeConfig = {
  /**
   * Attribute key to use as tenant identifier.
   * Checked in: `user.attributes[tenantKey]`
   * Default: 'tenantId'
   */
  tenantKey?: string;
  /**
   * The field name to use in the filter output.
   * Default: same as `tenantKey`
   */
  filterField?: string;
  /** Roles that bypass tenant isolation */
  bypassRoles?: string[];
};
```

## Examples

### Basic Tenant Isolation
This example configures a strategy that filters data by `tenantId` and allows users with the `super_admin` role to bypass these restrictions.

```typescript
const scope = new TenantScopeStrategy({
  tenantKey: 'tenantId',
  bypassRoles: ['super_admin'],
});

// Resulting behavior:
// User with tenantId='acme' -> { filters: { tenantId: 'acme' } }
// User with 'super_admin' role -> { unrestricted: true }
```

### Custom Field Mapping
This example uses a custom attribute key from the user context and maps it to a different field name in the resulting data filter.

```typescript
const scope = new TenantScopeStrategy({
  tenantKey: 'organization_id',
  filterField: 'org_id'
});

// Resulting behavior:
// User with organization_id='dept_123' -> { filters: { org_id: 'dept_123' } }
```