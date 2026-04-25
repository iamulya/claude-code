---
title: ResolverScopeStrategy
entity_type: api
summary: A DataScopeStrategy that determines data access by querying an external PermissionResolver and mapping its grants to a DataScope.
export_name: ResolverScopeStrategy
source_file: src/iam/scoping.ts
category: class
search_terms:
 - permission resolver scoping
 - external permission system
 - custom data scoping
 - dynamic access control
 - integrate with existing authz
 - resolver-based data filtering
 - toScope function
 - caching permission grants
 - map grants to scope
 - pluggable data access
 - data filtering strategy
stub: false
compiled_at: 2026-04-25T00:12:28.259Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/scoping.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`ResolverScopeStrategy` is an implementation of the [DataScopeStrategy](./data-scope-strategy.md) interface that integrates with external or complex permission systems to determine data access for tools [Source 1].

This strategy is used when data access rules are not simple and need to be delegated to a dedicated service or component. It operates by:
1.  Querying a provided [PermissionResolver](./permission-resolver.md) with the current user context and tool information.
2.  Receiving a list of `PermissionGrant` objects from the resolver.
3.  Using a custom `toScope` function to transform these grants into a [DataScope](./data-scope.md) object, which contains the filters applied to the tool's data access [Source 1].

It also includes an optional caching mechanism to improve performance by memoizing the results from the permission resolver [Source 1].

## Signature / Constructor

The `ResolverScopeStrategy` class is instantiated with a configuration object of type `ResolverScopeConfig`.

```typescript
export class ResolverScopeStrategy implements DataScopeStrategy {
  constructor(config: ResolverScopeConfig);
  // ...
}
```

### `ResolverScopeConfig`

The configuration object for `ResolverScopeStrategy` has the following properties:

```typescript
export type ResolverScopeConfig = {
  /**
   * The external resolver to query for permission grants.
   */
  resolver: PermissionResolver;

  /**
   * A function that transforms the grants returned by the resolver
   * into a DataScope object.
   */
  toScope: (grants: PermissionGrant[], user: UserContext) => DataScope;

  /**
   * Optional cache configuration to store resolver results.
   */
  cache?: {
    /**
     * Time-to-live for cache entries in seconds.
     */
    ttl: number;
    /**
     * Maximum number of entries to store in the cache.
     */
    maxEntries?: number;
  };
};
```
[Source 1]

## Examples

The following example demonstrates how to configure a `ResolverScopeStrategy` to work with a hypothetical `ConfluencePermissionResolver`. The `toScope` function maps the permission grants (in this case, Confluence space IDs) to a filter that can be used by a tool.

```typescript
// Assuming ConfluencePermissionResolver is a custom implementation
// of the PermissionResolver interface.
const confluenceResolver = new ConfluencePermissionResolver({
  // ... resolver configuration
});

const scope = new ResolverScopeStrategy({
  resolver: confluenceResolver,
  toScope: (grants, user) => ({
    strategy: 'confluence',
    filters: { allowedSpaces: grants[0]?.resourceIds ?? [] },
  }),
  cache: { ttl: 300, maxEntries: 1000 },
});
```
[Source 1]

## See Also

- [DataScopeStrategy](./data-scope-strategy.md): The interface this class implements.
- [PermissionResolver](./permission-resolver.md): The interface for the external component that provides permission grants.
- [DataScope](./data-scope.md): The object returned by the strategy to define data access filters.
- [UserContext](./user-context.md): Provides user information to the `toScope` function.

## Sources

[Source 1]: src/iam/scoping.ts