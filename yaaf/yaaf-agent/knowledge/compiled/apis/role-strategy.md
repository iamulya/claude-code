---
summary: Implements Role-based Access Control (RBAC) by mapping user roles to allowed or denied tool patterns.
export_name: RoleStrategy
source_file: src/iam/authorization.ts
category: class
title: RoleStrategy
entity_type: api
search_terms:
 - RBAC
 - role-based access control
 - user permissions
 - tool authorization
 - allow and deny lists
 - glob patterns for tools
 - secure tool access
 - user roles
 - how to restrict tools by role
 - authorization strategy
 - conflict resolution for roles
 - most-restrictive permissions
 - most-permissive permissions
stub: false
compiled_at: 2026-04-24T17:33:28.019Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/authorization.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `RoleStrategy` class implements a classic Role-based Access Control ([rbac](./rbac.md)) [Authorization](../concepts/authorization.md) mechanism [Source 1]. It is used to determine whether a user has permission to execute a specific tool based on the roles assigned to them.

This strategy works by mapping role names to lists of allowed and, optionally, denied tool patterns. It supports glob-style patterns (e.g., `search_*`, `admin_?_panel`) for flexible tool matching. This class is a core component of the YAAF authorization subsystem and is ideal for scenarios where permissions are primarily defined by user roles within an organization [Source 1].

## Signature / Constructor

The `RoleStrategy` class is instantiated with a configuration object that defines the roles and their associated permissions, along with rules for handling conflicts and defaults [Source 1].

```typescript
import type { RoleStrategyConfig } from 'yaaf';

export class RoleStrategy implements AuthorizationStrategy {
  constructor(config: RoleStrategyConfig);
}
```

### `RoleStrategyConfig`

The configuration object has the following structure:

```typescript
export type RoleStrategyConfig = {
  /**
   * A mapping of role names to their permission sets.
   */
  roles: Record<
    string,
    {
      allow?: string[];
      deny?: string[];
    }
  >;

  /**
   * Determines how to resolve conflicts when a user has multiple roles
   * with contradictory permissions for the same tool.
   * - 'most-restrictive': A 'deny' rule will always override an 'allow' rule. This is the default and most secure option.
   * - 'most-permissive': An 'allow' rule will override a 'deny' rule.
   */
  conflictResolution?: "most-restrictive" | "most-permissive";

  /**
   * The default action to take if a tool call does not match any
   * pattern for the user's roles.
   * - 'deny': The tool call is denied. This is the default, fail-closed behavior.
   * - 'abstain': The strategy makes no decision, deferring to the next
   *   strategy in a CompositeStrategy.
   */
  defaultAction?: "deny" | "abstain";
};
```

## Examples

The following example demonstrates how to create a `RoleStrategy` instance with three roles: `viewer`, `editor`, and `admin`.

```typescript
import { RoleStrategy } from 'yaaf';

const rbacPolicy = new RoleStrategy({
  roles: {
    viewer: {
      allow: ['search_*', 'read_*'],
    },
    editor: {
      allow: ['search_*', 'read_*', 'write_*'],
      deny: ['delete_*'],
    },
    admin: {
      allow: ['*'], // Admins can do anything
    },
  },
  // If a user is both an editor and has another role that allows 'delete_*',
  // the 'deny' rule will win.
  conflictResolution: 'most-restrictive',

  // If a tool doesn't match any pattern for a user's roles, deny access.
  defaultAction: 'deny',
});
```

## See Also

- `AttributeStrategy`: For implementing Attribute-based Access Control ([abac](./abac.md)).
- `CompositeStrategy`: For combining multiple authorization strategies.
- `rbac()`: A convenience factory function for creating a `RoleStrategy`.

## Sources

[Source 1] src/iam/authorization.ts