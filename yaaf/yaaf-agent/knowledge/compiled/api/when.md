---
title: when
entity_type: api
summary: A fluent builder for creating ABAC rules with conditions and actions.
export_name: when
source_file: src/iam/authorization.ts
category: function
stub: false
compiled_at: 2026-04-16T14:19:09.065Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/authorization.ts
confidence: 1
---

## Overview
The `when` function is a fluent API builder used to define Attribute-Based Access Control (ABAC) rules. It allows developers to specify a predicate condition based on the user context and tool arguments, and then chain an action—either `allow` or `deny`—to be taken when that condition is met.

This function is typically used in conjunction with the `abac()` factory or when configuring an `AttributeStrategy` to create readable, declarative security policies.

## Signature / Constructor

```typescript
function when(
  condition: (user: UserContext, args: Record<string, unknown>) => boolean | Promise<boolean>
): {
  allow: (...tools: string[]) => AttributeRule;
  deny: (tools: string | string[], reason?: string) => AttributeRule;
}
```

### Parameters
- **condition**: A predicate function that receives the current `UserContext` and the arguments being passed to the tool (`Record<string, unknown>`). It returns a boolean or a Promise resolving to a boolean. If it returns `true`, the rule is considered a match.

## Methods & Properties

The `when` function returns a builder object with the following methods:

### allow()
Defines an "allow" action for the rule.
- **Signature**: `allow(...tools: string[]): AttributeRule`
- **Parameters**: 
  - `...tools`: One or more tool name patterns (supporting globs like `search_*`) that this rule applies to.
- **Returns**: A complete `AttributeRule` object.

### deny()
Defines a "deny" action for the rule.
- **Signature**: `deny(tools: string | string[], reason?: string): AttributeRule`
- **Parameters**:
  - `tools`: A tool name pattern or an array of patterns that this rule applies to.
  - `reason`: (Optional) A human-readable string explaining why access was denied, useful for audit logs and error messages.
- **Returns**: A complete `AttributeRule` object.

## Examples

### Basic Attribute Check
Creating a rule that denies delete operations for users marked as contractors.
```typescript
when((user) => user.attributes?.isContractor === true)
  .deny('delete_*', 'Contractors cannot delete')
```

### Argument-Aware Authorization
Creating a rule that prevents users from writing to resources outside of their assigned region by inspecting tool arguments.
```typescript
when((user, args) => (args.region as string) !== user.attributes?.region)
  .deny('write_*', 'Cannot write to resources outside your region')
```

### Conditional Access
Granting access to specific classified tools based on a user's clearance level.
```typescript
when((user) => user.attributes?.clearanceLevel === 'top-secret')
  .allow('query_classified_*')
```

### Usage within ABAC Factory
Combining multiple rules into an authorization strategy.
```typescript
const auth = abac([
  when((user) => user.attributes?.department === 'hr')
    .allow('query_employees', 'update_employee'),
  when((user) => user.attributes?.isContractor)
    .deny('delete_*', 'Contractors cannot delete'),
])
```

## See Also
- `AttributeStrategy`
- `abac`
- `rbac`