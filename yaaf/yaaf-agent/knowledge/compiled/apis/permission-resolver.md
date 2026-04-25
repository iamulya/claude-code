---
title: PermissionResolver
summary: An interface for querying external systems to discover what a specific user can access.
export_name: PermissionResolver
source_file: src/iam/types.ts
category: interface
entity_type: api
search_terms:
 - external permission checks
 - user access discovery
 - query user permissions
 - integrate with Jira permissions
 - Confluence access control
 - Google Drive permissions
 - ResolverScopeStrategy data source
 - how to check user access
 - dynamic data scoping
 - runtime permission resolution
 - third-party system access
 - IAM integration
 - resource grants
stub: false
compiled_at: 2026-04-24T17:28:08.449Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `PermissionResolver` interface defines a contract for components that query external, third-party systems to determine a user's access rights to specific resources [Source 1]. These systems could include services like Confluence, Jira, or Google Drive.

Implementations of this interface are responsible for communicating with the external system's API, using the provided user context, to fetch a list of resources or permissions the user holds. The results from a `PermissionResolver` are typically consumed by a `ResolverScopeStrategy` to generate a `DataScope`, which [Tools](../subsystems/tools.md) then use to filter data and enforce access control during their execution [Source 1].

This mechanism allows YAAF agents to respect the source-of-truth permissions defined in external platforms, rather than needing to replicate or synchronize them within the agent's configuration.

## Signature

The `PermissionResolver` is a TypeScript interface with the following structure [Source 1]:

```typescript
export interface PermissionResolver {
  readonly name: string;
  readonly system: string;
  resolve(user: UserContext): Promise<ResolvedPermissions>;
  check?(user: UserContext, resourceId: string): Promise<boolean>;
}
```

## Methods & Properties

### name
- **Type**: `readonly string`

A unique name for the resolver implementation, used for identification and logging.

### system
- **Type**: `readonly string`

An identifier for the external system this resolver queries, such as `'confluence'`, `'jira'`, or `'gdrive'`. This property is used to match the resolver to the tools that operate on that system [Source 1].

### resolve()
- **Signature**: `resolve(user: UserContext): Promise<ResolvedPermissions>`

The primary method of the interface. It takes a `UserContext` object and asynchronously resolves the user's permissions within the external system. It returns a promise that resolves to a `ResolvedPermissions` object, which represents the set of resource grants the user has [Source 1]. The specific structure of `ResolvedPermissions` is defined elsewhere.

### check()
- **Signature**: `check?(user: UserContext, resourceId: string): Promise<boolean>`

An optional, more efficient method for checking if a user has access to a single, specific resource. If implemented, it can avoid the overhead of fetching all of a user's permissions [when](./when.md) only a single check is needed [Source 1]. It returns a promise that resolves to `true` if access is granted, and `false` otherwise.

## Examples

### Conceptual Implementation

Below is a conceptual example of how one might implement a `PermissionResolver` for a fictional "Confluence" service.

```typescript
import { PermissionResolver, UserContext, ResolvedPermissions } from 'yaaf';
import { confluenceApi } from './confluence-client';

// Note: ResolvedPermissions is a hypothetical type for this example.
// It might contain a list of accessible space keys or page IDs.
// type ResolvedPermissions = { accessibleSpaceKeys: string[] };

class ConfluencePermissionResolver implements PermissionResolver {
  public readonly name = 'confluence-permission-resolver';
  public readonly system = 'confluence';

  async resolve(user: UserContext): Promise<ResolvedPermissions> {
    const userToken = user.credentials?.token;
    if (!userToken) {
      throw new Error('User credentials are required to resolve Confluence permissions.');
    }

    // Call the external Confluence API to get accessible spaces
    const accessibleSpaces = await confluenceApi.getAccessibleSpaces(userToken);

    return {
      accessibleSpaceKeys: accessibleSpaces.map(space => space.key),
    };
  }

  async check(user: UserContext, resourceId: string): Promise<boolean> {
    const userToken = user.credentials?.token;
    if (!userToken) {
      return false;
    }
    // `resourceId` here could be a space key, e.g., "ENG"
    return await confluenceApi.canUserAccessSpace(userToken, resourceId);
  }
}
```

## See Also

- `ResolverScopeStrategy`: A `DataScopeStrategy` that often consumes a `PermissionResolver` to create data filters for tools.
- `UserContext`: The object representing the end-user, which is passed to the resolver's methods.
- `DataScope`: The output of a [Data Scoping](../concepts/data-scoping.md) strategy, used by tools to filter results.

## Sources

[Source 1] src/iam/types.ts