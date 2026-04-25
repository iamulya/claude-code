---
summary: Implements Attribute-based Access Control (ABAC) using a set of rules that evaluate user attributes and tool arguments.
export_name: AttributeStrategy
source_file: src/iam/authorization.ts
category: class
title: AttributeStrategy
entity_type: api
search_terms:
 - ABAC implementation
 - attribute-based access control
 - user attribute rules
 - tool argument validation
 - dynamic authorization policies
 - content-aware access control
 - how to restrict tools based on user data
 - conditional tool access
 - authorization predicate
 - fine-grained permissions
 - context-aware security
 - abac() factory function
 - when() rule builder
stub: false
compiled_at: 2026-04-24T16:50:54.441Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/authorization.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `AttributeStrategy` class implements an Attribute-Based Access Control ([abac](./abac.md)) [Authorization](../concepts/authorization.md) mechanism [Source 1]. It evaluates a list of rules, which are predicates based on user attributes and the arguments passed to a tool. This allows for highly flexible and fine-grained authorization decisions that go beyond simple role-based checks [Source 1].

This strategy is ideal for scenarios requiring dynamic, context-aware, or content-aware authorization. For example, rules can be defined based on a user's department, security clearance, the time of day, or even the specific values of arguments being passed to a tool [Source 1].

`AttributeStrategy` is one of the core authorization strategies provided by YAAF, alongside `RoleStrategy` for [rbac](./rbac.md). These strategies can be combined using `CompositeStrategy` to build sophisticated, layered authorization policies [Source 1].

## Signature / Constructor

The `AttributeStrategy` is instantiated with a configuration object that defines the rules and the default behavior [when](./when.md) no rules match.

```typescript
import type { AttributeStrategyConfig } from 'yaaf';

// Constructor signature (conceptual)
new AttributeStrategy(config: AttributeStrategyConfig);
```

### `AttributeStrategyConfig`

The configuration object has the following structure:

```typescript
export type AttributeStrategyConfig = {
  /**
   * An array of rules to evaluate.
   */
  rules: AttributeRule[];

  /**
   * Action to take when no rule matches the request.
   * - 'abstain': Defer to the next strategy in a composite (default).
   * - 'deny': Fail-closed.
   * - 'allow': Fail-open (use with caution).
   */
  defaultAction?: "abstain" | "deny" | "allow";
};
```

### `AttributeRule`

Each rule within the `rules` array is an object that defines a condition and a resulting action.

```typescript
export type AttributeRule = {
  /**
   * A human-readable name for the rule, used in audit logs.
   */
  name: string;

  /**
   * An array of tool name patterns this rule applies to.
   * Supports glob patterns. If omitted or `['*']`, it applies to all tools.
   */
  tools?: string[];

  /**
   * A predicate function that receives the user context and tool arguments.
   * It returns `true` if the rule's action should be applied.
   */
  condition: (user: UserContext, args: Record<string, unknown>) => boolean | Promise<boolean>;

  /**
   * The action to take if the condition returns `true`.
   */
  action: "allow" | "deny";

  /**
   * An optional reason for denial, used when the action is 'deny'.
   */
  reason?: string;

  /**
   * The priority for rule evaluation. Higher numbers are evaluated first.
   * Defaults to 0. Rules with the same priority are evaluated in their
   * order in the `rules` array.
   */
  priority?: number;
};
```

## Examples

The following example demonstrates how to create an `AttributeStrategy` with several rules for different use cases: restricting contractors, granting access based on department, and limiting actions to business hours [Source 1].

```typescript
import { AttributeStrategy } from 'yaaf';

const auth = new AttributeStrategy({
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
  // If no rule matches, defer to another strategy (e.g., in a CompositeStrategy)
  defaultAction: 'abstain',
});
```

## See Also

*   `RoleStrategy`: For implementing Role-Based Access Control (RBAC).
*   `CompositeStrategy`: For combining multiple authorization strategies.
*   `abac()`: A convenience factory function for creating an `AttributeStrategy`.
*   `when()`: A fluent builder for creating `AttributeRule` objects.

## Sources

[Source 1]: src/iam/authorization.ts