---
summary: An authorization model where access is granted or denied based on attributes of the user, resource, environment, and action.
title: Attribute-Based Access Control (ABAC)
entity_type: concept
related_subsystems:
 - iam
search_terms:
 - ABAC in YAAF
 - attribute-based authorization
 - how to use ABAC
 - dynamic access control
 - policy as code
 - user attributes for permissions
 - content-aware authorization
 - inspect tool arguments for auth
 - AttributeStrategy
 - when() rule builder
 - environment-based access
 - time-of-day access control
 - predicate-based authorization
stub: false
compiled_at: 2026-04-24T17:52:28.807Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/authorization.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/types.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

Attribute-Based Access Control ([abac](../apis/abac.md)) is an [Authorization](./authorization.md) model that grants or denies access to operations based on a set of rules or policies that evaluate attributes [Source 1]. Unlike Role-Based Access Control ([rbac](../apis/rbac.md)), which assigns permissions to static roles, ABAC provides a more dynamic and fine-grained approach. Policies can consider any attribute associated with the user, the environment, or even the data being acted upon [Source 1].

In YAAF, ABAC is used for tool-level authorization, allowing developers to create sophisticated access policies. For example, a policy could deny access based on a user's employment status (e.g., contractor), allow access only during business hours (an environmental attribute), or prevent an action if a tool argument contains a value from a restricted region (a resource attribute) [Source 1]. This model is implemented through the `AttributeStrategy` [Source 1, Source 2].

The user's identity and attributes are encapsulated in the `UserContext` object, which can hold arbitrary key-value pairs like `department`, `clearanceLevel`, or `isContractor` [Source 2].

## How It Works in YAAF

The core of ABAC in YAAF is the `AttributeStrategy` class, which evaluates a list of `AttributeRule` objects to make an authorization decision [Source 1].

An `AttributeRule` is an object that defines a specific access control condition. It consists of the following key fields [Source 1]:
*   **`name`**: A human-readable name for the rule, used in audit logs.
*   **`[[[[[[[[Tools]]]]]]]]`**: An optional array of tool name patterns (e.g., `['write_*']`) that the rule applies to. If omitted, it applies to all Tools.
*   **`condition`**: A predicate function that receives the `user: UserContext` and the tool `args: Record<string, unknown>`. It returns `true` or `false` (or a Promise of one) to indicate if the rule's condition is met. This allows for content-aware rules that inspect the arguments being passed to a tool.
*   **`action`**: The action to take if the condition is `true`, either `'allow'` or `'deny'`.
*   **`reason`**: An optional string explaining the reason for a denial.
*   **`priority`**: An optional number to control the evaluation order. Rules with higher priority are evaluated first.

[when](../apis/when.md) a tool is invoked, the `AttributeStrategy` iterates through its rules. The first rule whose `condition` returns `true` and whose `tools` pattern matches the invoked tool will have its `action` applied. If no rule matches, the strategy's `defaultAction` is taken. The default is `'abstain'`, which defers the decision to the next strategy in a composite chain. Other options are `'deny'` (fail-closed) and `'allow'` (fail-open) [Source 1].

YAAF also provides convenience functions for setting up ABAC policies:
*   **`abac(rules)`**: A factory function to quickly create an `AttributeStrategy` instance from an array of rules [Source 1].
*   **`when(condition)`**: A fluent rule builder that starts with a condition and allows chaining `.allow()` or `.deny()` methods to construct an `AttributeRule` [Source 1].

## Configuration

ABAC is configured within the agent's `AccessPolicy`. A developer can create an instance of `AttributeStrategy` and assign it to the `authorization` property of the policy [Source 2].

### Example: Using `AttributeStrategy` Class

This example shows how to configure an `AttributeStrategy` with several rules, including checks on user attributes and environmental factors like time of day [Source 1].

```typescript
import { AttributeStrategy } from 'yaaf';

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
    {
      name: 'business-hours-deploys',
      tools: ['deploy_*'],
      condition: () => {
        const hour = new Date().getHours();
        return hour >= 9 && hour <= 17;
      },
      action: 'allow',
    },
  ],
  defaultAction: 'deny', // Fail-closed if no rule matches
});

const agent = new Agent({
  tools: [...],
  accessPolicy: {
    authorization: abacStrategy,
  },
});
```

### Example: Using `abac` and `when` Helpers

This example demonstrates the more concise syntax using the `abac` and `when` helper functions [Source 1].

```typescript
import { abac, when, Agent } from 'yaaf';

const abacStrategy = abac([
  when((user) => user.attributes?.isContractor)
    .deny('delete_*', 'Contractors cannot delete'),

  when((user, args) => (args.region as string) !== user.attributes?.region)
    .deny('write_*', 'Cannot write to resources outside your region'),

  when((user) => user.attributes?.department === 'hr')
    .allow('query_employees', 'update_employee'),
]);

const agent = new Agent({
  tools: [...],
  accessPolicy: {
    authorization: abacStrategy,
  },
});
```

## See Also

*   **Role-Based Access Control (RBAC)**: An alternative authorization model based on static user roles, implemented in YAAF via `RoleStrategy`.
*   **Composite Strategies**: YAAF allows combining multiple authorization strategies, such as ABAC and RBAC, using a `CompositeStrategy`. This enables patterns like using ABAC for specific overrides with an RBAC policy as a fallback.

## Sources

*   [Source 1]: `src/iam/authorization.ts`
*   [Source 2]: `src/iam/types.ts`