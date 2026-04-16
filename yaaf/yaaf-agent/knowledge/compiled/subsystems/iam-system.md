---
title: IAM System
entity_type: subsystem
summary: Manages identity, authentication, and data access control within the YAAF framework.
primary_files:
  - src/iam/scoping.ts
exports:
  - TenantScopeStrategy
  - OwnershipScopeStrategy
  - AttributeScopeStrategy
  - HierarchyScopeStrategy
  - ResolverScopeStrategy
  - CompositeScope
  - systemAwareScope
stub: false
compiled_at: 2026-04-16T14:19:19.834Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/scoping.ts
confidence: 0.95
---

## Purpose
The IAM (Identity and Access Management) system in YAAF is responsible for managing identity and data access control. Its primary function is **Data Scoping**, which determines what specific data a tool is permitted to access during execution. This is distinct from execution authorization; while other systems may determine *whether* a tool can be called, the IAM system defines the boundaries of the data the tool can interact with based on the current user context.

## Architecture
The IAM system is built around a strategy-based architecture. It utilizes the `DataScopeStrategy` interface to implement various methods of data isolation and filtering. These strategies ingest a `UserContext` and produce filters or scope definitions that tools apply to their data queries.

### Data Scoping Strategies
The framework provides several built-in strategies to handle common access control patterns:

*   **Tenant Isolation**: Filters data based on a tenant identifier, essential for multi-tenant SaaS applications.
*   **Ownership Filtering**: Restricts access to resources owned by the user or their immediate team.
*   **Attribute-Based Access Control (ABAC)**: Uses arbitrary user attributes to define complex, rule-based filtering.
*   **Hierarchical Access**: Manages access based on organizational structures (e.g., managers viewing reports' data).
*   **External Resolution**: Delegates scoping logic to external permission providers or services.

## Key APIs
The IAM subsystem exports several classes and utility functions to manage data scoping:

### Strategies
*   `TenantScopeStrategy`: Implements multi-tenant isolation.
*   `OwnershipScopeStrategy`: Implements user and team-based resource filtering.
*   `AttributeScopeStrategy`: Provides a flexible, rule-based approach to scoping using user attributes.
*   `HierarchyScopeStrategy`: Resolves access based on a tree or org-chart structure.
*   `ResolverScopeStrategy`: Interfaces with an external `PermissionResolver` to determine scope.
*   `CompositeScope`: A utility class used to merge multiple strategies or select the first matching strategy.

### Utilities
*   `systemAwareScope(config)`: A routing function that maps specific tools (using glob patterns) to different scoping strategies based on the backing system the tool interacts with.

## Configuration
Strategies are configured using specific configuration objects passed during instantiation.

### Tenant Scoping
Configured via `TenantScopeConfig`, allowing customization of the tenant key and roles that can bypass isolation.
```ts
const scope = new TenantScopeStrategy({
  tenantKey: 'tenantId',
  bypassRoles: ['super_admin'],
})
```

### Ownership Scoping
Configured via `OwnershipScopeConfig` to define owner fields, team fields, and administrative bypass roles.
```ts
const scope = new OwnershipScopeStrategy({
  ownerField: 'createdBy',
  managerRoles: ['team_lead', 'admin'],
  teamField: 'teamId',
})
```

### Attribute Scoping
Uses `AttributeScopeConfig` containing an array of `AttributeScopeRule` objects. Each rule defines a condition and the resulting filters.
```ts
const scope = new AttributeScopeStrategy({
  rules: [
    {
      condition: (user) => !user.roles?.includes('admin'),
      filters: (user) => ({ department: user.attributes?.department }),
    },
  ],
})
```

## Extension Points
The IAM system is designed for extensibility through two primary mechanisms:

1.  **Composite Strategies**: Developers can use `CompositeScope` to combine existing strategies. The `merge` mode runs all strategies and deep-merges their filters, while `firstMatch` uses the first strategy that returns a non-empty scope.
2.  **External Resolvers**: The `ResolverScopeStrategy` allows the framework to integrate with third-party permission systems (e.g., Jira, Confluence, or custom internal APIs). It supports caching via `ttl` and `maxEntries` settings to optimize performance.
3.  **System-Aware Routing**: Using `systemAwareScope`, developers can define different scoping logic for different tools within the same agent, allowing for granular control across heterogeneous data sources.