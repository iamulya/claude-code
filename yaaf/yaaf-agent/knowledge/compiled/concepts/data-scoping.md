---
title: Data Scoping
summary: The process of dynamically filtering data access for tools based on the current user's context and defined strategies.
tags:
 - security
 - data-access
entity_type: concept
related_subsystems:
 - iam
search_terms:
 - data filtering for agents
 - multi-tenant data isolation
 - how to restrict tool data access
 - user-based data filtering
 - row-level security for LLM agents
 - DataScopeStrategy
 - TenantScopeStrategy
 - OwnershipScopeStrategy
 - AttributeScopeStrategy
 - dynamic data filtering
 - context-aware data access
 - YAAF security
 - what data can a tool see
stub: false
compiled_at: 2026-04-24T17:54:15.485Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/types.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Data Scoping is a security mechanism in YAAF that determines what data a tool can access on behalf of a user. It operates downstream from [Authorization](./authorization.md); while authorization decides *if* a tool can be invoked, Data Scoping defines the boundaries of the data that the invoked tool can see or manipulate [Source 1].

The primary purpose of Data Scoping is to enforce data access policies dynamically. This allows agents to operate in multi-tenant environments, respect resource ownership, or apply attribute-based filtering to the data retrieved by [Tools](../subsystems/tools.md). For example, a tool that queries a database can be automatically scoped to only return records belonging to the user's organization or department [Source 1].

## How It Works in YAAF

The core of the Data Scoping mechanism is the `DataScopeStrategy` interface. An implementation of this interface is responsible for resolving a `DataScope` object from the current user's context [Source 1].

The `DataScopeStrategy` interface defines a `resolve` method which returns a `DataScope` object. This `DataScope` object contains the specific filtering rules that tools must apply. Its key properties are [Source 1]:

*   `filters`: A record of key-value pairs that tools use to filter their data access. For example, a tool might interpret `{ tenantId: 'acme-corp' }` as a `WHERE` clause in a SQL query or a filter parameter in an API call.
*   `unrestricted`: A boolean flag. If `true`, it indicates that the tool has unrestricted access and can skip filtering.
*   `strategy`: The name of the strategy that generated the scope, used for logging.
*   `description`: A human-readable summary of the applied scope for audit logs.

YAAF provides several built-in `DataScopeStrategy` implementations to cover common patterns [Source 1]:

*   **`TenantScopeStrategy`**: Enforces multi-tenant data isolation.
*   **`OwnershipScopeStrategy`**: Filters data based on a user's ownership of resources.
*   **`AttributeScopeStrategy`**: Applies filters based on attributes in the user's `UserContext`.
*   **`HierarchyScopeStrategy`**: Scopes data based on an organizational hierarchy.
*   **`ResolverScopeStrategy`**: Works with a `PermissionResolver` to query an external system (like Jira or Confluence) to determine a user's access rights and translates them into data filters.

The resolved `DataScope` is passed to tools through their execution context, making the filtering information available at runtime [Source 1].

## Configuration

Data Scoping is configured on an agent via the `accessPolicy` property in the agent's constructor. A developer provides an instance of a `DataScopeStrategy` to the `dataScope` field within the policy [Source 1].

If the `dataScope` property is not set, the agent defaults to unrestricted data access for all tools [Source 1].

```typescript
// Example: Configuring an agent with a TenantScopeStrategy
const agent = new Agent({
  tools: [...],
  accessPolicy: {
    // Authorization strategy decides IF a tool can be called
    authorization: rbac({ viewer: ['read_*'], admin: ['*'] }),

    // Data Scoping strategy decides WHAT DATA the tool can access
    dataScope: new TenantScopeStrategy(),

    // Audit callback for logging decisions
    onDecision: (event) => auditLog.write(event),
  },
});
```

In this example, the `TenantScopeStrategy` will be used to resolve a `DataScope` for every tool call, ensuring that tools only access data relevant to the current user's tenant [Source 1].

## Sources

[Source 1]: src/iam/types.ts