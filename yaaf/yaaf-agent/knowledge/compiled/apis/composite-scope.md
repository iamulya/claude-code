---
summary: Composes multiple data scoping strategies, either by merging their filters or using the first matching strategy.
export_name: CompositeScope
source_file: src/iam/scoping.ts
category: class
title: CompositeScope
entity_type: api
search_terms:
 - combine data scopes
 - merge access filters
 - multiple scoping strategies
 - prioritize data access rules
 - first match scope
 - merge scope
 - how to use multiple DataScopeStrategy
 - tenant and ownership scope together
 - data isolation composition
 - complex data filtering
 - strict merge scopes
 - unrestricted scope merging
 - chaining scope strategies
stub: false
compiled_at: 2026-04-25T00:05:58.294Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/scoping.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`CompositeScope` is a class that implements the [DataScopeStrategy](./data-scope-strategy.md) interface to combine multiple data scoping strategies into a single, unified strategy [Source 1]. It allows for more complex data access rules by composing simpler, single-purpose strategies.

It operates in one of two modes [Source 1]:

1.  **`merge`**: This mode executes all provided strategies and deep-merges their resulting filters. It is useful for applying multiple, independent restrictions simultaneously, such as isolating data by both tenant and department.
    - By default, if any of the composed strategies returns a scope with `unrestricted: true`, the final merged scope will also be unrestricted. This is useful for implementing bypass roles like super-admins.
    - This behavior can be changed by setting the `strictMerge: true` option. In strict mode, an unrestricted scope is treated as having empty filters, which are then merged with other filters without granting global unrestricted access.

2.  **`firstMatch`**: This mode evaluates the provided strategies in order and uses the result from the first one that produces a non-empty scope. This is ideal for creating a prioritized chain of access rules, such as checking for an admin bypass first, then a tenant scope, and finally an ownership scope.

## Signature / Constructor

Instances of `CompositeScope` are created using one of its static factory methods, `merge()` or `firstMatch()`.

### `CompositeScope.merge()`

Creates a `CompositeScope` that runs all strategies and merges their filters.

```typescript
static merge(
  strategies: DataScopeStrategy[],
  options?: { strictMerge?: boolean }
): CompositeScope;
```

**Parameters:**

*   `strategies`: `DataScopeStrategy[]` - An array of [DataScopeStrategy](./data-scope-strategy.md) instances to combine.
*   `options?`: `{ strictMerge?: boolean }` - Optional configuration.
    *   `strictMerge`: If `true`, an `unrestricted: true` scope from one strategy will not cause the entire composite scope to become unrestricted [Source 1].

### `CompositeScope.firstMatch()`

Creates a `CompositeScope` that returns the result of the first strategy in the list that produces a non-empty scope.

```typescript
static firstMatch(strategies: DataScopeStrategy[]): CompositeScope;
```

**Parameters:**

*   `strategies`: `DataScopeStrategy[]` - An ordered array of [DataScopeStrategy](./data-scope-strategy.md) instances to evaluate.

## Examples

### Merge Mode

This example creates a scope that applies both tenant and department isolation by merging the filters from two separate strategies. A user must belong to the correct tenant *and* the correct department to access data.

```typescript
// Assuming tenantScope and departmentScope are instances of DataScopeStrategy

// Merge: tenant + department isolation
const scope = CompositeScope.merge([tenantScope, departmentScope]);

// For a user in tenant 'acme' and department 'engineering',
// the resulting scope might be:
// { filters: { tenantId: 'acme', department: 'engineering' } }
```

### First Match Mode

This example creates a prioritized scope. It first checks for a super-admin bypass. If that doesn't apply, it checks for tenant isolation. If that also doesn't apply (or is empty), it falls back to an ownership-based scope.

```typescript
// Assuming adminBypassScope, tenantScope, and ownershipScope are
// instances of DataScopeStrategy

// Priority: super-admin bypass, then tenant, then ownership
const scope = CompositeScope.firstMatch([
  adminBypassScope,
  tenantScope,
  ownershipScope,
]);
```

## See Also

*   [DataScopeStrategy](./data-scope-strategy.md): The interface that `CompositeScope` and other scoping strategies implement.

## Sources

[Source 1]: src/iam/scoping.ts