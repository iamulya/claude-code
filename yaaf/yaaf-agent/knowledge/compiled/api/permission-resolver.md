---
summary: Interface for querying external systems to discover resource-level permissions for a user.
export_name: PermissionResolver
source_file: src/iam/types.ts
category: interface
title: PermissionResolver
entity_type: api
stub: false
compiled_at: 2026-04-16T14:20:06.219Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/types.ts
confidence: 1
---

## Overview
`PermissionResolver` is an interface used to query external systems—such as Confluence, Jira, or Google Drive—to discover the specific resources a user is authorized to access. 

In the YAAF IAM (Identity and Access Management) subsystem, these resolvers bridge the gap between the agent's internal user context and the permission models of third-party platforms. The results produced by a resolver are typically consumed by a `ResolverScopeStrategy` to generate filters that restrict tool execution to authorized data.

## Signature / Constructor

```typescript
export interface PermissionResolver {
  readonly name: string
  readonly system: string
  resolve(user: UserContext): Promise<ResolvedPermissions>
  check?(user: UserContext, resourceId: string): Promise<boolean>
}
```

## Methods & Properties

### Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The unique identifier for the resolver implementation. |
| `system` | `string` | The identifier of the external system (e.g., `'confluence'`, `'jira'`, `'gdrive'`). This is used to match the resolver to relevant tools. |

### Methods
| Method | Signature | Description |
| :--- | :--- | :--- |
| `resolve` | `(user: UserContext) => Promise<ResolvedPermissions>` | Queries the external system to retrieve a comprehensive set of resource grants for the specified user. |
| `check` | `(user: UserContext, resourceId: string) => Promise<boolean>` | (Optional) Performs a targeted check to see if a user has access to a specific resource. This is often more efficient than a full resolution for single-resource validation. |

## Examples

### Implementing a Custom Resolver
This example demonstrates a mock resolver for a document management system.

```typescript
import { PermissionResolver, UserContext, ResolvedPermissions } from './iam/types';

class DocumentSystemResolver implements PermissionResolver {
  readonly name = 'doc-system-resolver';
  readonly system = 'doc-vault';

  async resolve(user: UserContext): Promise<ResolvedPermissions> {
    // Logic to fetch accessible document IDs from an external API
    // using user.userId or user.credentials
    const accessibleDocs = await fetchDocsForUser(user.userId);
    
    return {
      grants: accessibleDocs.map(id => ({
        resource: `doc:${id}`,
        action: 'read'
      }))
    };
  }

  async check(user: UserContext, resourceId: string): Promise<boolean> {
    // Optimized check for a single document
    return await verifyAccess(user.userId, resourceId);
  }
}
```

## See Also
* `UserContext`
* `DataScopeStrategy`
* `AccessPolicy`