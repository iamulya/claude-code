---
summary: Implements organizational hierarchy-based access, allowing managers to see reports' data.
export_name: HierarchyScopeStrategy
source_file: src/iam/scoping.ts
category: class
title: HierarchyScopeStrategy
entity_type: api
search_terms:
 - org chart access control
 - manager-report data visibility
 - tree-based permissions
 - hierarchical data scoping
 - how to restrict data to a user's team
 - organizational structure security
 - data access based on reporting line
 - user hierarchy filtering
 - parent-child data access
 - scoping by management chain
 - what is HierarchyScopeStrategy
 - implementing manager view
stub: false
compiled_at: 2026-04-25T00:07:43.680Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/scoping.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `HierarchyScopeStrategy` class implements the [DataScopeStrategy](./data-scope-strategy.md) interface to control data access based on a user's position within a hierarchical structure, such as an organizational chart [Source 1]. Its primary use case is to allow managers to view data associated with their direct and indirect reports.

This strategy works by resolving a user's node in a tree-like structure and then generating data filters based on that node's relationships (ancestors or descendants). It can be configured to grant access downwards (e.g., a manager seeing their team's data), upwards (e.g., an employee seeing their management chain's data), or in both directions [Source 1].

## Constructor

The `HierarchyScopeStrategy` is instantiated with a `HierarchyScopeConfig` object that defines how to resolve the user's position in the hierarchy and how to apply the resulting scope [Source 1].

```typescript
import type { DataScopeStrategy } from './data-scope-strategy';

// A representation of a node in the hierarchy.
// The exact shape is up to the implementer of resolveHierarchy.
interface HierarchyNode {
  // ... properties of a node
}

export type HierarchyScopeConfig = {
  /**
   * A function that resolves a user's position in the hierarchy.
   * It takes a user ID and returns a promise that resolves to a
   * representation of their node in the hierarchy, or null if not found.
   */
  resolveHierarchy: (userId: string) => Promise<HierarchyNode | null>;

  /**
   * The direction of access relative to the user's node.
   * - 'down': The user can access data associated with their node and all its descendants.
   * - 'up': The user can access data associated with their node and all its ancestors.
   * - 'both': The user can access data associated with both ancestors and descendants.
   */
  direction?: "down" | "up" | "both";

  /**
   * The field name in the data records that maps to a node in the hierarchy.
   * For example, if data records have a 'departmentId' field, this should be set to 'departmentId'.
   */
  nodeField?: string;

  /**
   * An array of role names that should bypass the hierarchy scoping rules
   * and be granted unrestricted access to all data.
   */
  bypassRoles?: string[];
};

export class HierarchyScopeStrategy implements DataScopeStrategy {
  constructor(config: HierarchyScopeConfig);
  // ...
}
```

## Examples

The following example demonstrates how to configure a `HierarchyScopeStrategy` to allow managers to see data associated with their department and all sub-departments [Source 1].

```typescript
// Assume `orgTree` is an object that can resolve a user's node in the company hierarchy.
const orgTree = {
  getNode: async (userId: string) => {
    // ... implementation to find a user's node in the org chart
    return { id: 'dept-eng', children: [{ id: 'dept-platform' }] };
  }
};

const scope = new HierarchyScopeStrategy({
  // Function to find the user's position in the org chart.
  resolveHierarchy: async (userId) => orgTree.getNode(userId),

  // Allow managers to see data from their reports (descendants).
  direction: 'down',

  // The data records have a 'departmentId' field that corresponds to a node in the org chart.
  nodeField: 'departmentId',
});

// When this strategy is applied for a user, it will generate a filter like:
// { filters: { departmentId: { in: ['dept-eng', 'dept-platform'] } } }
```

## See Also

- [DataScopeStrategy](./data-scope-strategy.md): The interface that `HierarchyScopeStrategy` implements.
- `AttributeScopeStrategy`: A more flexible strategy for attribute-based access control.
- `OwnershipScopeStrategy`: A strategy for user-owns-resource filtering.

## Sources

[Source 1]: src/iam/scoping.ts