---
summary: Defines the configuration options for the `RoleStrategy` class.
export_name: RoleStrategyConfig
source_file: src/iam/authorization.ts
category: type
title: RoleStrategyConfig
entity_type: api
search_terms:
 - RBAC configuration
 - role based access control settings
 - define user roles
 - tool permissions by role
 - allow and deny lists
 - glob patterns for tools
 - conflict resolution for roles
 - default authorization action
 - RoleStrategy constructor options
 - how to set up roles
 - user permission mapping
 - secure by default authorization
stub: false
compiled_at: 2026-04-24T17:33:44.503Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/authorization.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`RoleStrategyConfig` is a TypeScript type that defines the configuration object for the `RoleStrategy` class, which implements Role-Based Access Control ([rbac](./rbac.md)) [Source 1]. This configuration allows developers to map role names to specific lists of allowed and denied [Tools](../subsystems/tools.md). It supports glob patterns (e.g., `search_*`, `admin_?_panel`) for flexible tool matching [Source 1].

This configuration type is used to define the entire behavior of a role-based [Authorization](../concepts/authorization.md) policy, including how to handle permission conflicts [when](./when.md) a user has multiple roles and what action to take when a tool does not match any defined role permission [Source 1].

## Signature

The `RoleStrategyConfig` type is defined as follows [Source 1]:

```typescript
export type RoleStrategyConfig = {
  /**
   * A record where keys are role names and values define the permissions
   * for that role.
   */
  roles: Record<
    string,
    {
      allow?: string[];
      deny?: string[];
    }
  >;

  /**
   * When a user has multiple roles, how to resolve conflicts.
   * - 'most-restrictive' — deny wins over allow (default, secure)
   * - 'most-permissive' — allow wins over deny (convenient)
   */
  conflictResolution?: "most-restrictive" | "most-permissive";

  /**
   * Action when no role matches the tool.
   * - 'deny' — fail-closed (default)
   * - 'abstain' — defer to next strategy in a composite
   */
  defaultAction?: "deny" | "abstain";
};
```

### Properties

*   **`roles`**: `Record<string, { allow?: string[]; deny?: string[]; }>` (Required)
    An object where each key is a role name (e.g., `'viewer'`, `'admin'`). The value for each role is an object containing optional `allow` and `deny` properties, which are arrays of tool name strings. These strings can be exact tool names or glob patterns [Source 1].

*   **`conflictResolution`**: `"most-restrictive" | "most-permissive"` (Optional)
    Determines how to resolve permission conflicts when a user has multiple roles that grant different access levels to the same tool.
    *   `'most-restrictive'`: A `deny` rule will always override an `allow` rule. This is the default and most secure option.
    *   `'most-permissive'`: An `allow` rule will override a `deny` rule.
    [Source 1]

*   **`defaultAction`**: `"deny" | "abstain"` (Optional)
    Specifies the action to take if a requested tool does not match any `allow` or `deny` rules for the user's roles.
    *   `'deny'`: The request is denied. This is the default, fail-closed behavior.
    *   `'abstain'`: The strategy makes no decision, allowing another authorization strategy (e.g., in a `CompositeStrategy`) to evaluate the request.
    [Source 1]

## Examples

The following example shows a complete `RoleStrategyConfig` object used to initialize a `RoleStrategy`. It defines three roles: `viewer`, `editor`, and `admin`, with specific tool permissions. It also explicitly sets the conflict resolution and default action policies [Source 1].

```typescript
import { RoleStrategy, RoleStrategyConfig } from 'yaaf';

const rbacConfig: RoleStrategyConfig = {
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
};

const authStrategy = new RoleStrategy(rbacConfig);
```

## See Also

*   `RoleStrategy`: The class that consumes this configuration object to perform RBAC.
*   `rbac`: A convenience factory function for creating a `RoleStrategy` instance.
*   `CompositeStrategy`: A strategy for combining multiple authorization strategies, where the `abstain` value of `defaultAction` is relevant.

## Sources

[Source 1] `src/iam/authorization.ts`