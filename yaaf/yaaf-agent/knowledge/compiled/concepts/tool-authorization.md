---
title: Tool Authorization
entity_type: concept
summary: The mechanism for controlling which tools an agent can execute based on user context, roles, and attributes.
related_subsystems:
  - iam
stub: false
compiled_at: 2026-04-16T14:18:50.000Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/authorization.ts
confidence: 1
---

## What It Is
Tool Authorization is the security layer in YAAF that governs whether an agent is permitted to execute a specific tool on behalf of a user. It provides a structured way to enforce security boundaries, ensuring that LLM-powered agents do not perform actions that exceed the caller's privileges.

This mechanism solves the problem of "over-privileged agents" by decoupling tool definitions from access rights. By implementing authorization at the framework level, YAAF allows developers to define fine-grained policies based on user roles, session attributes, or the specific arguments being passed to a tool.

## How It Works in YAAF
YAAF implements tool authorization through a set of composable strategies defined in the `iam/authorization` module. These strategies evaluate a request based on the `UserContext` and the tool's arguments to return an allow, deny, or abstain decision.

### Authorization Strategies
The framework provides three primary implementation classes:

1.  **RoleStrategy (RBAC):** Implements Role-Based Access Control. It maps user roles to lists of allowed or denied tool patterns. It supports glob patterns (e.g., `search_*`) for broad tool matching. When a user possesses multiple roles, the strategy resolves conflicts using either `most-restrictive` (deny wins) or `most-permissive` (allow wins) logic.
2.  **AttributeStrategy (ABAC):** Implements Attribute-Based Access Control. It uses predicates called `AttributeRule` objects to evaluate the `UserContext` and tool arguments. This allows for content-aware security, such as restricting a `delete_record` tool based on whether the user owns the specific record ID passed in the arguments.
3.  **CompositeStrategy:** Allows developers to combine multiple strategies. It supports three composition modes:
    *   `allOf`: All strategies must return an "allow" decision.
    *   `anyOf`: Any single strategy returning "allow" is sufficient.
    *   `firstMatch`: The first strategy to return a non-abstaining decision (allow or deny) determines the outcome.

### Convenience Factories
YAAF provides functional wrappers to simplify policy definition:
*   `rbac()`: A shorthand for creating a `RoleStrategy`.
*   `abac()`: A shorthand for creating an `AttributeStrategy`.
*   `when()`: A fluent builder for creating individual `AttributeRule` predicates.

## Configuration
Developers configure authorization by instantiating strategies and passing them to the agent or framework configuration.

### RBAC Configuration
The `RoleStrategy` requires a mapping of roles and a default action for when no roles match.

```ts
const auth = new RoleStrategy({
  roles: {
    viewer: { allow: ['search_*', 'read_*'] },
    editor: { allow: ['search_*', 'read_*', 'write_*'], deny: ['delete_*'] },
    admin: { allow: ['*'] },
  },
  defaultAction: 'deny',
  conflictResolution: 'most-restrictive',
})
```

### ABAC Configuration
The `AttributeStrategy` uses rules that can inspect both the user context and the tool arguments.

```ts
const auth = new AttributeStrategy({
  rules: [
    {
      name: 'finance-billing-access',
      tools: ['query_invoices', 'create_invoice'],
      condition: (user) => user.attributes?.department === 'finance',
      action: 'allow',
    },
    {
      name: 'content-aware-check',
      tools: ['update_record'],
      condition: (user, args) => args.ownerId === user.id,
      action: 'allow',
    }
  ],
  defaultAction: 'deny',
})
```

### Composite Configuration
Strategies can be layered to provide fallback logic or multi-factor authorization.

```ts
// Use ABAC for specific overrides, falling back to RBAC for general permissions
const auth = CompositeStrategy.firstMatch([
  attributeBasedOverrides,
  standardRolePolicy
])
```

## See Also
* [[iam/authorization]] (API)