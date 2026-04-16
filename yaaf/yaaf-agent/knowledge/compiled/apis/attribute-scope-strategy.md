---
title: AttributeScopeStrategy
entity_type: api
summary: Provides flexible, rule-based data filtering based on arbitrary user attributes.
export_name: AttributeScopeStrategy
source_file: src/iam/scoping.ts
category: class
stub: false
compiled_at: 2026-04-16T14:19:35.324Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/scoping.ts
confidence: 0.9
---

## Overview
`AttributeScopeStrategy` is a data scoping mechanism used to determine what specific data an LLM-powered tool can access. It is described as the most flexible scoping strategy within the framework, allowing developers to define arbitrary rules that map user context attributes to data filters.

Unlike identity-based permissions that determine if a tool can be called, this strategy focuses on filtering the result sets or parameters of tool execution based on the `UserContext`.

## Signature / Constructor

```typescript
export class AttributeScopeStrategy implements DataScopeStrategy {
  constructor(config: AttributeScopeConfig);
}
```

### Configuration Types

#### AttributeScopeConfig
The configuration object for the strategy.
```typescript
export type AttributeScopeConfig = {
  /** An array of rules to evaluate against the user context */
  rules: AttributeScopeRule[];
}
```

#### AttributeScopeRule
Defines a single condition and the resulting filter it produces.
```typescript
export type AttributeScopeRule = {
  /** Condition — when should this rule produce filters? */
  condition: (user: UserContext) => boolean;

  /** Produce filters from user context */
  filters: (user: UserContext) => Record<string, unknown>;

  /** Human-readable description for audit logs */
  description?: string | ((user: UserContext) => string);
}
```

## Methods & Properties
While `AttributeScopeStrategy` implements the `DataScopeStrategy` interface, its primary public surface is its constructor and the rule-based logic defined in its configuration. It evaluates the provided `AttributeScopeRule` set against a `UserContext` to generate a set of data filters.

## Examples

### Department and Region Filtering
This example demonstrates how to restrict data access based on a user's department (for non-admins) and their assigned region.

```typescript
const scope = new AttributeScopeStrategy({
  rules: [
    {
      // Apply department filter only if the user is not an admin
      condition: (user) => !user.roles?.includes('admin'),
      filters: (user) => ({ department: user.attributes?.department }),
      description: (user) =>
        `Scoped to department ${user.attributes?.department}`,
    },
    {
      // Apply region filter if the region attribute exists
      condition: (user) => user.attributes?.region !== undefined,
      filters: (user) => ({ region: user.attributes?.region }),
    },
  ],
});
```

## See Also
* `TenantScopeStrategy`
* `OwnershipScopeStrategy`
* `HierarchyScopeStrategy`
* `ResolverScopeStrategy`
* `CompositeScope`