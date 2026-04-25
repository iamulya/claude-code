---
summary: Defines the identity of the end-user making a request through the agent, including roles, attributes, and credentials.
export_name: UserContext
source_file: src/iam/types.ts
category: type
title: UserContext
entity_type: api
search_terms:
 - user identity
 - end-user information
 - request context
 - RBAC user roles
 - ABAC user attributes
 - user credentials
 - authorization context
 - who is making the request
 - user session data
 - propagating user identity
 - access control subject
 - security principal
stub: false
compiled_at: 2026-04-24T17:46:52.846Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/authorization.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `UserContext` type is a data structure that represents the identity of the end-user making a request to the agent [Source 2]. It serves as the primary input for the YAAF Identity and Access Management (IAM) subsystem, providing the necessary information for both [Authorization](../concepts/authorization.md) and [Data Scoping](../concepts/data-scoping.md) decisions [Source 1, Source 2].

This object encapsulates all relevant information about the user, including a unique identifier, roles for Role-Based Access Control ([rbac](./rbac.md)), arbitrary key-value attributes for Attribute-Based Access Control ([abac](./abac.md)), and credentials for propagation to downstream services [Source 2].

In server-based runtimes, an `IdentityProvider` is responsible for resolving an incoming request into a `UserContext` object. This context is then passed to authorization strategies like `RoleStrategy` and `AttributeStrategy` to determine if a user is permitted to execute a given tool [Source 1, Source 2].

## Signature

The `UserContext` is a TypeScript type alias with the following structure [Source 2]:

```typescript
export type UserContext = {
  /** Unique user identifier */
  userId: string;

  /** Display name (for audit logs, not authorization) */
  name?: string;

  /**
   * Roles — used by RoleStrategy.
   * Can also be treated as the attribute `roles` in ABAC.
   */
  roles?: string[];

  /**
   * Open-ended attributes — the core of ABAC.
   *
   * Examples:
   * - `department: 'engineering'`
   * - `clearanceLevel: 'top-secret'`
   * - `tenantId: 'acme-corp'`
   * - `region: 'eu-west'`
   * - `subscription: 'enterprise'`
   * - `teamId: 'platform-team'`
   * - `isContractor: true`
   */
  attributes?: Record<string, unknown>;

  /**
   * Credentials for downstream propagation.
   * Used by [[[[[[[[Tools]]]]]]]] that call external APIs on behalf of the user.
   */
  credentials?: UserCredentials; // Note: UserCredentials type is not detailed in provided sources.
};
```

## Examples

### Comprehensive UserContext

A typical `UserContext` object for a user with multiple roles, attributes, and credentials for downstream API calls [Source 2].

```typescript
import type { UserContext } from 'yaaf';

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
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    scopes: ['confluence:read', 'jira:read'],
  },
};
```

### Minimal UserContext for RBAC

A minimal `UserContext` for a system that only uses Role-Based Access Control (RBAC) [Source 2].

```typescript
import type { UserContext } from 'yaaf';

const viewerUser: UserContext = {
  userId: 'bob-456',
  name: 'Bob Smith',
  roles: ['viewer'],
};
```

### Minimal UserContext for ABAC

A minimal `UserContext` for a system that only uses Attribute-Based Access Control (ABAC) [Source 1, Source 2].

```typescript
import type { UserContext } from 'yaaf';

const contractorUser: UserContext = {
  userId: 'carol-789',
  name: 'Carol Day',
  attributes: {
    isContractor: true,
    tenantId: 'acme-corp',
  },
};
```

## See Also

The `UserContext` object is a core component used by several other parts of the YAAF IAM subsystem:
- **`IdentityProvider`**: An interface for services that resolve an incoming request into a `UserContext`.
- **`AuthorizationStrategy`**: The interface for strategies (like `RoleStrategy` and `AttributeStrategy`) that consume a `UserContext` to make access decisions.
- **`DataScopeStrategy`**: The interface for strategies that use the `UserContext` to determine data visibility for Tools.
- **`PermissionResolver`**: An interface for services that query external systems for a user's permissions, taking a `UserContext` as input.

## Sources

- [Source 1] src/iam/authorization.ts
- [Source 2] src/iam/types.ts