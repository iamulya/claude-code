---
title: AttributeScopeStrategy
entity_type: api
summary: A flexible DataScopeStrategy that applies data filters based on a set of configurable rules evaluated against the user's attributes.
export_name: AttributeScopeStrategy
source_file: src/iam/scoping.ts
category: class
search_terms:
 - attribute based access control
 - ABAC data filtering
 - user attribute scoping
 - conditional data access
 - flexible data filtering
 - how to scope data by user properties
 - iam scoping rules
 - dynamic data filters
 - DataScopeStrategy implementation
 - user context filtering
 - AttributeScopeRule
 - AttributeScopeConfig
stub: false
compiled_at: 2026-04-25T00:05:02.610Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/scoping.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`AttributeScopeStrategy` is an implementation of [DataScopeStrategy](./data-scope-strategy.md) for attribute-based data filtering. It is considered the most flexible scoping strategy provided by YAAF [Source 1].

This strategy operates by evaluating a list of rules against the current [UserContext](./user-context.md). For each rule where the `condition` function returns `true`, its corresponding `filters` function is executed to generate a set of data filters. The filters from all matching rules are then merged to produce the final [DataScope](./data-scope.md). This allows for creating complex and dynamic data access policies based on user roles, attributes (like department or region), or any other property available in the user context.

## Signature / Constructor

The `AttributeScopeStrategy` class is instantiated with a configuration object that defines the rules for scoping.

```typescript
import type { DataScopeStrategy, AttributeScopeConfig } from 'yaaf';

export class AttributeScopeStrategy implements DataScopeStrategy {
  constructor(config: AttributeScopeConfig);
  // ...
}
```

### Configuration

The constructor accepts an `AttributeScopeConfig` object [Source 1]:

```typescript
export type AttributeScopeConfig = {
  /** An array of rules to evaluate for scoping. */
  rules: AttributeScopeRule[];
};
```

### Rule Definition

Each rule within the `rules` array is an `AttributeScopeRule` object with the following structure [Source 1]:

```typescript
import type { UserContext } from 'yaaf';

export type AttributeScopeRule = {
  /**
   * A function that determines if this rule should be applied.
   * It receives the user context and should return true if the rule is active.
   */
  condition: (user: UserContext) => boolean;

  /**
   * A function that generates the filter object for this rule.
   * It is only called if the `condition` returns true.
   */
  filters: (user: UserContext) => Record<string, unknown>;

  /**
   * An optional human-readable description for audit logs and debugging.
   * Can be a static string or a function that generates a string from the user context.
   */
  description?: string | ((user: UserContext) => string);
};
```

## Examples

The following example creates a scoping strategy with two rules:
1.  If the user is not an admin, scope data to their department.
2.  If the user has a region attribute, also scope data to that region.

```typescript
import { AttributeScopeStrategy, UserContext } from 'yaaf';

const scope = new AttributeScopeStrategy({
  rules: [
    {
      condition: (user: UserContext) => !user.roles?.includes('admin'),
      filters: (user: UserContext) => ({ department: user.attributes?.department }),
      description: (user: UserContext) =>
        `Scoped to department ${user.attributes?.department}`,
    },
    {
      condition: (user: UserContext) => user.attributes?.region !== undefined,
      filters: (user: UserContext) => ({ region: user.attributes?.region }),
      description: 'Scoped to user region',
    },
  ],
});

// --- Example Usage ---

// For a non-admin user in the 'engineering' department and 'us-west' region,
// both rules match. The resulting DataScope would have filters:
// { department: 'engineering', region: 'us-west' }

// For an admin user in the 'us-west' region, only the second rule matches.
// The resulting DataScope would have filters:
// { region: 'us-west' }
```

## See Also

-   [DataScopeStrategy](./data-scope-strategy.md): The interface that this class implements.
-   [UserContext](./user-context.md): The object containing user information that rules are evaluated against.

## Sources

[Source 1]: src/iam/scoping.ts