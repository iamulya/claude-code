---
summary: Configuration options for the HierarchyScopeStrategy.
export_name: HierarchyScopeConfig
source_file: src/iam/scoping.ts
category: type
title: HierarchyScopeConfig
entity_type: api
search_terms:
 - org chart access control
 - tree-based data scoping
 - manager-report data access
 - hierarchical permissions
 - how to scope data by organization structure
 - HierarchyScopeStrategy configuration
 - resolveHierarchy function
 - data access direction up down
 - nodeField for hierarchy
 - bypassRoles for hierarchy
 - user hierarchy data filtering
 - scoping by management chain
stub: false
compiled_at: 2026-04-25T00:07:41.127Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/scoping.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`HierarchyScopeConfig` is a type alias that defines the configuration object for the [HierarchyScopeStrategy](./hierarchy-scope-strategy.md) class. This configuration is used to implement data scoping based on a hierarchical structure, such as an organization chart, where a user's access to data is determined by their position in the tree [Source 1].

This strategy is typically used in scenarios where managers need to access the data of their direct and indirect reports, or vice-versa. The configuration specifies how to locate a user within the hierarchy, the direction of access (up, down, or both), and how to link data records to nodes in the hierarchy [Source 1].

## Signature

The `HierarchyScopeConfig` type is defined as follows [Source 1]:

```typescript
export type HierarchyScopeConfig = {
  /**
   * A function that resolves a user's position in the hierarchy.
   * It takes a user ID and returns a promise that resolves to a
   * `HierarchyNode` object or `null` if the user is not found.
   */
  resolveHierarchy: (userId: string) => Promise<HierarchyNode | null>;

  /**
   * The direction of data access relative to the user's position in the hierarchy.
   * - 'down': The user can access data associated with their descendants (e.g., a manager sees their reports' data).
   * - 'up': The user can access data associated with their ancestors.
   * - 'both': The user can access data associated with both ancestors and descendants.
   */
  direction?: "down" | "up" | "both";

  /**
   * The name of the field in the data records that contains the identifier
   * for the hierarchy node it belongs to.
   */
  nodeField?: string;

  /**
   * An array of role names that should bypass the hierarchy scoping rules,
   * granting them unrestricted access to all data.
   */
  bypassRoles?: string[];
};
```

## Examples

The following example demonstrates how to configure a [HierarchyScopeStrategy](./hierarchy-scope-strategy.md) to grant managers access to their reports' data. It assumes the existence of an `orgTree` object that can look up a user's node in the organizational hierarchy [Source 1].

```typescript
import { HierarchyScopeStrategy } from 'yaaf';

// An example orgTree object that resolves a user's position
const orgTree = {
  getNode: async (userId: string) => {
    // In a real application, this would query a database or service
    // to find the user's node in the organizational tree.
    console.log(`Resolving hierarchy for user: ${userId}`);
    // Dummy implementation for demonstration
    if (userId === 'manager1') {
      return { id: 'dept-A', children: [{ id: 'dept-A-1' }] };
    }
    return null;
  }
};

const scope = new HierarchyScopeStrategy({
  resolveHierarchy: async (userId) => orgTree.getNode(userId),
  direction: 'down',
  nodeField: 'departmentId',
  bypassRoles: ['admin', 'hr_director'],
});

// When this strategy is applied for a user with the 'manager1' ID,
// it will generate a filter to access data where 'departmentId'
// is in ['dept-A', 'dept-A-1'].
// A user with the 'admin' role will have unrestricted access.
```

## See Also

- [HierarchyScopeStrategy](./hierarchy-scope-strategy.md): The class that uses this configuration to implement hierarchical data scoping.
- [DataScopeStrategy](./data-scope-strategy.md): The interface that all data scoping strategies implement.
- [AttributeStrategy](./attribute-strategy.md): An alternative, highly flexible scoping strategy based on user attributes.
- [CompositeStrategy](./composite-strategy.md): A strategy for combining multiple data scoping strategies.

## Sources

[Source 1]: src/iam/scoping.ts