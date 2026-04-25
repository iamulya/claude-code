---
title: ResolvedPermissions
entity_type: api
summary: A type representing a collection of resource access grants, typically returned by a PermissionResolver.
export_name: ResolvedPermissions
source_file: src/iam/types.ts
category: type
search_terms:
 - permission grants
 - access rights
 - resolved user permissions
 - PermissionResolver result
 - external permission system
 - IAM types
 - authorization data structure
 - user access control
 - resource permissions
 - what can a user do
 - dynamic permissions
 - permission grant set
stub: false
compiled_at: 2026-04-25T00:12:09.563Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/index.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`ResolvedPermissions` is a TypeScript type that represents a set of resource access grants for a user. It is a key component of YAAF's Identity and Access Management (IAM) subsystem [Source 1].

This type is primarily used as the return value for a `PermissionResolver`. A `PermissionResolver` is a function designed to query external systems (such as Jira, Confluence, or other third-party services) to determine a user's specific permissions on resources managed by those systems. The resulting `ResolvedPermissions` object can then be used by an [AuthorizationStrategy](./authorization-strategy.md) to make access control decisions within the agent [Source 1].

The collection typically consists of `PermissionGrant` objects, each detailing a specific permission on a resource [Source 1].

## Signature

The exact type definition for `ResolvedPermissions` is not detailed in the provided source material. It is exported from `src/iam/index.ts` as part of the IAM module's public API [Source 1].

```typescript
// Source: src/iam/index.ts [Source 1]
export type {
  // ... other IAM types
  PermissionResolver,
  ResolvedPermissions,
  PermissionGrant,
  // ... other IAM types
} from "./types.js";
```

Based on its name and context alongside `PermissionGrant`, `ResolvedPermissions` is likely a collection type, such as an array or a set of `PermissionGrant` objects.

## Examples

No code examples are available in the provided source material.

## See Also

- [PermissionResolver](./permission-resolver.md): The function type that returns `ResolvedPermissions`.
- `PermissionGrant`: The type representing an individual permission within the `ResolvedPermissions` collection.
- [AuthorizationStrategy](./authorization-strategy.md): Consumes permission information to make authorization decisions.
- [AccessPolicy](./access-policy.md): The main configuration surface for combining authorization and other access control layers.

## Sources

[Source 1]: src/iam/index.ts