---
summary: Combines multiple authorization strategies using `allOf`, `anyOf`, or `firstMatch` semantics.
export_name: CompositeStrategy
source_file: src/iam/authorization.ts
category: class
title: CompositeStrategy
entity_type: api
search_terms:
 - combine authorization policies
 - multiple auth strategies
 - allOf authorization
 - anyOf authorization
 - firstMatch authorization
 - chaining authorization rules
 - layered security policies
 - RBAC and ABAC together
 - authorization composition
 - fallback authorization
 - union of permissions
 - intersection of permissions
 - priority-based authorization
stub: false
compiled_at: 2026-04-24T16:56:53.636Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/authorization.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `CompositeStrategy` class is a component of the YAAF [Authorization](../concepts/authorization.md) subsystem that allows for the composition of multiple `AuthorizationStrategy` instances [Source 1]. It enables the creation of sophisticated, layered security policies by combining simpler strategies, such as `RoleStrategy` and `AttributeStrategy`, with explicit logical semantics [Source 1].

This class is used [when](./when.md) a single authorization model is insufficient. For example, one might use a base `RoleStrategy` for general permissions and layer an `AttributeStrategy` on top for specific, context-aware overrides.

`CompositeStrategy` supports three composition modes [Source 1]:

*   **`allOf`**: The most restrictive mode. An action is permitted only if **all** composed strategies explicitly allow it. This is equivalent to a logical AND or an intersection of permissions.
*   **`anyOf`**: The most permissive mode. An action is permitted if **any** of the composed strategies allows it. This is equivalent to a logical OR or a union of permissions.
*   **`firstMatch`**: A priority-based mode. Strategies are evaluated in the order they are provided. The final decision (`allow` or `deny`) is determined by the first strategy that does not `abstain`. This is useful for creating fallback chains or override rules.

## Signature / Constructor

`CompositeStrategy` instances are typically created using one of its static factory methods rather than a direct constructor call. The class implements the `AuthorizationStrategy` interface [Source 1].

```typescript
// Implements AuthorizationStrategy
export class CompositeStrategy implements AuthorizationStrategy {
  /**
   * Creates a strategy where ALL sub-strategies must allow the action.
   */
  static allOf(strategies: AuthorizationStrategy[]): CompositeStrategy;

  /**
   * Creates a strategy where ANY sub-strategy allowing the action is sufficient.
   */
  static anyOf(strategies: AuthorizationStrategy[]): CompositeStrategy;

  /**
   * Creates a strategy where the first non-abstaining decision wins.
   */
  static firstMatch(strategies: AuthorizationStrategy[]): CompositeStrategy;
}
```

**Parameters:**

*   `strategies` (`AuthorizationStrategy[]`): An array of authorization strategy instances to be composed. For `firstMatch`, the order of this array is significant.

## Examples

The following examples demonstrate the three composition modes for combining an attribute-based ([abac](./abac.md)) policy and a role-based ([rbac](./rbac.md)) policy [Source 1].

### `firstMatch` for Overrides

This configuration uses an ABAC policy for specific overrides, with a general RBAC policy as a fallback. If the ABAC strategy abstains, the decision is passed to the RBAC policy.

```typescript
// ABAC overrides, RBAC fallback
const abacRules = new AttributeStrategy({ /* ... */ });
const rbacPolicy = new RoleStrategy({ /* ... */ });

const auth = CompositeStrategy.firstMatch([abacRules, rbacPolicy]);
```

### `allOf` for Strict Enforcement

This configuration requires that both the RBAC and ABAC policies must grant permission for an action to be allowed.

```typescript
// Both must agree
const rbac = new RoleStrategy({ /* ... */ });
const abac = new AttributeStrategy({ /* ... */ });

const strict = CompositeStrategy.allOf([rbac, abac]);
```

### `anyOf` for Lenient Enforcement

This configuration allows an action if either the RBAC policy or the ABAC policy grants permission.

```typescript
// Either is enough
const rbac = new RoleStrategy({ /* ... */ });
const abac = new AttributeStrategy({ /* ... */ });

const lenient = CompositeStrategy.anyOf([rbac, abac]);
```

## See Also

*   `RoleStrategy`: A strategy for implementing Role-Based Access Control (RBAC).
*   `AttributeStrategy`: A strategy for implementing Attribute-Based Access Control (ABAC).
*   `rbac()`: A convenience factory for creating a `RoleStrategy`.
*   `abac()`: A convenience factory for creating an `AttributeStrategy`.

## Sources

[Source 1]: src/iam/authorization.ts