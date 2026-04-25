---
summary: Defines a single rule for Attribute-Based Access Control (ABAC), including a condition, action, and tool patterns.
export_name: AttributeRule
source_file: src/iam/authorization.ts
category: type
title: AttributeRule
entity_type: api
search_terms:
 - ABAC rule definition
 - attribute-based access control rule
 - how to define an authorization rule
 - conditional tool access
 - user attribute condition
 - tool argument condition
 - allow or deny based on attributes
 - authorization predicate
 - IAM policy rule
 - AttributeStrategy rule
 - dynamic permissions
 - fine-grained access control
 - policy condition
stub: false
compiled_at: 2026-04-24T16:50:45.476Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/authorization.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `AttributeRule` type defines the structure for a single rule within an Attribute-Based Access Control ([abac](./abac.md)) policy. It is the fundamental building block for the `AttributeStrategy` [Authorization](../concepts/authorization.md) system [Source 1].

Each rule consists of a `condition` (a predicate function), an `action` to take if the condition is met (`allow` or `deny`), and a list of tool patterns it applies to. This allows for creating highly dynamic and fine-grained authorization policies that can inspect user attributes (e.g., department, clearance level) and the arguments being passed to a tool at runtime [Source 1].

`AttributeRule` objects are typically provided in an array to the `AttributeStrategy` constructor or the `abac` factory function [Source 1].

## Signature

`AttributeRule` is a TypeScript type alias for an object with the following properties [Source 1]:

```typescript
export type AttributeRule = {
  /** Human-readable rule name (for audit logs) */
  name: string;

  /**
   * Tool patterns this rule applies to.
   * Omit or use `['*']` to apply to all Tools.
   */
  Tools?: string[];

  /**
   * Condition — predicate over user context and optionally tool arguments.
   * Return `true` if this rule should apply.
   */
  condition: (user: UserContext, args: Record<string, unknown>) => boolean | Promise<boolean>;

  /** Action to take [[[[[[[[when]]]]]]]] condition matches */
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

### Properties

- **`name`**: `string`
  A human-readable name for the rule, primarily used for audit logging and debugging [Source 1].

- **`[[Tools]]`**: `string[]` (optional)
  An array of tool name patterns to which this rule applies. It supports glob-style patterns. If this property is omitted or set to `['*']`, the rule applies to all [Tools](../subsystems/tools.md) [Source 1].

- **`condition`**: `(user: UserContext, args: Record<string, unknown>) => boolean | Promise<boolean>`
  A function that acts as the predicate for the rule. It receives the `user` context and the `args` for the tool call. It must return `true` or a Promise resolving to `true` for the rule's `action` to be triggered [Source 1].

- **`action`**: `"allow" | "deny"`
  The authorization decision to make if the `condition` evaluates to `true` [Source 1].

- **`reason`**: `string` (optional)
  An optional message explaining the reason for a denial. This is typically used when the `action` is `'deny'` [Source 1].

- **`priority`**: `number` (optional)
  A number that determines the evaluation order of rules. Rules with a higher priority number are evaluated first. The default priority is `0`. Rules with the same priority are evaluated in the order they appear in the `rules` array [Source 1].

## Examples

The following examples demonstrate how to define `AttributeRule` objects for different authorization scenarios. These would typically be passed in an array to an `AttributeStrategy` [Source 1].

### Deny Based on User Attribute

This rule denies any user with the `isContractor` attribute from using tools that match `write_*` or `delete_*`.

```typescript
const contractorDenyRule: AttributeRule = {
  name: 'contractors-no-writes',
  tools: ['write_*', 'delete_*'],
  condition: (user) => user.attributes?.isContractor === true,
  action: 'deny',
  reason: 'Contractors cannot perform write operations',
};
```

### Allow Based on User Attribute

This rule allows users in the 'finance' department to access billing-related tools.

```typescript
const financeAllowRule: AttributeRule = {
  name: 'finance-billing-access',
  tools: ['query_invoices', 'create_invoice'],
  condition: (user) => user.attributes?.department === 'finance',
  action: 'allow',
};
```

### Condition Based on External State

This rule's condition does not depend on the user or tool arguments, but on the current time of day. It allows deploys only during standard business hours.

```typescript
const businessHoursRule: AttributeRule = {
  name: 'business-hours-deploys',
  tools: ['deploy_*'],
  condition: () => {
    const hour = new Date().getHours();
    // Allow between 9 AM and 5 PM (17:00)
    return hour >= 9 && hour <= 17;
  },
  action: 'allow',
};
```

## See Also

- `AttributeStrategy`: The authorization strategy class that consumes an array of `AttributeRule` objects.
- `abac`: A factory function for quickly creating an `AttributeStrategy`.
- `when`: A fluent rule builder that simplifies the creation of `AttributeRule` objects.

## Sources

[Source 1]: src/iam/authorization.ts