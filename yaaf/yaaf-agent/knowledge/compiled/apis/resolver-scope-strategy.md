---
title: ResolverScopeStrategy
entity_type: api
summary: Delegates data scoping decisions to an external permission resolver with optional caching.
export_name: ResolverScopeStrategy
source_file: src/iam/scoping.ts
category: class
stub: false
compiled_at: 2026-04-16T14:19:38.336Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/scoping.ts
confidence: 0.9
---

## Overview
`ResolverScopeStrategy` is a data scoping implementation that delegates access decisions to an external `PermissionResolver`. It is designed for scenarios where data access rules are managed by a third-party system (such as Confluence or Jira) or a centralized authorization service.

The strategy queries the resolver for permission grants associated with a user context, then transforms those grants into a `DataScope` using a provided mapping function. To optimize performance and reduce external API calls, it includes built-in support for caching results.

## Signature / Constructor

### Constructor
```typescript
constructor(config: ResolverScopeConfig)
```

### ResolverScopeConfig
The configuration object defines the resolver, the transformation logic, and optional caching parameters.

```typescript
export type ResolverScopeConfig = {
  /** The external resolver used to fetch permission grants */
  resolver: PermissionResolver
  
  /** 
   * Transform resolved grants into a DataScope.
   * This function maps external permissions to internal data filters.
   */
  toScope: (grants: PermissionGrant[], user: UserContext) => DataScope
  
  /** Cache configuration for resolved scopes */
  cache?: {
    /** Time-to-live in seconds */
    ttl: number
    /** Maximum number of entries to keep in the cache */
    maxEntries?: number
  }
}
```

## Methods & Properties
`ResolverScopeStrategy` implements the `DataScopeStrategy` interface.

| Method | Description |
| :--- | :--- |
| `resolve(user: UserContext)` | Queries the configured `PermissionResolver`, applies the `toScope` transformation, and returns the resulting `DataScope`. |

## Examples

### External System Integration
This example demonstrates using `ResolverScopeStrategy` to scope data access based on permissions fetched from an external Confluence-like system.

```typescript
import { ResolverScopeStrategy } from 'yaaf/iam';

const scope = new ResolverScopeStrategy({
  resolver: new ConfluencePermissionResolver({ 
    baseUrl: 'https://acme.atlassian.net' 
  }),
  toScope: (grants) => ({
    strategy: 'confluence',
    // Map the resource IDs from the grants to a filter for allowed spaces
    filters: { 
      allowedSpaces: grants[0]?.resourceIds ?? [] 
    },
  }),
  cache: { 
    ttl: 300, // Cache results for 5 minutes
    maxEntries: 1000 
  },
});
```

## See Also
* `TenantScopeStrategy`
* `OwnershipScopeStrategy`
* `AttributeScopeStrategy`
* `HierarchyScopeStrategy`
* `CompositeScope`