---
summary: Provides composable strategies for tool-level authorization, including Role-Based Access Control (RBAC), Attribute-Based Access Control (ABAC), and composite strategies.
primary_files:
 - src/iam/authorization.ts
title: Authorization System
entity_type: subsystem
exports:
 - RoleStrategy
 - AttributeStrategy
 - CompositeStrategy
 - rbac
 - abac
 - when
search_terms:
 - RBAC in YAAF
 - ABAC in YAAF
 - tool permissions
 - how to restrict tool access
 - user roles and permissions
 - attribute based access control
 - role based access control
 - composite authorization
 - allow deny rules
 - secure agent tools
 - user context authorization
 - glob patterns for tools
 - conditional access for tools
stub: false
compiled_at: 2026-04-24T18:10:21.516Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/authorization.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The [Authorization](../concepts/authorization.md) System provides a flexible and composable framework for controlling access to an agent's [Tools](./tools.md) [Source 1]. It addresses the need for fine-grained [Permission Management](./permission-management.md), allowing developers to define who can execute which tools and under what conditions. The system is designed to support common enterprise security models like Role-Based Access Control ([rbac](../apis/rbac.md)) and Attribute-Based Access Control ([abac](../apis/abac.md)), as well as combinations of different authorization models [Source 1].

## Architecture

The system is built around the `AuthorizationStrategy` interface, with three primary implementations that can be used individually or composed together [Source 1].

*   **`RoleStrategy`**: Implements classic RBAC. This strategy maps user roles to lists of allowed or denied tool names. It supports glob patterns for matching multiple tools at once [Source 1].
*   **`AttributeStrategy`**: Implements ABAC. This strategy evaluates a set of rules, where each rule is a predicate based on attributes of the user (e.g., department, clearance level) and/or the arguments being passed to the tool. This allows for context-aware and content-aware authorization decisions [Source 1].
*   **`[[[[[[[[CompositeStrategy]]]]]]]]`**: A meta-strategy that combines multiple other strategies. It allows developers to define how the results of different strategies should be aggregated, such as requiring all to pass, any to pass, or respecting a specific order of precedence [Source 1].

The system also includes convenience factories and builders (`rbac`, `abac`, `[[[[[[[[when]]]]]]]]`) to simplify the configuration of these strategies [Source 1].

## Key APIs

The primary public interface of the Authorization System consists of the strategy classes and their associated configuration types and factory functions [Source 1].

### RoleStrategy

The `RoleStrategy` class provides RBAC capabilities. It is configured via a `RoleStrategyConfig` object [Source 1].

*   `roles`: A record mapping role names to objects containing `allow` and/or `deny` arrays of tool name patterns. Glob patterns like `'search_*'` are supported [Source 1].
*   `conflictResolution`: Determines how to handle cases where a user has multiple roles with conflicting permissions. It can be `'most-restrictive'` (deny wins, the default) or `'most-permissive'` (allow wins) [Source 1].
*   `defaultAction`: The action to take if a tool does not match any rule for the user's roles. It can be `'deny'` (default) or `'abstain'` (to defer the decision to another strategy in a composite) [Source 1].

```typescript
// Example: RoleStrategy configuration
const rbacStrategy = new RoleStrategy({
  roles: {
    viewer: { allow: ['search_*', 'read_*'] },
    editor: { allow: ['search_*', 'read_*', 'write_*'], deny: ['delete_*'] },
    admin: { allow: ['*'] },
  },
  defaultAction: 'deny',
  conflictResolution: 'most-restrictive',
});
```

### AttributeStrategy

The `AttributeStrategy` class provides ABAC capabilities by evaluating a list of `AttributeRule` objects [Source 1].

An `AttributeRule` has the following properties:
*   `name`: A human-readable name for logging and auditing [Source 1].
*   `tools`: An optional array of tool patterns this rule applies to [Source 1].
*   `condition`: A function that receives the `UserContext` and tool `args` and returns a boolean. This is the core logic of the rule [Source 1].
*   `action`: The action to take if the condition is met, either `'allow'` or `'deny'` [Source 1].
*   `reason`: An optional string explaining a denial [Source 1].
*   `priority`: An optional number to control evaluation order (higher numbers are evaluated first) [Source 1].

The strategy itself is configured with a list of these rules and a `defaultAction` (`'abstain'`, `'deny'`, or `'allow'`) for when no rules match [Source 1].

```typescript
// Example: AttributeStrategy configuration
const abacStrategy = new AttributeStrategy({
  rules: [
    {
      name: 'contractors-no-writes',
      tools: ['write_*', 'delete_*'],
      condition: (user) => user.attributes?.isContractor === true,
      action: 'deny',
      reason: 'Contractors cannot perform write operations',
    },
    {
      name: 'finance-billing-access',
      tools: ['query_invoices', 'create_invoice'],
      condition: (user) => user.attributes?.department === 'finance',
      action: 'allow',
    },
  ],
  defaultAction: 'abstain',
});
```

### CompositeStrategy

The `CompositeStrategy` class combines multiple strategies. It does not have a public constructor; instead, it is created using one of three static factory methods [Source 1]:

*   `CompositeStrategy.allOf([...strategies])`: All strategies must return 'allow' for the final result to be 'allow'. This is the most restrictive composition [Source 1].
*   `CompositeStrategy.anyOf([...strategies])`: Any strategy returning 'allow' is sufficient for the final result to be 'allow'. This is the most permissive composition [Source 1].
*   `CompositeStrategy.firstMatch([...strategies])`: The strategies are evaluated in order, and the first one that returns a definitive 'allow' or 'deny' (not 'abstain') determines the outcome [Source 1].

```typescript
// Example: CompositeStrategy usage
// ABAC rules are checked first; if they abstain, the RBAC policy is used as a fallback.
const auth = CompositeStrategy.firstMatch([abacStrategy, rbacStrategy]);
```

### Factory and Builder Functions

To simplify configuration, the system provides several helper functions:

*   `rbac(roles)`: A shorthand for creating a `RoleStrategy` instance [Source 1].
*   `abac(rules)`: A shorthand for creating an `AttributeStrategy` instance [Source 1].
*   `when(condition)`: A fluent builder for creating an `AttributeRule`. It allows chaining `.allow(tools)` or `.deny(tools, reason)` calls after defining the condition [Source 1].

```typescript
// Example: Using the 'when' builder
import { abac, when } from 'yaaf/iam';

const auth = abac([
  when((user) => user.attributes?.isContractor)
    .deny('delete_*', 'Contractors cannot delete'),
  when((user, args) => (args.region as string) !== user.attributes?.region)
    .deny('write_*', 'Cannot write to resources outside your region'),
]);
```

## Sources

[Source 1]: src/iam/authorization.ts