---
title: RoleStrategy
entity_type: api
summary: Implements Role-Based Access Control (RBAC) for tool execution by mapping roles to allowed/denied tool patterns.
export_name: RoleStrategy
source_file: src/iam/authorization.ts
category: class
stub: false
compiled_at: 2026-04-16T14:18:51.537Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/authorization.ts
confidence: 1
---

## Overview
`RoleStrategy` is a class that provides Role-Based Access Control (RBAC) for tool execution within the YAAF framework. It allows developers to define access policies by mapping user roles to specific tool patterns. 

The strategy supports glob-style pattern matching (e.g., `search_*` or `admin_?_panel`) to define permissions for groups of tools. It is designed to handle users with multiple roles through configurable conflict resolution logic and can either fail-closed or defer to other strategies when no role matches.

## Signature / Constructor

### RoleStrategyConfig
The configuration object used to initialize a `RoleStrategy`.

```typescript
export type RoleStrategyConfig = {
  roles: Record<string, {
    allow?: string[]
    deny?: string[]
  }>
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
```

### Constructor
```typescript
export class RoleStrategy implements AuthorizationStrategy {
  constructor(config: RoleStrategyConfig)
}
```

## Methods & Properties
*   **constructor(config: RoleStrategyConfig)**: Creates a new instance of the RBAC strategy with the specified role mappings and resolution behavior.

## Examples

### Basic RBAC Configuration
This example demonstrates defining roles for viewers, editors, and administrators with specific tool access patterns.

```typescript
import { RoleStrategy } from 'yaaf';

const auth = new RoleStrategy({
  roles: {
    viewer: { 
      allow: ['search_*', 'read_*'] 
    },
    editor: { 
      allow: ['search_*', 'read_*', 'write_*'], 
      deny: ['delete_*'] 
    },
    admin: { 
      allow: ['*'] 
    },
  },
  defaultAction: 'deny',
  conflictResolution: 'most-restrictive',
});
```

### Handling Multiple Roles
When a user context contains multiple roles, the `conflictResolution` property determines the outcome if one role allows a tool and another denies it.

```typescript
const auth = new RoleStrategy({
  roles: {
    contractor: { deny: ['internal_*'] },
    employee: { allow: ['internal_*'] }
  },
  // If a user is both a contractor and an employee, 
  // 'most-restrictive' ensures 'internal_*' tools are denied.
  conflictResolution: 'most-restrictive'
});
```