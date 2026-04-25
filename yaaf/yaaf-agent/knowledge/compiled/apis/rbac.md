---
summary: A convenience factory function for quickly setting up a `RoleStrategy` instance.
export_name: rbac
source_file: src/iam/authorization.ts
category: function
title: rbac
entity_type: api
search_terms:
 - role-based access control
 - RBAC setup
 - define user roles
 - tool permissions by role
 - authorization factory
 - quick role strategy
 - allow and deny lists
 - glob patterns for tools
 - user authorization
 - secure tool access
 - create RoleStrategy
 - iam authorization helper
stub: false
compiled_at: 2026-04-24T17:31:39.001Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/authorization.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `rbac` function is a factory that provides a concise way to create and configure a `RoleStrategy` instance for implementing role-based access control (RBAC) [Source 1]. It simplifies the process of mapping role names to lists of allowed and denied tool patterns, using secure defaults for the underlying strategy [Source 1].

This function is the recommended way to set up simple RBAC policies. For more complex configurations involving conflict resolution or default actions, one may need to instantiate `RoleStrategy` directly [Source 1].

Permissions for each role can be defined in two ways [Source 1]:
1.  A simple array of strings, where each string is a tool pattern to be allowed.
2.  An object with `allow` and optional `deny` properties, each being an array of tool patterns. This allows for more explicit control.

Tool patterns can use glob-style wildcards, such as `search_*` or `*` [Source 1].

## Signature

```typescript
import { RoleStrategy } from './[[[[[[[[Authorization]]]]]]]]';

export function rbac(
  roles: Record<string, string[] | { allow: string[]; deny?: string[] }>
): RoleStrategy;
```

**Parameters:**

*   `roles`: An object where keys are role names (e.g., `'viewer'`, `'admin'`) and values define the permissions for that role. The value can be an array of allowed tool patterns or an object specifying `allow` and/or `deny` lists [Source 1].

**Returns:**

*   An instance of `RoleStrategy` configured with the provided roles [Source 1].

## Examples

The following example demonstrates how to create an Authorization strategy with three roles: `viewer`, `editor`, and `admin`. The `viewer` and `admin` roles use the simple string array format, while the `editor` role uses the more explicit object format to deny a specific tool [Source 1].

```typescript
import { rbac } from 'yaaf';

const authStrategy = rbac({
  // Viewers can only use tools matching 'search_*' or 'read_*'
  viewer: ['search_*', 'read_*'],

  // Editors have viewer permissions plus write access, but are explicitly denied 'write_config'
  editor: {
    allow: ['search_*', 'read_*', 'write_*'],
    deny: ['write_config'],
  },

  // Admins are allowed to use any tool
  admin: ['*'],
});

// This authStrategy instance can now be used in an agent's IAM configuration.
```

## See Also

*   `RoleStrategy`: The class that `rbac` instantiates and configures.
*   `[[[[[[[[abac]]]]]]]]`: A factory function for creating attribute-based access control (abac) strategies.
*   `CompositeStrategy`: A class for combining multiple authorization strategies.

## Sources

[Source 1]: src/iam/authorization.ts