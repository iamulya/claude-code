---
title: CompositeStrategy
entity_type: api
summary: Composes multiple authorization strategies using allOf, anyOf, or firstMatch semantics.
export_name: CompositeStrategy
source_file: src/iam/authorization.ts
category: class
stub: false
compiled_at: 2026-04-16T14:18:58.707Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/authorization.ts
confidence: 1
---

## Overview
`CompositeStrategy` is a class used to combine multiple authorization strategies into a single logical unit. It allows developers to mix different access control models—such as Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC)—to create complex, multi-layered security policies for tool execution.

This class is typically used when an agent requires more nuanced permission logic than a single strategy can provide, such as requiring both a specific role and a specific attribute condition to be met.

## Signature / Constructor
`CompositeStrategy` implements the `AuthorizationStrategy` interface. While it can be instantiated directly, it is primarily used through its static factory methods which define the composition logic.

```typescript
export class CompositeStrategy implements AuthorizationStrategy {
  // Implementation details are internal to the framework
}
```

## Methods & Properties

### Static Methods
The following static methods are used to create a `CompositeStrategy` with specific evaluation semantics:

| Method | Description |
| :--- | :--- |
| `allOf(strategies: AuthorizationStrategy[])` | **Intersection (Most Restrictive)**: Every provided strategy must return an "allow" decision for the tool to be authorized. |
| `anyOf(strategies: AuthorizationStrategy[])` | **Union (Most Permissive)**: If any single strategy returns an "allow" decision, the tool is authorized. |
| `firstMatch(strategies: AuthorizationStrategy[])` | **Ordered Priority**: Evaluates strategies in the order they are provided. The first strategy that does not "abstain" (i.e., returns either "allow" or "deny") determines the final outcome. |

## Examples

### ABAC Overrides with RBAC Fallback
In this pattern, specific attribute rules are checked first. If no attribute rules apply, the system falls back to standard role-based permissions.

```typescript
// ABAC overrides, RBAC fallback
const auth = CompositeStrategy.firstMatch([
  abacRules, 
  rbacPolicy
]);
```

### Strict Multi-Layer Authorization
This pattern requires a user to satisfy both their role requirements and specific attribute conditions (e.g., being in the correct department and having the correct role).

```typescript
// Both must agree
const strict = CompositeStrategy.allOf([
  rbac, 
  abac
]);
```

### Lenient Authorization
This pattern allows access if the user satisfies either the role-based policy or a specific attribute-based exception.

```typescript
// Either is enough
const lenient = CompositeStrategy.anyOf([
  rbac, 
  abac
]);
```

## See Also
- `RoleStrategy`
- `AttributeStrategy`
- `rbac()`
- `abac()`