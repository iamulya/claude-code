---
title: IAM System
summary: The Identity and Access Management (IAM) subsystem in YAAF provides mechanisms for user authentication, authorization, and data scoping for LLM agents.
primary_files:
 - src/iam/types.ts
entity_type: subsystem
exports:
 - UserContext
 - AuthorizationStrategy
 - AuthorizationDecision
 - DataScopeStrategy
 - DataScope
 - PermissionResolver
 - IdentityProvider
 - AccessPolicy
search_terms:
 - user authentication
 - agent authorization
 - RBAC for agents
 - ABAC for agents
 - data scoping
 - multi-tenancy in agents
 - how to secure tools
 - tool access control
 - identity provider integration
 - permission resolver
 - audit logging for agents
 - AccessPolicy configuration
 - UserContext object
 - tenant isolation
stub: false
compiled_at: 2026-04-24T18:13:03.128Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Identity and Access Management (IAM) subsystem provides the core security primitives for YAAF agents. It addresses three fundamental security concerns:

1.  **Authentication**: Identifying the end-user who is making a request.
2.  **[Authorization](../concepts/authorization.md)**: Determining if the identified user is permitted to invoke a specific tool with specific arguments.
3.  **[Data Scoping](../concepts/data-scoping.md)**: Restricting the data that a tool can access, ensuring users only see data they are entitled to, which is critical for multi-tenant and user-specific data filtering [Source 1].

This subsystem enables developers to build secure, production-grade agents that can safely operate on behalf of users with varying levels of permissions.

## Architecture

The IAM subsystem is designed around a set of strategy interfaces and data structures that can be composed to implement complex security policies. The central configuration point is the `AccessPolicy` object [Source 1].

-   **`UserContext`**: A data structure that represents the identity of the end-user making a request. It contains a unique `userId`, optional roles for Role-Based Access Control ([rbac](../apis/rbac.md)), and a flexible `attributes` record for Attribute-Based Access Control ([abac](../apis/abac.md)). It can also carry user credentials for propagation to downstream systems [Source 1].

-   **`IdentityProvider`**: An interface responsible for authentication. Its `resolve` method takes an incoming request and returns a `UserContext`. This is primarily used in server modes (e.g., HTTP, WebSocket) to translate request headers or tokens into a verified user identity [Source 1].

-   **`AuthorizationStrategy`**: An interface that decides whether a user is allowed to perform an action, such as calling a tool. Its `evaluate` method returns an `AuthorizationDecision` of `allow`, `deny`, or `abstain`. The `abstain` decision allows for chaining multiple strategies together. Implementations can support RBAC (e.g., `RoleStrategy`) or ABAC (e.g., `AttributeStrategy`) [Source 1].

-   **`DataScopeStrategy`**: An interface that determines the data visibility for a given request. Its `resolve` method produces a `DataScope` object, which contains filters that [Tools](./tools.md) must apply to their queries. This is the primary mechanism for implementing multi-tenancy and resource-based permissions. Examples include strategies for tenant isolation, resource ownership, or organizational hierarchy [Source 1].

-   **`PermissionResolver`**: An interface for querying external systems (like Jira, Confluence, or Google Drive) to determine a user's access rights to specific resources. The results from a `PermissionResolver` are typically used by a `DataScopeStrategy` to construct the appropriate data filters [Source 1].

## Integration Points

The IAM subsystem is integrated into the agent's core execution loop via the `AccessPolicy` configuration object.

-   **Agent Runtimes**: Server-based runtimes (A2A, HTTP, WebSocket) use the configured `IdentityProvider` to authenticate incoming requests and establish a `UserContext` [Source 1].
-   **[Agent Core](./agent-core.md)**: Before executing a tool, the agent core invokes the `authorization` strategy from the `AccessPolicy`. If the decision is `deny`, the tool call is blocked.
-   **[Tool Execution](../concepts/tool-execution.md) Context**: The agent core calls the `dataScope` strategy to generate a `DataScope`. This scope is then passed to the tool's execution context, making it available for the tool to use [when](../apis/when.md) filtering database queries or API calls [Source 1].

## Key APIs

The primary public APIs of the IAM subsystem are the interfaces and types used for configuration and extension.

-   **`AccessPolicy`**: The main configuration object for the IAM system. It combines authorization, data scoping, identity provision, and an audit callback into a single structure passed to the agent constructor [Source 1].
-   **`UserContext`**: Represents the authenticated user. It is the central object carrying identity information, roles, and attributes used by other IAM components [Source 1].
-   **`AuthorizationStrategy`**: The interface for implementing authorization logic. Developers can create custom strategies to enforce access control rules [Source 1].
-   **`DataScopeStrategy`**: The interface for implementing data filtering logic. Custom implementations can enforce data isolation based on tenancy, ownership, or other business rules [Source 1].
-   **`DataScope`**: The output of a `DataScopeStrategy`. It contains a set of filters that tools must apply to their data access operations [Source 1].
-   **`IdentityProvider`**: The interface for integrating with authentication systems. Implementations can extract user identity from various request formats (e.g., JWT tokens, API keys) [Source 1].
-   **`PermissionResolver`**: The interface for querying external permission systems. This allows data scoping to be based on dynamic, externally managed access rights [Source 1].

## Configuration

The IAM subsystem is configured by passing an `AccessPolicy` object to the `Agent` constructor. This object specifies the strategies for authorization and data scoping, an optional identity provider, and an audit callback [Source 1].

If no `AccessPolicy` is provided, the agent defaults to allowing all [Tool Calls](../concepts/tool-calls.md) and applying no data scoping [Source 1].

```typescript
const agent = new Agent({
  tools: [...],
  accessPolicy: {
    // Decides if a tool call is allowed.
    authorization: rbac({ viewer: ['read_*'], admin: ['*'] }),

    // Determines what data tools can access.
    dataScope: new TenantScopeStrategy(),

    // Audit callback for logging decisions.
    onDecision: (event) => auditLog.write(event),
  },
});
```
[Source 1]

## Extension Points

The IAM subsystem is highly extensible through its strategy-based design. Developers can provide their own implementations for the core interfaces to integrate with existing security infrastructure or define custom logic.

-   **Custom `AuthorizationStrategy`**: Implement this interface to create custom RBAC, ABAC, or other authorization models. The source material notes the existence of `RoleStrategy`, `AttributeStrategy`, and `CompositeStrategy` as potential implementations [Source 1].
-   **Custom `DataScopeStrategy`**: Implement this interface to enforce specific data filtering rules. The source mentions `TenantScopeStrategy`, `OwnershipScopeStrategy`, `AttributeScopeStrategy`, `HierarchyScopeStrategy`, and `ResolverScopeStrategy` as examples [Source 1].
-   **Custom `IdentityProvider`**: Implement this interface to integrate with different authentication mechanisms, such as OAuth 2.0, SAML, or custom token formats.
-   **Custom `PermissionResolver`**: Implement this interface to connect to proprietary or unsupported external systems to fetch user permissions.

## Sources

[Source 1]: src/iam/types.ts