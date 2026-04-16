---
title: CompositeScope
entity_type: api
summary: Composes multiple data scoping strategies using merge or first-match logic.
export_name: CompositeScope
source_file: src/iam/scoping.ts
category: class
stub: false
compiled_at: 2026-04-16T14:19:43.761Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/scoping.ts
confidence: 0.9
---

## Overview
`CompositeScope` is a utility class used to aggregate and coordinate multiple data scoping strategies. In the YAAF framework, data scoping determines what specific data a tool is permitted to access during execution. `CompositeScope` allows developers to combine specialized strategies—such as tenant isolation, ownership-based filtering, or attribute-based rules—into a single cohesive strategy.

It supports two primary modes of operation:
1.  **Merge**: Executes all provided strategies and performs a deep merge of their resulting filters.
2.  **First Match**: Evaluates strategies in a prioritized sequence, returning the result of the first strategy that produces a non-empty scope.

## Signature / Constructor
`CompositeScope` implements the `DataScopeStrategy` interface. While it can be instantiated, it is typically accessed via its static factory methods.

```typescript
export class CompositeScope implements DataScopeStrategy {
  /**
   * Creates a composite strategy that merges filters from all sub-strategies.
   */
  static merge(strategies: DataScopeStrategy[]): CompositeScope;

  /**
   * Creates a composite strategy that returns the first non-empty scope found.
   */
  static firstMatch(strategies: DataScopeStrategy[]): CompositeScope;
}
```

## Methods & Properties
### Static Methods
*   **merge(strategies: DataScopeStrategy[])**: Returns a `CompositeScope` instance that runs every strategy in the provided array. The resulting filters from each strategy are deep-merged into a single filter object. This is useful for additive security layers (e.g., "User must be in Tenant A AND Department B").
*   **firstMatch(strategies: DataScopeStrategy[])**: Returns a `CompositeScope` instance that evaluates strategies in the order they appear in the array. It returns the result of the first strategy that produces a scope that is not empty or unrestricted. This is useful for priority-based access (e.g., "If user is an Admin, bypass all; otherwise, check Tenant; otherwise, check Ownership").

## Examples

### Merging Multiple Strategies
This example combines tenant isolation with department-level filtering. The resulting scope will contain filters for both fields.

```typescript
// Merge: tenant + department isolation
const scope = CompositeScope.merge([
  tenantScope, 
  departmentScope
]);

// Resulting scope might look like:
// { filters: { tenantId: 'acme', department: 'engineering' } }
```

### Priority-Based Scoping
This example uses `firstMatch` to allow administrative users to bypass restrictions while enforcing strict ownership rules for standard users.

```typescript
// Priority: super-admin bypass, then tenant, then ownership
const scope = CompositeScope.firstMatch([
  adminBypassScope,
  tenantScope,
  ownershipScope,
]);
```

## See Also
*   `TenantScopeStrategy`
*   `OwnershipScopeStrategy`
*   `AttributeScopeStrategy`
*   `HierarchyScopeStrategy`
*   `ResolverScopeStrategy`