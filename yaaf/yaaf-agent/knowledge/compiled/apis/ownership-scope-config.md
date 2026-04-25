---
summary: Configuration options for the OwnershipScopeStrategy.
export_name: OwnershipScopeConfig
source_file: src/iam/scoping.ts
category: type
title: OwnershipScopeConfig
entity_type: api
search_terms:
 - user ownership filtering
 - how to scope data by owner
 - resource ownership access control
 - manager view of team data
 - team-based data access
 - createdBy field filtering
 - admin bypass for ownership
 - team lead permissions
 - ownership scope strategy config
 - IAM data scoping
 - user-owns-resource model
stub: false
compiled_at: 2026-04-25T00:10:47.961Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/scoping.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`OwnershipScopeConfig` is a type alias that defines the configuration object for the [OwnershipScopeStrategy](./ownership-scope-strategy.md). This strategy implements a common data access pattern where users can only access resources they own, while certain roles like managers or administrators have broader access privileges [Source 1].

This configuration allows customization of field names and role identifiers to match an application's specific data model and role-based access control system. It is used to specify which field in a data record holds the owner's ID, which roles can bypass ownership checks entirely, which roles can view their team's data, and how team membership is determined [Source 1].

## Signature

`OwnershipScopeConfig` is a TypeScript type alias with the following structure [Source 1]:

```typescript
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
```

### Properties

| Property       | Type           | Description                                                                                                                            |
| -------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `ownerField`   | `string`       | Optional. The name of the field in data records that identifies the resource's owner. Defaults to `'createdBy'`. [Source 1]             |
| `adminRoles`   | `string[]`     | Optional. An array of role names that are granted unrestricted access, bypassing all ownership checks. [Source 1]                        |
| `managerRoles` | `string[]`     | Optional. An array of role names that can access resources owned by members of their team. [Source 1]                                    |
| `teamField`    | `string`       | Optional. The attribute key in the user's context that identifies their team. Used for manager-level access. Defaults to `'teamId'`. [Source 1] |

## Examples

The following example demonstrates how to create an `OwnershipScopeConfig` object and pass it to the constructor of an [OwnershipScopeStrategy](./ownership-scope-strategy.md) [Source 1].

```typescript
import { OwnershipScopeStrategy } from 'yaaf';

// Define the configuration for ownership-based scoping
const scopeConfig: OwnershipScopeConfig = {
  ownerField: 'createdBy',
  managerRoles: ['team_lead', 'admin'],
  teamField: 'teamId',
};

// Instantiate the strategy with the configuration
const scope = new OwnershipScopeStrategy(scopeConfig);

// This strategy can now be used to generate data scopes.
// For a user with the 'team_lead' role, it will generate a filter
// that includes resources where 'createdBy' is in their team.
// For a regular user, it will filter for resources where 'createdBy'
// matches their own user ID.
```

## See Also

- [OwnershipScopeStrategy](./ownership-scope-strategy.md): The class that uses this configuration to implement ownership-based data scoping.
- [DataScopeStrategy](./data-scope-strategy.md): The interface that `OwnershipScopeStrategy` implements, defining the contract for data scoping strategies.

## Sources

[Source 1]: src/iam/scoping.ts