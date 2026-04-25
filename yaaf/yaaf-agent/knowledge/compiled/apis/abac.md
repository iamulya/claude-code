---
summary: A convenience factory function for quickly setting up an `AttributeStrategy` instance.
export_name: abac
source_file: src/iam/authorization.ts
category: function
title: abac
entity_type: api
search_terms:
 - attribute-based access control
 - ABAC setup
 - create authorization rules
 - user attribute permissions
 - context-aware authorization
 - policy as code
 - tool access control
 - how to use abac
 - AttributeStrategy factory
 - define security predicates
 - dynamic permissions
 - content-aware rules
 - when rule builder
stub: false
compiled_at: 2026-04-24T16:46:42.131Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/authorization.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `abac` function is a factory for creating an `AttributeStrategy` instance, which implements Attribute-Based Access Control (ABAC) [Source 1]. This [Authorization](../concepts/authorization.md) model defines rules as predicates over user attributes and tool arguments. It allows for fine-grained, context-aware, and content-aware authorization policies [Source 1].

You would use `abac` to quickly define a set of authorization rules based on dynamic conditions, such as a user's department, their role attributes (e.g., `isContractor`), the time of day, or even the specific arguments being passed to a tool [Source 1]. It is often used with the `[[[[[[[[when]]]]]]]]` rule builder for a more declarative syntax [Source 1].

## Signature

The `abac` function takes an array of `AttributeRule` objects and an optional configuration object [Source 1].

```typescript
export function abac(
  rules: AttributeRule[],
  options?: { /* ... */ }
): AttributeStrategy;
```

### Parameters

-   **`rules`**: `AttributeRule[]`
    An array of rule objects that define the authorization logic. Each rule consists of a condition, an action (`allow` or `deny`), and other metadata [Source 1].

-   **`options`**: `object` (optional)
    Configuration options for the underlying `AttributeStrategy`. This can be used to set properties like `defaultAction` when no rules match a given tool call [Source 1].

### `AttributeRule` Type

The `rules` array is composed of objects matching the `AttributeRule` type [Source 1]:

```typescript
export type AttributeRule = {
  /** Human-readable rule name (for audit logs) */
  name: string;

  /** Tool patterns this rule applies to. Omit or use ['*'] for all tools. */
  tools?: string[];

  /** Predicate over user context and tool arguments. */
  condition: (user: UserContext, args: Record<string, unknown>) => boolean | Promise<boolean>;

  /** Action to take when condition matches */
  action: "allow" | "deny";

  /** Reason for denial (used when action is 'deny') */
  reason?: string;

  /**
   * Evaluation priority. Higher numbers are evaluated first.
   * Defaults to 0.
   */
  priority?: number;
};
```

## Examples

The most common usage pattern involves passing an array of rules, often constructed with the `when` helper function, to `abac` [Source 1].

```typescript
import { abac, when } from 'yaaf';
import type { UserContext } from 'yaaf';

const auth = abac([
  // Allow users in the 'hr' department to access employee tools
  when((user: UserContext) => user.attributes?.department === 'hr')
    .allow('query_employees', 'update_employee'),

  // Deny contractors from using any tool matching 'delete_*'
  when((user: UserContext) => user.attributes?.isContractor)
    .deny('delete_*', 'Contractors cannot delete'),
]);

// This `auth` object is an instance of AttributeStrategy
// and can be used in an agent's authorization configuration.
```

## See Also

-   `AttributeStrategy`: The class that `abac` constructs.
-   `when`: A rule builder function used to create `AttributeRule` objects with a fluent API.
-   `rbac`: A factory function for setting up Role-Based Access Control.
-   `CompositeStrategy`: A class for combining multiple authorization strategies.

## Sources

[Source 1]: src/iam/authorization.ts