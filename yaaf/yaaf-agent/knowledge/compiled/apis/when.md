---
summary: An ABAC rule builder function to define conditions and chain allow/deny actions.
export_name: when
source_file: src/iam/authorization.ts
category: function
title: when
entity_type: api
search_terms:
 - ABAC rule builder
 - attribute-based access control helper
 - how to create authorization rules
 - conditional access control
 - user attribute condition
 - tool argument condition
 - fluent rule definition
 - chainable allow deny
 - authorization policy
 - iam rule factory
 - abac function
 - create AttributeRule
stub: false
compiled_at: 2026-04-24T17:49:27.532Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/authorization.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `when` function is a factory for creating Attribute-Based Access Control ([abac](./abac.md)) rules in a fluent, readable way [Source 1]. It serves as a builder for `AttributeRule` objects, which are used by the `AttributeStrategy` class and the `abac` helper function [Source 1].

The builder pattern starts with a `condition`—a predicate function that evaluates the user's context and the arguments of the tool being called. This is followed by chaining either an `.allow()` or `.deny()` method to specify the resulting action and the tool(s) the rule applies to [Source 1]. This approach is often more concise and expressive than constructing `AttributeRule` object literals manually [Source 1].

## Signature

The `when` function accepts a single `condition` function and returns an object with chainable `.allow()` and `.deny()` methods [Source 1].

```typescript
import type { UserContext } from '../agent/index.js';
import type { AttributeRule } from './[[[[[[[[Authorization]]]]]]]].js';

export function when(
  condition: (user: UserContext, args: Record<string, unknown>) => boolean | Promise<boolean>
): {
  allow: (...toolPatterns: string[]) => AttributeRule;
  deny: (...args: string[]) => AttributeRule; // Overloaded for patterns and optional reason
};
```

### Parameters

-   **`condition`**: `(user: UserContext, args: Record<string, unknown>) => boolean | Promise<boolean>`
    A function that receives the `UserContext` and the tool's arguments. It must return `true` or `false` (or a Promise that resolves to one) to indicate whether the rule's action should be applied [Source 1].

### Return Value

The function returns an intermediate object with two methods, `.allow()` and `.deny()`, which in turn return a complete `AttributeRule` object [Source 1].

## Chained Methods

The object returned by `when` has the following methods for completing the rule definition.

### `.allow()`

Creates an `allow` rule for one or more tool patterns.

**Signature:**
```typescript
.allow(...toolPatterns: string[]): AttributeRule
```

-   **`...toolPatterns`**: A list of one or more strings representing tool names or glob patterns (e.g., `'read_*'`) that should be allowed if the condition is met [Source 1].

### `.deny()`

Creates a `deny` rule for one or more tool patterns, optionally including a reason for the denial.

**Signatures:**
```typescript
// Deny with multiple tool patterns
.deny(...toolPatterns: string[]): AttributeRule

// Deny a single tool pattern with a reason
.deny(toolPattern: string, reason: string): AttributeRule
```

-   **`...toolPatterns`**: A list of one or more strings representing tool names or glob patterns that should be denied if the condition is met [Source 1].
-   **`reason`**: A string explaining why the action was denied. This is useful for logging and providing feedback to the user [Source 1].

## Examples

### Deny based on a user attribute

This example creates a rule that denies access to any tool matching `delete_*` if the user has the `isContractor` attribute set to `true` [Source 1].

```typescript
import { when } from 'yaaf';

const rule = when((user) => user.attributes?.isContractor === true)
  .deny('delete_*', 'Contractors cannot delete');
```

### Deny based on tool arguments

This rule inspects the arguments being passed to a tool. It prevents a user from performing write operations in a region different from their own assigned region [Source 1].

```typescript
import { when } from 'yaaf';

const rule = when((user, args) => (args.region as string) !== user.attributes?.region)
  .deny('write_*', 'Cannot write to resources outside your region');
```

### Allow based on a user attribute

This example grants access to classified query [Tools](../subsystems/tools.md) only if the user has the required clearance level [Source 1].

```typescript
import { when } from 'yaaf';

const rule = when((user) => user.attributes?.clearanceLevel === 'top-secret')
  .allow('query_classified_*');
```

### Usage with the `abac` factory

The `when` builder is commonly used to create an array of rules for the `abac` Authorization strategy helper [Source 1].

```typescript
import { abac, when } from 'yaaf';

const authStrategy = abac([
  when((user) => user.attributes?.department === 'hr')
    .allow('query_employees', 'update_employee'),
  
  when((user) => user.attributes?.isContractor)
    .deny('delete_*', 'Contractors cannot delete'),
]);
```

## See Also

-   `abac` function: A factory for creating an `AttributeStrategy`.
-   `AttributeStrategy` class: The authorization strategy that consumes rules created by `when`.
-   `AttributeRule` type: The object type that `when` produces.

## Sources

[Source 1]: src/iam/authorization.ts