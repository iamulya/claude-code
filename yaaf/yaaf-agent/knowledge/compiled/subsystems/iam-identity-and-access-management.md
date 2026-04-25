---
summary: Provides production-grade authorization and data scoping capabilities for YAAF agents.
primary_files:
 - src/iam/index.ts
 - src/iam/types.ts
 - src/iam/jtiBlocklist.ts
title: IAM (Identity and Access Management)
entity_type: subsystem
exports:
 - AccessPolicy
 - AuthorizationStrategy
 - DataScopeStrategy
 - IdentityProvider
 - PermissionResolver
 - UserContext
 - JtiBlocklist
 - InMemoryJtiBlocklist
 - RedisJtiBlocklist
search_terms:
 - agent authorization
 - user permissions for agents
 - how to secure agent tools
 - RBAC for LLM agents
 - ABAC for LLM agents
 - data scoping for multi-tenant agents
 - JWT revocation
 - JTI blocklist
 - tenant data isolation
 - user context management
 - access control policies
 - YAAF security
 - agent identity provider
stub: false
compiled_at: 2026-04-25T00:28:45.794Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/jtiBlocklist.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Identity and Access Management (IAM) subsystem provides a comprehensive framework for securing YAAF agents in production environments [Source 1]. It addresses three fundamental security concerns: establishing user identity, authorizing actions, and scoping data access. This allows developers to build multi-tenant agents that respect user permissions and data boundaries [Source 1].

The subsystem is structured into three distinct layers [Source 1]:
1.  **Identity**: Determines who the user is. This is handled by an [IdentityProvider](../apis/identity-provider.md) which produces a [UserContext](../apis/user-context.md).
2.  **Authorization**: Determines if the user is allowed to perform a specific action, such as calling a tool. This is managed by an [AuthorizationStrategy](../apis/authorization-strategy.md), with support for models like Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC).
3.  **Data Scoping**: Filters or modifies the data an agent can access or return, ensuring users only see what they are permitted to see. This is implemented via a [DataScopeStrategy](../apis/data-scope-strategy.md).

## Architecture

The IAM subsystem is composed of several key interfaces and concrete implementations that work together to enforce security policies.

**Core Components:**

*   **[AccessPolicy](../apis/access-policy.md)**: This is the primary configuration surface that unifies the identity, authorization, and data scoping layers. It is passed to an agent during its initialization [Source 1].
*   **[IdentityProvider](../apis/identity-provider.md)**: Responsible for authenticating an incoming request and resolving it to a [UserContext](../apis/user-context.md). A common implementation is `JwtIdentityProvider`, which can be configured with a JTI blocklist for token revocation [Source 2].
*   **[UserContext](../apis/user-context.md)**: An object representing the authenticated user, containing their ID, roles, and other attributes used for making access decisions [Source 1].
*   **[AuthorizationStrategy](../apis/authorization-strategy.md)**: An interface for implementing authorization logic. YAAF provides built-in helpers for common patterns like [rbac](../apis/rbac.md) and [abac](../apis/abac.md) [Source 1]. The [CompositeStrategy](../apis/composite-strategy.md) allows for combining multiple strategies, such as checking an ABAC policy first and falling back to an RBAC policy [Source 1].
*   **[DataScopeStrategy](../apis/data-scope-strategy.md)**: An interface for implementing data scoping logic. An example is `TenantScopeStrategy`, which can restrict data access based on a `tenantId` attribute in the [UserContext](../apis/user-context.md) [Source 1].
*   **[PermissionResolver](../apis/permission-resolver.md)**: An optional component that allows the agent to query external systems (like Jira or Confluence) for fine-grained permissions at runtime [Source 1].

**JWT Revocation:**

For security, particularly in scenarios involving JWTs, the IAM subsystem includes a JTI (JWT ID) blocklisting mechanism to prevent the use of revoked tokens before their expiration time [Source 2]. Two implementations are provided:
*   `InMemoryJtiBlocklist`: A simple, zero-dependency implementation suitable for single-process deployments. It automatically garbage-collects expired entries but does not persist across restarts [Source 2].
*   `RedisJtiBlocklist`: A more robust implementation that uses Redis for storage. It is suitable for multi-instance deployments as it persists across restarts and can be shared by a cluster of agents. It requires `ioredis` as a peer dependency [Source 2].

## Integration Points

