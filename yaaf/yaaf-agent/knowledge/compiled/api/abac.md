---
title: abac
entity_type: api
summary: A convenience factory for creating AttributeStrategy instances from an array of rules.
export_name: abac
source_file: src/iam/authorization.ts
category: function
stub: false
compiled_at: 2026-04-16T14:19:08.082Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/authorization.ts
confidence: 1
---

## Overview
The `abac` function is a convenience factory used to instantiate an `AttributeStrategy` for Attribute-Based Access Control. It simplifies the creation of complex authorization logic by allowing developers to pass an array of rules that evaluate user attributes and tool arguments.

This function is typically used in conjunction with the `when()` helper to create readable, declarative authorization policies.

## Signature / Constructor

```typescript
export function abac(
  rules: AttributeRule[],
  options?: {
    defaultAction?: 'abstain' | 'deny' | 'allow'
  }
): AttributeStrategy
```

### Parameters
- `rules`: An array of `AttributeRule` objects defining the predicates and actions for the strategy.
- `options`: Optional configuration object.
    - `defaultAction`: Determines the behavior when no rules match the current context. 
        - `'abstain'`: (Default) Defers the decision to the next strategy in a composite.
        - `'deny'`: Fails-closed.
        - `'allow'`: Fails-open (should be used with caution).

## Examples

### Basic Usage with Rule Helpers
The `abac` factory is often used with the `when` builder to define rules based on user attributes.

```typescript
const auth = abac([
  when((user) => user.attributes?.department === 'hr')
    .allow('query_employees', 'update_employee'),
    
  when((user) => user.attributes?.isContractor)
    .deny('delete_*', 'Contractors cannot delete'),
])
```

### Context-Aware Rules
Rules can also inspect the arguments being passed to a tool to make fine-grained decisions.

```typescript
const auth = abac([
  {
    name: 'regional-lock',
    tools: ['write_*'],
    condition: (user, args) => (args.region as string) === user.attributes?.region,
    action: 'allow'
  }
], { defaultAction: 'deny' })
```

## See Also
- AttributeStrategy
- AttributeRule
- when
- rbac