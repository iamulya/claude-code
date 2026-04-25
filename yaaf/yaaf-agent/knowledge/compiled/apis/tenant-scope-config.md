---
summary: Configuration options for the TenantScopeStrategy.
export_name: TenantScopeConfig
source_file: src/iam/scoping.ts
category: type
title: TenantScopeConfig
entity_type: api
search_terms:
 - multi-tenant data isolation
 - tenant-based access control
 - SaaS data scoping
 - how to configure TenantScopeStrategy
 - tenantKey configuration
 - filterField for tenants
 - bypassRoles for tenant isolation
 - user attribute for tenant ID
 - data filtering by tenant
 - super admin bypass for tenants
 - multi-tenancy security
 - IAM scoping options
stub: false
compiled_at: 2026-04-25T00:15:17.476Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/scoping.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`TenantScopeConfig` is a TypeScript type that defines the configuration for the [TenantScopeStrategy](./tenant-scope-strategy.md). This strategy is used to enforce data isolation in multi-tenant applications, ensuring that users can only access data belonging to their own tenant [Source 1].

This configuration specifies which user attribute identifies the tenant, what the corresponding field name in data filters should be, and which user roles (such as a super administrator) should be exempt from tenant-based filtering [Source 1].

## Signature

`TenantScopeConfig` is a type alias for an object with the following properties [Source 1]:

```typescript
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

### Properties

- **`tenantKey?`**: `string`
  - The key for the attribute on the user context object that holds the tenant identifier. For example, if `tenantKey` is `'organizationId'`, the strategy will look for `user.attributes.organizationId`.
  - Defaults to `'tenantId'` if not specified [Source 1].

- **`filterField?`**: `string`
  - The name of the field to use in the generated data scope filter. For instance, if `filterField` is `'tenant_id'`, the resulting filter will be `{ tenant_id: 'some-tenant' }`.
  - Defaults to the value of `tenantKey` if not specified [Source 1].

- **`bypassRoles?`**: `string[]`
  - An array of role names that are exempt from tenant isolation. Users with any of these roles will be granted unrestricted access, bypassing the tenant filter. This is typically used for system administrators or support roles [Source 1].

## Examples

The following example demonstrates how to configure a [TenantScopeStrategy](./tenant-scope-strategy.md) to isolate data by a `tenantId` field, while allowing users with the `super_admin` role to bypass this restriction [Source 1].

```typescript
import { TenantScopeStrategy } from 'yaaf';

const config: TenantScopeConfig = {
  tenantKey: 'tenantId',
  bypassRoles: ['super_admin'],
};

const tenantScope = new TenantScopeStrategy(config);

// For a regular user:
// User context: { id: 'user1', attributes: { tenantId: 'acme' }, roles: ['user'] }
// Resulting scope: { filters: { tenantId: 'acme' } }

// For a super admin:
// User context: { id: 'admin1', attributes: { tenantId: 'internal' }, roles: ['super_admin'] }
// Resulting scope: { unrestricted: true }
```

## See Also

- [TenantScopeStrategy](./tenant-scope-strategy.md): The class that uses this configuration to implement multi-tenant data scoping.
- [DataScopeStrategy](./data-scope-strategy.md): The interface that all data scoping strategies, including `TenantScopeStrategy`, implement.

## Sources

[Source 1]: src/iam/scoping.ts