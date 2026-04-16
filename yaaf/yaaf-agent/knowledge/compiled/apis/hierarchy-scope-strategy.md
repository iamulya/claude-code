---
title: HierarchyScopeStrategy
entity_type: api
summary: Controls data access based on organizational hierarchy or tree structures, such as manager-report relationships.
export_name: HierarchyScopeStrategy
source_file: src/iam/scoping.ts
category: class
stub: false
compiled_at: 2026-04-16T14:19:36.593Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/scoping.ts
confidence: 0.9
---

## Overview
`HierarchyScopeStrategy` is a data scoping strategy used to restrict or grant access to data based on a user's position within an organizational hierarchy or tree structure. It is primarily utilized in scenarios where access is determined by reporting lines—such as managers accessing data belonging to their reports—or departmental structures.

This strategy determines what data a tool can access by resolving the user's position in a hierarchy and generating filters based on the specified direction of access (up, down, or both).

## Signature / Constructor
```typescript
export class HierarchyScopeStrategy implements DataScopeStrategy {
  constructor(config: HierarchyScopeConfig);
}

export type HierarchyScopeConfig = {
  /** Resolve the user's position in the hierarchy */
  resolveHierarchy: (userId: string) => Promise<HierarchyNode | null>;
  /**
   * Direction of access:
   * - 'down' — user sees descendants' data (manager sees reports)
   * - 'up' — user sees ancestors' data
   * - 'both' — user sees both
   */
  direction?: 'down' | 'up' | 'both';
  /** Field in data records that maps to a hierarchy node */
  nodeField?: string;
  /** Roles that bypass hierarchy (see everything) */
  bypassRoles?: string[];
}
```

### Configuration Parameters
*   `resolveHierarchy`: An asynchronous function responsible for fetching the user's node within the hierarchy structure.
*   `direction`: Defines the scope of visibility relative to the user's node. Defaults to 'down' in typical manager-report implementations.
*   `nodeField`: The attribute name in the target data records that corresponds to a hierarchy node identifier (e.g., `departmentId` or `orgNodeId`).
*   `bypassRoles`: An optional array of role names that, if possessed by the user, will result in unrestricted access, bypassing the hierarchy filters.

## Examples
### Basic Manager-Report Scoping
This example configures the strategy so that users can see data for any node below them in the organizational tree.

```typescript
const scope = new HierarchyScopeStrategy({
  resolveHierarchy: async (userId) => orgTree.getNode(userId),
  direction: 'down',
  nodeField: 'departmentId',
});
```

## See Also
* `TenantScopeStrategy`
* `OwnershipScopeStrategy`
* `AttributeScopeStrategy`
* `ResolverScopeStrategy`
* `CompositeScope`