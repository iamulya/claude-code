---
title: OwnershipScopeStrategy
entity_type: api
summary: Restricts data access based on resource ownership and team membership hierarchies.
export_name: OwnershipScopeStrategy
source_file: src/iam/scoping.ts
category: class
stub: false
compiled_at: 2026-04-16T14:19:27.888Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/scoping.ts
confidence: 0.9
---

## Overview
`OwnershipScopeStrategy` is a data scoping mechanism used to restrict the data a tool can access based on the relationship between the user and the resource. It implements a "user-owns-resource" filtering model where access is determined by ownership fields and team membership.

This strategy is typically used in environments where regular users should only interact with their own data, while users with elevated roles (such as managers or administrators) require broader access to team-wide or system-wide resources. It determines what specific data records are visible to a tool during execution, rather than whether the tool itself is authorized to run.

## Signature / Constructor

### Constructor
```typescript
constructor(config: OwnershipScopeConfig)
```

### OwnershipScopeConfig
The configuration object defines how ownership and team relationships are identified within the data and the user context.

| Property | Type | Description |
| :--- | :--- | :--- |
| `ownerField` | `string` | The field in data records that identifies the owner. Defaults to `'createdBy'`. |
| `adminRoles` | `string[]` | Roles that bypass ownership restrictions to see all records. |
| `managerRoles` | `string[]` | Roles that grant access to all resources belonging to members of the user's team. |
| `teamField` | `string` | The attribute key in the user context used for team membership. Defaults to `'teamId'`. |

## Methods & Properties
`OwnershipScopeStrategy` implements the `DataScopeStrategy` interface. It processes the `UserContext` to produce filters that are applied to data queries.

*   **Regular Users**: Filters data where the `ownerField` matches the user's ID.
*   **Managers**: Filters data where the record's team identifier matches the user's `teamField`.
*   **Admins**: Produces an unrestricted scope, bypassing ownership filters.

## Examples

### Basic Ownership and Team Access
In this example, regular users see only their own records, while team leads and admins have broader access.

```typescript
import { OwnershipScopeStrategy } from 'yaaf/iam/scoping';

const scope = new OwnershipScopeStrategy({
  ownerField: 'createdBy',
  managerRoles: ['team_lead'],
  adminRoles: ['admin'],
  teamField: 'teamId',
});
```

## See Also
* `TenantScopeStrategy`
* `AttributeScopeStrategy`
* `HierarchyScopeStrategy`
* `CompositeScope`