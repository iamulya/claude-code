---
summary: Provides a collection of data scoping strategies to control what data an agent's tools can access based on user context, tenancy, ownership, and other attributes.
primary_files:
 - src/iam/scoping.ts
title: IAM
entity_type: subsystem
exports:
 - TenantScopeStrategy
 - OwnershipScopeStrategy
 - AttributeScopeStrategy
 - HierarchyScopeStrategy
 - ResolverScopeStrategy
 - CompositeScope
 - systemAwareScope
search_terms:
 - data scoping
 - multi-tenancy in agents
 - how to restrict tool data access
 - user-based data filtering
 - attribute-based access control
 - ABAC for agents
 - organizational chart permissions
 - role-based data access
 - composite access policies
 - system-aware permissions
 - tenant isolation
 - resource ownership
 - permission resolver
stub: false
compiled_at: 2026-04-25T00:28:41.953Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/scoping.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The Identity and Access Management (IAM) subsystem in YAAF provides a framework for data scoping. Its primary function is to determine *what* data a tool can access on behalf of a user, rather than *whether* the tool can be called at all [Source 1]. This ensures that agents operating within a user's context adhere to the same data access policies as the user, which is critical in multi-tenant, user-specific, or otherwise permissioned environments.

## Architecture

The subsystem is built around a set of composable `DataScopeStrategy` implementations. Each strategy provides a specific model for filtering data based on the user's context [Source 1].

- **[TenantScopeStrategy](../apis/tenant-scope-strategy.md)**: Implements multi-tenant isolation by filtering data based on a tenant identifier present in the user's context. It supports bypass roles, such as `super_admin`, who can view data across all tenants [Source 1].
- **[OwnershipScopeStrategy](../apis/ownership-scope-strategy.md)**: Filters resources based on ownership. A standard user can only see resources they own (e.g., where `createdBy` matches their user ID), while users with manager or admin roles can see resources owned by their team members or all resources, respectively [Source 1].
- **[AttributeScopeStrategy](../apis/attribute-scope-strategy.md)**: Provides a highly flexible attribute-based access control (ABAC) model. It uses a list of rules, where each rule consists of a condition and a filter-producing function. This allows for complex logic, such as scoping data to a user's department or region [Source 1].
- **[HierarchyScopeStrategy](../apis/hierarchy-scope-strategy.md)**: Designed for organizational structures. It filters data based on a user's position in a hierarchy (e.g., an org chart), allowing managers to see their direct and indirect reports' data [Source 1].
- **[ResolverScopeStrategy](../apis/resolver-scope-strategy.md)**: Delegates the data scoping decision to an external `PermissionResolver`. It queries the resolver for a user's permissions and then transforms those grants into a data scope, with optional caching [Source 1].
- **CompositeScope**: A meta-strategy that combines multiple strategies. It can operate in two modes: `merge`, which combines the filters from all strategies, or `firstMatch`, which uses the first strategy that returns a valid scope [Source 1].
- **systemAwareScope**: A factory function that creates a routing strategy. It maps tools to specific systems (e.g., `search_confluence` maps to `confluence`) and applies the corresponding data scope strategy for that system. A fallback strategy can be defined for tools that don't match any system [Source 1].

## Key APIs

The primary APIs of this subsystem are the strategy classes that implement the `DataScopeStrategy` interface.

- **[TenantScopeStrategy](../apis/tenant-scope-strategy.md)**: Isolates data in multi-tenant applications by filtering on a tenant ID [Source 1].
- **[OwnershipScopeStrategy](../apis/ownership-scope-strategy.md)**: Restricts data access based on a resource's owner field, with support for manager and admin roles [Source 1].
- **[AttributeScopeStrategy](../apis/attribute-scope-strategy.md)**: A flexible strategy for implementing attribute-based access control (ABAC) through a series of conditional rules [Source 1].
- **[HierarchyScopeStrategy](../apis/hierarchy-scope-strategy.md)**: Scopes data based on a user's position in a hierarchical structure, such as an organization chart [Source 1].
- **[ResolverScopeStrategy](../apis/resolver-scope-strategy.md)**: Uses an external permission resolver to determine data access, allowing integration with existing entitlement systems [Source 1].
- **CompositeScope**: A class for combining multiple strategies, either by merging their results or by applying them in a prioritized order [Source 1].
- **systemAwareScope**: A function that creates a strategy to apply different scoping rules based on the tool being used [Source 1].

## Configuration

Each strategy is configured via a dedicated configuration object passed to its constructor. These configurations define the specific fields, roles, and logic for the strategy.

**TenantScopeStrategy Configuration:**
```typescript
const scope = new TenantScopeStrategy({
  tenantKey: 'tenantId',
  bypassRoles: ['super_admin'],
});
// User with tenantId='acme' → { filters: { tenantId: 'acme' } }
// Super admin → { unrestricted: true }
```
[Source 1]

**AttributeScopeStrategy Configuration:**
```typescript
const scope = new AttributeScopeStrategy({
  rules: [
    {
      condition: (user) => !user.roles?.includes('admin'),
      filters: (user) => ({ department: user.attributes?.department }),
      description: (user) =>
        `Scoped to department ${user.attributes?.department}`,
    },
    {
      condition: (user) => user.attributes?.region !== undefined,
      filters: (user) => ({ region: user.attributes?.region }),
    },
  ],
});
```
[Source 1]

**System-Aware Scoping Configuration:**
This pattern routes scoping to the appropriate strategy based on the tool in use.
```typescript
const scope = systemAwareScope({
  toolSystems: {
    search_confluence: 'confluence',
    query_jira: 'jira',
  },
  scopes: {
    confluence: confluenceScopeStrategy,
    jira: jiraScopeStrategy,
  },
  fallback: tenantScopeStrategy,
});
```
[Source 1]

## Sources

[Source 1]: src/iam/scoping.ts