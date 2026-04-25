---
summary: Represents a single permission string used in YAAF's Identity and Access Management (IAM) system.
export_name: PermissionGrant
source_file: src/iam/types.ts
category: type
title: PermissionGrant
entity_type: api
search_terms:
 - IAM permissions
 - user access rights
 - role-based access control type
 - attribute-based access control type
 - external permission system
 - permission resolver return type
 - what is a permission grant
 - how to define user permissions
 - data structure for permissions
 - YAAF authorization
 - access control list entry
 - ACL type
 - permission string
stub: false
compiled_at: 2026-04-25T00:11:14.659Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/index.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `PermissionGrant` type is a fundamental building block within YAAF's Identity and Access Management (IAM) subsystem [Source 1]. It represents a single, specific permission granted to a user or role, typically expressed as a string. These strings often support wildcards (e.g., `search_*`, `read_documents`).

`PermissionGrant` is most commonly used as the return type for a `PermissionResolver`, which is responsible for fetching a user's permissions from an external system. The collection of these grants for a user is represented by the [ResolvedPermissions](./resolved-permissions.md) type, which is an array of `PermissionGrant` strings. These resolved permissions are then evaluated by an [AuthorizationStrategy](./authorization-strategy.md) (such as [abac](./abac.md) or RBAC) to make access control decisions [Source 1].

## Signature

`PermissionGrant` is a type alias for a `string`. While the source files do not contain the explicit definition, its usage in framework examples implies this structure [Source 1].

```typescript
// Inferred from usage within the framework
export type PermissionGrant = string;
```

The type is exported as part of the `iam` module [Source 1]:

```typescript
// Source: src/iam/index.ts
export type { PermissionGrant } from "./types.js";
```

## Examples

The primary use of `PermissionGrant` is to represent permissions that are either defined statically or resolved dynamically.

### Static RBAC Definition

In a simple Role-Based Access Control (RBAC) setup, arrays of `PermissionGrant` strings are used to define the capabilities of each role.

```typescript
import { Agent } from 'yaaf';
import { rbac } from 'yaaf/iam';

const agent = new Agent({
  // ... other agent config
  accessPolicy: {
    authorization: rbac({
      // Each string in these arrays is a PermissionGrant
      viewer: ['search_*', 'read_*'],
      editor: ['search_*', 'read_*', 'write_*'],
      admin: ['*'],
    }),
  },
});
```

### Dynamic Resolution

A `PermissionResolver` implementation would fetch permissions from an external source and return them as an array of `PermissionGrant` strings.

```typescript
import type { PermissionGrant, PermissionResolver, UserContext } from 'yaaf/iam';

// A hypothetical PermissionResolver implementation
const myPermissionResolver: PermissionResolver = {
  async resolve(userContext: UserContext): Promise<PermissionGrant[]> {
    // In a real implementation, this would query an external service
    // based on userContext.userId or userContext.roles.
    if (userContext.roles?.includes('editor')) {
      return [
        'search_articles', // A PermissionGrant
        'read_articles',   // A PermissionGrant
        'write_articles',  // A PermissionGrant
      ];
    }
    return ['search_articles', 'read_articles'];
  }
};
```

## See Also

-   [ResolvedPermissions](./resolved-permissions.md): The type representing a collection of `PermissionGrant`s for a user.
-   [PermissionResolver](./permission-resolver.md): The interface for components that fetch `PermissionGrant`s from external systems.
-   [AuthorizationStrategy](./authorization-strategy.md): The mechanism that consumes `PermissionGrant`s to make access decisions.
-   [AccessPolicy](./access-policy.md): The main configuration surface for applying authorization and data scoping.
-   [abac](./abac.md): An attribute-based authorization strategy that evaluates permissions.

## Sources

[Source 1]: src/iam/index.ts