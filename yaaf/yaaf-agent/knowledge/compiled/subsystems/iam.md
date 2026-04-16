---
title: IAM Subsystem
entity_type: subsystem
summary: Manages identity, authentication, and authorization for agents and tool execution.
primary_files:
  - src/iam/authorization.ts
  - src/iam/index.ts
  - src/iam/types.ts
exports:
  - UserContext
  - AuthorizationStrategy
  - DataScopeStrategy
  - PermissionResolver
  - IdentityProvider
  - AccessPolicy
  - RoleStrategy
  - AttributeStrategy
  - CompositeStrategy
stub: false
compiled_at: 2026-04-16T14:18:48.771Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/authorization.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/types.ts
confidence: 1
---

## Purpose
The IAM (Identity and Access Management) subsystem provides production-grade security for YAAF agents. It ensures that LLM-powered agents operate within defined security boundaries by managing who the user is, what tools they are permitted to invoke, and what specific data subsets those tools are allowed to access.

The subsystem is designed to solve the "confused deputy" problem and prevent unauthorized tool execution or data leakage in multi-tenant or multi-user environments.

## Architecture
The IAM subsystem is structured into three distinct layers that work together to secure agent interactions:

1.  **Identity Layer**: Resolves the `UserContext` from incoming requests. It identifies the user's ID, roles, and arbitrary attributes (e.g., department, tenant ID).
2.  **Authorization Layer**: Determines if a user is permitted to call a specific tool with a given set of arguments. This layer supports Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC).
3.  **Data Scoping Layer**: Provides tools with filters or constraints to ensure they only interact with data the user is authorized to see (e.g., filtering database queries by `tenantId`).

### Key Components

| Component | Description |
| :--- | :--- |
| `UserContext` | A data structure carrying user identity, roles, attributes, and credentials for downstream propagation. |
| `AuthorizationStrategy` | An interface for evaluating whether a tool call should proceed, be denied, or be deferred (abstain). |
| `DataScopeStrategy` | An interface that resolves a `DataScope` (a set of filters) based on the user context. |
| `PermissionResolver` | An interface for querying external systems (e.g., Jira, Confluence, Google Drive) to discover user permissions. |
| `IdentityProvider` | Extracts `UserContext` from raw requests in server-side runtimes (HTTP, WebSocket). |
| `AccessPolicy` | A unified configuration object that combines authorization, scoping, and auditing. |

## Key APIs

### Authorization Strategies
The subsystem provides three primary strategies for tool-level authorization:

*   **`RoleStrategy`**: Implements classic RBAC. It maps roles to allowed or denied tool patterns using glob syntax (e.g., `search_*`).
*   **`AttributeStrategy`**: Implements ABAC. It uses predicates to evaluate the `UserContext` and tool arguments. This allows for content-aware rules, such as "Contractors cannot use delete tools" or "Users can only write to resources in their own region."
*   **`CompositeStrategy`**: Allows developers to combine multiple strategies using `allOf` (intersection), `anyOf` (union), or `firstMatch` (priority-based) semantics.

### Convenience Factories
The framework exports functional wrappers for rapid configuration:
*   `rbac(roles, options)`: Quickly defines role-to-tool mappings.
*   `abac(rules, options)`: Defines a list of attribute-based rules.
*   `when(condition)`: A fluent builder for creating `AttributeRule` objects.

### Data Scoping
`DataScopeStrategy` implementations produce a `DataScope` object containing filters. Tools receive this scope via their execution context and are expected to apply these filters to their underlying data operations (e.g., SQL `WHERE` clauses or API query parameters).

## Configuration
The IAM subsystem is configured via the `accessPolicy` property in the `Agent` configuration.

```typescript
import { Agent, rbac, TenantScopeStrategy } from 'yaaf';

const agent = new Agent({
  tools: [...],
  accessPolicy: {
    // Tool-level security
    authorization: rbac({
      viewer: ['read_*', 'search_*'],
      admin: ['*'],
    }),
    // Data-level security
    dataScope: new TenantScopeStrategy(),
    // Audit logging
    onDecision: (event) => {
      console.log(`User ${event.user.userId} attempted ${event.tool}: ${event.action}`);
    },
  },
});
```

## Extension Points
Developers can extend the IAM subsystem by implementing the following interfaces:

*   **Custom `AuthorizationStrategy`**: To implement proprietary logic or integrate with external authorization engines (e.g., OPA).
*   **Custom `DataScopeStrategy`**: To implement complex data isolation logic, such as organizational hierarchies or resource ownership.
*   **`PermissionResolver`**: To allow the agent to "learn" what a user can access in third-party SaaS platforms before executing tools.
*   **`IdentityProvider`**: To integrate with specific authentication providers (e.g., Auth0, Firebase, or custom JWT implementations).