---
summary: Implements user-owns-resource filtering, allowing users to see their own data and managers to see team data.
export_name: OwnershipScopeStrategy
source_file: src/iam/scoping.ts
category: class
title: OwnershipScopeStrategy
entity_type: api
search_terms:
 - user ownership data filtering
 - manager sees team data
 - how to scope data by owner
 - resource ownership access control
 - team-based data visibility
 - createdBy field filtering
 - data scoping strategy
 - IAM data access
 - restrict data to owner
 - team lead data access
 - admin bypass ownership
 - ownership-based authorization
stub: false
compiled_at: 2026-04-25T00:10:59.743Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/scoping.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `OwnershipScopeStrategy` is a class that implements the [DataScopeStrategy](./data-scope-strategy.md) interface to enforce data access rules based on resource ownership [Source 1]. It is designed for scenarios where data records have an owner, and access permissions depend on the user's relationship to that owner.

This strategy supports three common access patterns:
1.  **Individual Users**: A standard user can only access resources they personally own.
2.  **Managers**: Users with a designated "manager" role can access resources owned by any member of their team.
3.  **Administrators**: Users with an "admin" role can bypass all ownership checks and access all resources [Source 1].

This strategy is a common component in Identity and Access Management (IAM) systems for filtering what data a tool can access, rather than whether the tool can be called [Source 1].

## Signature / Constructor

The `OwnershipScopeStrategy` class is instantiated with a configuration object of type `OwnershipScopeConfig`.

```typescript
import type { DataScopeStrategy } from './data-scope';

export type OwnershipScopeConfig = {
  /** Field in data records that identifies the owner (default: 'createdBy') */
  ownerField?: string;
  /** Roles that can see all records (bypass ownership) */
  adminRoles?: string[];
  /** Roles that can see team members' resources */
  managerRoles?: string[];
  /** Attribute key for team membership (default: 'teamId') */
  teamField?: string;
};

export class OwnershipScopeStrategy implements DataScopeStrategy {
  constructor(config: OwnershipScopeConfig);
  // ...
}
```

### Configuration (`OwnershipScopeConfig`)

| Property       | Type       | Description                                                                                                                            |
| -------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `ownerField`   | `string`   | Optional. The field name in data records that identifies the resource's owner. Defaults to `'createdBy'`.                               |
| `adminRoles`   | `string[]` | Optional. An array of role names that grant unrestricted access, bypassing all ownership checks.                                       |
| `managerRoles` | `string[]` | Optional. An array of role names that grant access to resources owned by the user's team members.                                      |
| `teamField`    | `string`   | Optional. The attribute key in the user's context that identifies their team, used in conjunction with `managerRoles`. Defaults to `'teamId'`. |

[Source 1]

## Examples

The following example demonstrates how to configure an `OwnershipScopeStrategy`. In this setup, users with the `team_lead` or `admin` roles are considered managers, and the `teamId` attribute is used to determine team membership. The `createdBy` field in the data records is used to identify the owner.

```typescript
import { OwnershipScopeStrategy } from 'yaaf';

const scope = new OwnershipScopeStrategy({
  ownerField: 'createdBy',
  managerRoles: ['team_lead', 'admin'],
  teamField: 'teamId',
});

// When this strategy is applied for a user with the 'team_lead' role,
// it will generate a data scope that allows access to all records
// where the 'createdBy' field matches an ID of a user in their team.
// A regular user will only see records where 'createdBy' matches their own ID.
```
[Source 1]

## See Also

*   [DataScopeStrategy](./data-scope-strategy.md): The interface implemented by this and other data scoping strategies.
*   Other strategies like `TenantScopeStrategy`, `AttributeScopeStrategy`, and `HierarchyScopeStrategy` for different data filtering models [Source 1].

## Sources

[Source 1]: src/iam/scoping.ts