The IAM subsystem integrates with the [Agent Core](./agent-core.md) primarily through the `accessPolicy` property in the `Agent` constructor. When an agent receives a request, it uses the configured [IdentityProvider](../apis/identity-provider.md) to establish the user's identity. Before executing a tool, the [Agent Core](./agent-core.md) consults the [AuthorizationStrategy](../apis/authorization-strategy.md) to verify the user has the necessary permissions. Similarly, the [DataScopeStrategy](../apis/data-scope-strategy.md) is applied to filter data before it is returned to the user.

## Key APIs

*   **[AccessPolicy](../apis/access-policy.md)**: The main configuration object for an agent's security policies.
*   **[AuthorizationStrategy](../apis/authorization-strategy.md)**: The core interface for deciding if an action is permitted.
*   **[DataScopeStrategy](../apis/data-scope-strategy.md)**: The core interface for filtering and scoping data.
*   **[IdentityProvider](../apis/identity-provider.md)**: The interface for establishing a user's identity from a request.
*   **[UserContext](../apis/user-context.md)**: Represents the authenticated user and their attributes.
*   **[PermissionResolver](../apis/permission-resolver.md)**: Interface for querying external permission systems.
*   **[rbac](../apis/rbac.md)**: A helper function to create a Role-Based Access Control strategy.
*   **[abac](../apis/abac.md)**: A helper function to create an Attribute-Based Access Control strategy.
*   **[when](../apis/when.md)**: A utility used with [abac](../apis/abac.md) to define conditional rules.
*   **[CompositeStrategy](../apis/composite-strategy.md)**: A strategy that combines multiple other authorization strategies.
*   **`JtiBlocklist`**: The interface for JWT revocation lists.
*   **`InMemoryJtiBlocklist`**: An in-memory implementation of `JtiBlocklist`.
*   **`RedisJtiBlocklist`**: A Redis-backed implementation of `JtiBlocklist`.

## Configuration

The IAM subsystem is configured by passing an [AccessPolicy](../apis/access-policy.md) object to the `Agent` constructor.

**Example: Simple RBAC Configuration**
This example configures an agent with three roles: `viewer`, `editor`, and `admin`, each with a set of allowed tool call patterns [Source 1].

```typescript
import { Agent, rbac } from 'yaaf';

const agent = new Agent({
  tools: [/* ... */],
  accessPolicy: {
    authorization: rbac({
      viewer: ['search_*', 'read_*'],
      editor: ['search_*', 'read_*', 'write_*'],
      admin: ['*'], // Wildcard for all tools
    }),
  },
});
```

**Example: Advanced ABAC and Data Scoping**
This example demonstrates a more complex policy that combines ABAC and RBAC for authorization, along with tenant-based data scoping [Source 1].

```typescript
import { Agent, abac, when, CompositeStrategy, TenantScopeStrategy } from 'yaaf';

const agent = new Agent({
  accessPolicy: {
    authorization: CompositeStrategy.firstMatch([
      abac([
        when((u) => u.attributes?.isContractor).deny('delete_*', 'Contractors cannot delete'),
        when((u) => u.attributes?.department === 'finance').allow('query_invoices'),
      ]),
      rbac({ viewer: ['read_*'], admin: ['*'] }), // Fallback RBAC
    ]),
    dataScope: new TenantScopeStrategy({ bypassRoles: ['super_admin'] }),
  },
});

// Example run with a user context
await agent.run('Show me invoices', {
  user: { userId: 'alice', roles: ['viewer'], attributes: { tenantId: 'acme' } },
});
```

## Extension Points

The IAM subsystem is designed to be extensible. Developers can provide their own custom implementations for the core interfaces to integrate with existing authentication and authorization systems:
*   **Custom [AuthorizationStrategy](../apis/authorization-strategy.md)**: Implement this interface to connect to a proprietary permissions service or to enforce complex, domain-specific authorization logic.
*   **Custom [DataScopeStrategy](../apis/data-scope-strategy.md)**: Create custom data scoping rules beyond simple tenancy, such as those based on organizational hierarchy or resource ownership.
*   **Custom [IdentityProvider](../apis/identity-provider.md)**: Implement this to support authentication methods other than JWT, such as API keys, OAuth, or SAML.
*   **Custom [PermissionResolver](../apis/permission-resolver.md)**: Write a resolver to fetch user permissions from third-party applications like Salesforce, GitHub, or internal databases.

## Sources

[Source 1]: src/iam/index.ts
[Source 2]: src/iam/jtiBlocklist.ts