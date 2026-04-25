---
summary: Defines the configuration options for the `AttributeStrategy` class.
export_name: AttributeStrategyConfig
source_file: src/iam/authorization.ts
category: type
title: AttributeStrategyConfig
entity_type: api
search_terms:
 - ABAC configuration
 - attribute-based access control setup
 - defining authorization rules
 - user attribute predicates
 - tool argument conditions
 - security policy configuration
 - AttributeStrategy options
 - abac() helper config
 - authorization rule list
 - default action for ABAC
 - fail-closed vs fail-open
 - how to configure ABAC
 - IAM policy rules
stub: false
compiled_at: 2026-04-24T16:51:01.316Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/authorization.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `AttributeStrategyConfig` type defines the configuration for an `AttributeStrategy`, which implements Attribute-Based Access Control ([abac](./abac.md)) in YAAF [Source 1]. This configuration consists of a list of [Authorization](../concepts/authorization.md) rules and a default action to take [when](./when.md) no rule matches a given tool call [Source 1].

This configuration object is used to define fine-grained access policies based on user attributes (e.g., department, clearance level) and the arguments passed to a tool (e.g., resource ID, region) [Source 1]. It is passed to the constructor of the `AttributeStrategy` class or used with the `abac` factory function [Source 1].

## Signature

The `AttributeStrategyConfig` is a TypeScript type with the following structure [Source 1]:

```typescript
export type AttributeStrategyConfig = {
  rules: AttributeRule[];
  /**
   * Action when no rule matches.
   * - 'abstain' — defer to next strategy (default)
   * - 'deny' — fail-closed
   * - 'allow' — fail-open (use with caution)
   */
  defaultAction?: "abstain" | "deny" | "allow";
};
```

### Properties

- **`rules`**: `AttributeRule[]` (required)
  An array of `AttributeRule` objects that define the access control logic. The rules are evaluated to determine if a tool call should be allowed or denied [Source 1].

- **`defaultAction`**: `"abstain" | "deny" | "allow"` (optional)
  Specifies the action to take if no rule in the `rules` array matches the tool call.
  - `'abstain'`: (Default) Defers the decision, allowing another strategy in a `CompositeStrategy` to make the decision.
  - `'deny'`: Fails-closed. The tool call is denied if no rule explicitly allows it.
  - `'allow'`: Fails-open. The tool call is allowed if no rule explicitly denies it. This should be used with caution [Source 1].

### `AttributeRule` Type

The `rules` array is composed of `AttributeRule` objects, which have the following structure [Source 1]:

```typescript
export type AttributeRule = {
  /** Human-readable rule name (for audit logs) */
  name: string;

  /**
   * Tool patterns this rule applies to.
   * Omit or use `['*']` to apply to all tools.
   */
  tools?: string[];

  /**
   * Condition — predicate over user context and optionally tool arguments.
   * Return `true` if this rule should apply.
   */
  condition: (user: UserContext, args: Record<string, unknown>) => boolean | Promise<boolean>;

  /** Action to take when condition matches */
  action: "allow" | "deny";

  /** Reason for denial (used when action is 'deny') */
  reason?: string;

  /**
   * Priority for rule evaluation order.
   * Higher numbers are evaluated first.
   * When omitted, defaults to 0.
   * Rules with the same priority preserve their insertion order.
   */
  priority?: number;
};
```

## Examples

The following example demonstrates how to create an `AttributeStrategyConfig` object to define several access control rules. This configuration could be passed to the `AttributeStrategy` constructor [Source 1].

```typescript
import { AttributeStrategy, AttributeStrategyConfig } from 'yaaf';

const abacConfig: AttributeStrategyConfig = {
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
        // Allow deploys only between 9 AM and 5 PM (17:00)
        return hour >= 9 && hour <= 17;
      },
      action: 'allow',
    },
  ],
  // If no rule matches, defer to another authorization strategy
  defaultAction: 'abstain',
};

// This config would be used to instantiate the strategy
// const authStrategy = new AttributeStrategy(abacConfig);
```

## See Also

- `AttributeStrategy`: The class that consumes this configuration to perform ABAC.
- `abac`: A factory function for creating an `AttributeStrategy` instance.
- `when`: A builder function for creating `AttributeRule` objects fluently.

## Sources

[Source 1]: src/iam/authorization.ts