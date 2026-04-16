---
title: AttributeStrategy
entity_type: api
summary: Implements Attribute-Based Access Control (ABAC) using predicates over user attributes and tool arguments.
export_name: AttributeStrategy
source_file: src/iam/authorization.ts
category: class
stub: false
compiled_at: 2026-04-16T14:18:59.012Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/authorization.ts
confidence: 1
---

## Overview
`AttributeStrategy` is a class that implements Attribute-Based Access Control (ABAC) for tool execution. Unlike role-based systems, ABAC evaluates authorization decisions dynamically based on predicates (rules) that inspect user attributes, environmental context, and the specific arguments being passed to a tool.

This strategy is used when access control requires fine-grained logic, such as:
- Restricting tool usage to specific business hours.
- Ensuring a user only modifies resources within their assigned department or region.
- Preventing specific classes of users (e.g., contractors) from using destructive tools.

## Signature / Constructor

```typescript
export class AttributeStrategy implements AuthorizationStrategy {
  constructor(config: AttributeStrategyConfig)
}
```

### AttributeStrategyConfig
The configuration object defines the set of rules and the fallback behavior.

| Property | Type | Description |
| :--- | :--- | :--- |
| `rules` | `AttributeRule[]` | An array of rules to evaluate. |
| `defaultAction` | `'abstain' \| 'deny' \| 'allow'` | Action taken when no rules match. Defaults to `'abstain'`. |

### AttributeRule
Each rule defines a condition and the resulting action if that condition is met.

| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | Human-readable name for audit logging. |
| `tools` | `string[]` | Optional. Glob patterns of tools this rule applies to (e.g., `['write_*']`). |
| `condition` | `Function` | A predicate: `(user, args) => boolean \| Promise<boolean>`. |
| `action` | `'allow' \| 'deny'` | The outcome if the condition returns `true`. |
| `reason` | `string` | Optional. Explanation provided when access is denied. |

## Examples

### Basic ABAC Configuration
This example demonstrates rules based on user attributes, department membership, and time-of-day.

```typescript
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
        const hour = new Date().getHours()
        return hour >= 9 && hour <= 17
      },
      action: 'allow',
    },
  ],
  defaultAction: 'abstain',
})
```

### Content-Aware Authorization
Rules can also inspect the `args` passed to the tool to perform data-level filtering.

```typescript
const regionalAuth = new AttributeStrategy({
  rules: [
    {
      name: 'regional-lock',
      tools: ['*'],
      condition: (user, args) => {
        // Only allow if the tool's region argument matches the user's region attribute
        return args.region === user.attributes?.region
      },
      action: 'allow'
    }
  ],
  defaultAction: 'deny'
})
```

## See Also
- `RoleStrategy`
- `CompositeStrategy`
- `abac()`
- `when()`