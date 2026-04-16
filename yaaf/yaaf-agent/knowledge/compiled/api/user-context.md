---
summary: Represents the identity, roles, and attributes of the end-user making a request through the agent.
export_name: UserContext
source_file: src/iam/types.ts
category: type
title: UserContext
entity_type: api
stub: false
compiled_at: 2026-04-16T14:19:46.833Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/types.ts
confidence: 1
---

## Overview
`UserContext` is a core data structure in the YAAF Identity and Access Management (IAM) system. It represents the identity of the end-user interacting with an agent and serves as the primary input for authorization and data scoping decisions.

The structure is designed to support multiple access control paradigms simultaneously:
- **Role-Based Access Control (RBAC)**: Via the `roles` property, which is consumed by role-based strategies.
- **Attribute-Based Access Control (ABAC)**: Via the `attributes` property, which allows for fine-grained rules based on user metadata (e.g., department, region, or clearance level).

In server-side runtimes (A2A, HTTP, or WebSocket), a `UserContext` is typically produced by an `IdentityProvider` which extracts identity information from incoming request headers or tokens.

## Signature / Constructor

```typescript
export type UserContext = {
  userId: string
  name?: string
  roles?: string[]
  attributes?: Record<string, unknown>
  credentials?: UserCredentials
}
```

## Methods & Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `userId` | `string` | **Required.** A unique identifier for the user. |
| `name` | `string` | *Optional.* A human-readable display name, primarily used for audit logging rather than authorization logic. |
| `roles` | `string[]` | *Optional.* A list of roles assigned to the user. These are used by role-based authorization strategies. |
| `attributes` | `Record<string, unknown>` | *Optional.* A dictionary of open-ended attributes used for Attribute-Based Access Control (ABAC). Common examples include `tenantId`, `department`, or `region`. |
| `credentials` | `UserCredentials` | *Optional.* Security tokens or credentials intended for downstream propagation when tools need to call external APIs on the user's behalf. |

## Examples

### Defining a User Context
This example demonstrates a user with both roles and specific attributes for a multi-tenant, department-aware application.

```typescript
const user: UserContext = {
  userId: 'alice-123',
  name: 'Alice Chen',
  roles: ['editor', 'eng-team'],
  attributes: {
    department: 'engineering',
    tenantId: 'acme-corp',
    region: 'eu-west',
    clearanceLevel: 'confidential',
    isContractor: false,
  },
  credentials: {
    type: 'bearer',
    token: 'eyJ...',
    scopes: ['confluence:read', 'jira:read'],
  },
}
```

## See Also
- `IdentityProvider`: The interface responsible for resolving `UserContext` from requests.
- `AccessPolicy`: The configuration surface where `UserContext` is evaluated against security rules.
- `AuthorizationStrategy`: The logic that uses `UserContext` to permit or deny tool execution.