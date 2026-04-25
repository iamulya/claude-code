---
title: Identity Management
summary: The process of identifying and authenticating the end-user interacting with a YAAF agent, typically in server-based runtimes.
tags:
 - security
 - authentication
entity_type: concept
related_subsystems:
 - iam
search_terms:
 - user authentication
 - how to identify users
 - YAAF security
 - IdentityProvider interface
 - UserContext object
 - get user from request
 - agent authentication
 - server mode security
 - A2A authentication
 - HTTP authentication
 - WebSocket authentication
 - resolve user identity
 - end-user identity
stub: false
compiled_at: 2026-04-24T17:55:49.991Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/types.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Identity Management in YAAF is the process of resolving the identity of an end-user from an incoming request. This is a crucial security function, particularly for agents deployed in server modes such as A2A (Application-to-Application), HTTP, or WebSocket runtimes [Source 1].

The primary goal is to produce a `UserContext` object, which is a standardized representation of the authenticated user. This object encapsulates the user's unique ID, roles, attributes, and credentials. The `UserContext` then becomes the foundation for subsequent security decisions within the framework, such as [Authorization](./authorization.md) and [Data Scoping](./data-scoping.md) [Source 1].

## How It Works in YAAF

The core component of Identity Management is the `IdentityProvider` interface. A developer provides a concrete implementation of this interface to integrate with their existing authentication system (e.g., JWT, OAuth, API keys) [Source 1].

The process is as follows:
1.  An incoming request arrives at the YAAF agent's [Server Runtime](../subsystems/server-runtime.md).
2.  The runtime invokes the `resolve` method of the configured `IdentityProvider`.
3.  The `resolve` method inspects the request context (e.g., HTTP headers, tokens) to authenticate the user.
4.  If authentication is successful, the method returns a `UserContext` object populated with the user's information. If authentication fails or the request is anonymous, it returns `null` [Source 1].

The resulting `UserContext` object is a rich data structure that supports both Role-Based Access Control ([rbac](../apis/rbac.md)) and Attribute-Based Access Control ([abac](../apis/abac.md)). Its key properties include [Source 1]:
*   `userId`: A unique identifier for the user.
*   `name`: An optional display name, primarily for audit logging.
*   `roles`: An array of strings representing the user's roles (e.g., `['editor', 'eng-team']`), used for RBAC.
*   `attributes`: A key-value record of arbitrary user attributes (e.g., `department`, `tenantId`, `clearanceLevel`), used for ABAC.
*   `credentials`: An object containing credentials, such as a bearer token, that can be propagated to downstream [Tools](../subsystems/tools.md) that need to call external APIs on the user's behalf.

This `UserContext` is then passed to other security components, like the `AuthorizationStrategy` and `DataScopeStrategy`, to enforce access policies [Source 1].

## Configuration

Identity Management is configured on an `Agent` instance via the `accessPolicy` property in the constructor. The developer provides an implementation of the `IdentityProvider` interface to the `identityProvider` field within the `AccessPolicy` object [Source 1].

```typescript
import { Agent, AccessPolicy, IdentityProvider, UserContext } from 'yaaf-agent';

// Example: A custom IdentityProvider that reads a JWT from a header.
class JwtIdentityProvider implements IdentityProvider {
  readonly name = 'JwtProvider';

  async resolve(request: IncomingRequest): Promise<UserContext | null> {
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // In a real implementation, you would verify and decode the JWT.
      // const decoded = jwt.verify(token, JWT_SECRET);
      // For this example, we'll return a static user.
      return {
        userId: 'user-from-jwt',
        roles: ['viewer'],
        attributes: { tenantId: 'acme-corp' },
      };
    }
    return null;
  }
}

// Configure the agent with the custom IdentityProvider.
const agent = new Agent({
  tools: [/* ... */],
  accessPolicy: {
    identityProvider: new JwtIdentityProvider(),
    // Other access policy configurations...
    authorization: rbac({ viewer: ['read_*'], admin: ['*'] }),
    dataScope: new TenantScopeStrategy(),
  },
});
```
This configuration ensures that for every request handled by this agent in a server mode, the `JwtIdentityProvider` will be used to determine the identity of the caller [Source 1].

## Sources
[Source 1] src/iam/types.ts