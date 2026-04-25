---
summary: Defines a single rule for attribute-based data filtering, including a condition and filter generation.
export_name: AttributeScopeRule
source_file: src/iam/scoping.ts
category: type
title: AttributeScopeRule
entity_type: api
search_terms:
 - attribute based access control
 - ABAC rule definition
 - conditional data filtering
 - user attribute scoping
 - how to create attribute scope
 - dynamic data filters
 - user context based rules
 - AttributeScopeStrategy rules
 - IAM scoping rule
 - define data access by user properties
 - custom filter logic
stub: false
compiled_at: 2026-04-25T00:04:48.024Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/scoping.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `AttributeScopeRule` type defines a single, conditional rule used within an [AttributeScopeStrategy](./attribute-scope-strategy.md) to implement attribute-based data filtering. It is a core component for building flexible Attribute-Based Access Control (ABAC) policies for data access within YAAF [Source 1].

Each rule specifies a `condition` function to determine if the rule should apply to a given user, and a `filters` function that generates the actual data-scoping filters based on the user's attributes. This allows for dynamic and fine-grained control over what data a tool or agent can access [Source 1].

## Signature

`AttributeScopeRule` is a TypeScript type alias.

```typescript
export type AttributeScopeRule = {
  /**
   * A function that determines if this rule should be applied.
   * It receives the user's context and must return a boolean.
   */
  condition: (user: UserContext) => boolean;

  /**
   * A function that generates the data filters if the condition is met.
   * It receives the user's context and returns a record of filter keys and values.
   */
  filters: (user: UserContext) => Record<string, unknown>;

  /**
   * An optional human-readable description of the rule for audit logs and debugging.
   * Can be a static string or a function that generates a string from the user's context.
   */
  description?: string | ((user: UserContext) => string);
};
```
[Source 1]

### Properties

| Property      | Type                                           | Description                                                                                                                                                           |
|---------------|------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `condition`   | `(user: UserContext) => boolean`               | A function that evaluates the [UserContext](./user-context.md) and returns `true` if the rule should be applied, or `false` otherwise [Source 1].                                        |
| `filters`     | `(user: UserContext) => Record<string, unknown>` | A function that is executed only when `condition` returns `true`. It generates a key-value object representing the filters to apply to data queries [Source 1].        |
| `description` | `string \| ((user: UserContext) => string)` (optional) | Provides a human-readable explanation of the rule's purpose and effect, which is useful for auditing and debugging. It can be a static string or a dynamic function of the [UserContext](./user-context.md) [Source 1]. |

## Examples

The following example demonstrates how to define `AttributeScopeRule` objects. These rules are typically passed in an array to the constructor of an [AttributeScopeStrategy](./attribute-scope-strategy.md).

```typescript
import type { AttributeScopeRule, UserContext } from 'yaaf';

// Example rule: Scopes non-admin users to their own department.
// This rule applies only if the user is not an 'admin'.
const departmentScopeRule: AttributeScopeRule = {
  condition: (user: UserContext) => !user.roles?.includes('admin'),
  filters: (user: UserContext) => ({ department: user.attributes?.department }),
  description: (user: UserContext) =>
    `Scoped to department ${user.attributes?.department}`,
};

// Example rule: Applies a regional filter if the user has a region attribute.
// This rule applies to any user with a 'region' attribute defined.
const regionScopeRule: AttributeScopeRule = {
  condition: (user: UserContext) => user.attributes?.region !== undefined,
  filters: (user: UserContext) => ({ region: user.attributes?.region }),
  description: 'Scoped to user region',
};

// These rules would then be used to configure an AttributeScopeStrategy:
/*
import { AttributeScopeStrategy } from 'yaaf';

const strategy = new AttributeScopeStrategy({
  rules: [departmentScopeRule, regionScopeRule],
});
*/
```
[Source 1]

## See Also

- [AttributeScopeStrategy](./attribute-scope-strategy.md): The strategy that consumes an array of `AttributeScopeRule` objects to determine data access.
- [UserContext](./user-context.md): The object passed to the `condition` and `filters` functions, containing user information like roles and attributes.
- [DataScopeStrategy](./data-scope-strategy.md): The interface that all data scoping strategies, including [AttributeScopeStrategy](./attribute-scope-strategy.md), implement.

## Sources

[Source 1]: src/iam/scoping.ts