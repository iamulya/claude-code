---
title: rbac
entity_type: api
summary: A convenience factory for creating RoleStrategy instances from a role mapping.
export_name: rbac
source_file: src/iam/authorization.ts
category: function
stub: false
compiled_at: 2026-04-16T14:19:00.767Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/authorization.ts
confidence: 1
---

## Overview
The `rbac` function is a convenience factory used to quickly set up Role-Based Access Control (RBAC) for tool authorization. It simplifies the creation of a `RoleStrategy` by allowing developers to provide a direct mapping of role names to arrays of allowed tool patterns.

This function is particularly useful for standard authorization scenarios where roles only need to define allowed tools without complex denial logic or attribute-based conditions. It supports glob patterns for tool matching, such as `search_*` or `admin_?_panel`.

## Signature / Constructor

```typescript
export function rbac(
  roles: Record<string, string[]>,
  options?: {
    /**
     * When a user has multiple roles, how to resolve conflicts.
     * - 'most-restrictive' — deny wins over allow (default, secure)
     * - 'most-permissive' — allow wins over deny (convenient)
     */
    conflictResolution?: 'most-restrictive' | 'most-permissive'
    /**
     * Action when no role matches the tool.
     * - 'deny' — fail-closed (default)
     * - 'abstain' — defer to next strategy in a composite
     */
    defaultAction?: 'deny' | 'abstain'
  }
): RoleStrategy
```

### Parameters
- `roles`: A record where keys are role names and values are arrays of strings representing allowed tool patterns.
- `options`: Optional configuration for conflict resolution and default actions.

## Examples

### Basic Role Mapping
This example demonstrates defining three roles with varying levels of access to tool patterns.

```typescript
const auth = rbac({
  viewer: ['search_*', 'read_*'],
  editor: ['search_*', 'read_*', 'write_*'],
  admin: ['*'],
})
```

### RBAC with Custom Options
This example configures the strategy to abstain if no roles match, allowing other strategies in a composite chain to make the decision.

```typescript
const auth = rbac(
  {
    support: ['help_*', 'view_tickets'],
    manager: ['approve_*', 'view_reports'],
  },
  {
    defaultAction: 'abstain',
    conflictResolution: 'most-permissive'
  }
)
```

## See Also
- `RoleStrategy`
- `CompositeStrategy`
- `abac`