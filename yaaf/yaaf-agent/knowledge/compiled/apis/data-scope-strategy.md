---
title: DataScopeStrategy
summary: An interface for resolving a DataScope from the user context, used by tools to filter queries and API calls.
export_name: DataScopeStrategy
source_file: src/iam/types.ts
category: interface
entity_type: api
search_terms:
 - data filtering for tools
 - how to scope tool data access
 - multi-tenancy in agents
 - user-based data isolation
 - row-level security for agents
 - attribute-based data filtering
 - TenantScopeStrategy
 - OwnershipScopeStrategy
 - AttributeScopeStrategy
 - HierarchyScopeStrategy
 - ResolverScopeStrategy
 - DataScope resolution
 - agent data security
 - implementing data scoping
stub: false
compiled_at: 2026-04-24T17:00:31.516Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `DataScopeStrategy` is an interface that defines a contract for resolving a `DataScope` based on the current user's context. Its primary purpose is to enforce data access policies by providing [Tools](../subsystems/tools.md) with the necessary information to filter their operations, such as database queries or external API calls [Source 1].

This mechanism is central to implementing security patterns like multi-tenant data isolation, user-based resource ownership, and attribute-based access control ([abac](./abac.md)) at the data layer. An agent's `DataScopeStrategy` is configured via the `dataScope` property of its `AccessPolicy` [Source 1].

YAAF provides several common implementations of this strategy, including [Source 1]:
*   `TenantScopeStrategy` for multi-tenant isolation.
*   `OwnershipScopeStrategy` for filtering based on resource ownership.
*   `AttributeScopeStrategy` for filtering based on user attributes.
*   `HierarchyScopeStrategy` for access based on organizational charts.
*   `ResolverScopeStrategy` which uses a `PermissionResolver` to query external systems for access rights.

## Signature

`DataScopeStrategy` is a TypeScript interface with one property and one method [Source 1].

```typescript
export interface DataScopeStrategy {
  readonly name: string;

  /**
   * Resolve the scope for this request.
   * @returns A DataScope that tools use for filtering
   */
  resolve(ctx: ScopeContext): Promise<DataScope> | DataScope;
}
```

### Related Types

The `resolve` method returns a `DataScope` object, which is used by tools to apply filters [Source 1].

```typescript
/**
 * The resolved scope — passed to tools via ToolExecutionContext.
 * Tools use this to filter data, set query parameters, etc.
 */
export type DataScope = {
  /** Strategy that produced this scope */
  strategy: string;

  /**
   * Filters to apply.
   * Tools apply these as WHERE clauses, API filters, etc.
   */
  filters: Record<string, unknown>;

  /**
   * Whether this scope allows unrestricted access.
   * When true, tools can skip filtering entirely.
   */
  unrestricted?: boolean;

  /**
   * Human-readable description for audit logs.
   * e.g., "Scoped to tenant acme-corp" or "Filtered to user's department"
   */
  description?: string;
};
```
The `resolve` method accepts a `ScopeContext` object, which contains information about the user and the current request context.

## Methods & Properties

### name
A read-only string property that provides a unique name for the strategy implementation. This is useful for logging and debugging purposes [Source 1].

**Signature**
```typescript
readonly name: string;
```

### resolve
A method that takes a `ScopeContext` object and returns a `DataScope` object, either synchronously or asynchronously. This is the core logic of the strategy, where the user's context is evaluated to produce a set of data filters [Source 1].

**Signature**
```typescript
resolve(ctx: ScopeContext): Promise<DataScope> | DataScope;
```
*   **Parameters**:
    *   `ctx: ScopeContext`: The context for the current request, containing user information.
*   **Returns**: `Promise<DataScope> | DataScope` — The resolved data scope that tools will use for filtering.

## Examples

The following example shows how to configure an agent with a `DataScopeStrategy`. In this case, a hypothetical `TenantScopeStrategy` is used to ensure that tools only access data belonging to the user's tenant [Source 1].

```typescript
import { Agent } from 'yaaf';
import { TenantScopeStrategy, rbac } from 'yaaf/iam'; // Hypothetical imports

// Assume TenantScopeStrategy is an implementation of DataScopeStrategy
const tenantScoping = new TenantScopeStrategy({ tenantIdAttribute: 'tenantId' });

const agent = new Agent({
  // ... other agent configuration
  tools: [/* ... your tools ... */],

  accessPolicy: {
    // Authorization strategy to control *if* a tool can be called
    authorization: rbac({ viewer: ['read_*'], admin: ['*'] }),

    // Data scoping strategy to control *what data* the tool can see
    dataScope: tenantScoping,

    // Optional audit callback
    onDecision: (event) => console.log('Access Decision:', event),
  },
});
```

## See Also

*   `AccessPolicy`: The configuration object where a `DataScopeStrategy` is specified for an agent.
*   `DataScope`: The object returned by a `DataScopeStrategy` that contains the data filters.
*   `AuthorizationStrategy`: A related interface for controlling whether a tool can be invoked at all, as opposed to what data it can access.
*   `UserContext`: The object representing the end-user, which is the primary input for resolving a data scope.

## Sources
[Source 1]: src/iam/types.ts