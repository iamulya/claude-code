---
title: IdentityProvider
summary: An interface for resolving a UserContext from an incoming request, used in server modes.
export_name: IdentityProvider
source_file: src/iam/types.ts
category: interface
entity_type: api
search_terms:
 - user authentication
 - resolve user from request
 - how to get UserContext
 - server mode identity
 - HTTP request authentication
 - WebSocket authentication
 - A2A authentication
 - extract user identity
 - bearer token validation
 - JWT parsing
 - request context to user
 - IAM user resolution
 - AccessPolicy identity
stub: false
compiled_at: 2026-04-24T17:13:01.223Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `IdentityProvider` is an interface within YAAF's Identity and Access Management (IAM) subsystem. Its primary responsibility is to inspect an incoming request and resolve it to a `UserContext` object, which represents the authenticated end-user. This process is fundamental for applying security policies like [Authorization](../concepts/authorization.md) and [Data Scoping](../concepts/data-scoping.md).

This interface is specifically used in server modes, such as [when](./when.md) an agent is exposed via an HTTP, WebSocket, or Agent-to-Agent (A2A) runtime. Implementations typically extract credentials (like a bearer token from an `Authorization` header), validate them, and fetch the corresponding user's profile, roles, and attributes.

An `IdentityProvider` is configured on the agent via the `AccessPolicy` object. If the provider's `resolve` method returns `null`, the request is treated as unauthenticated.

## Signature

The `IdentityProvider` is defined as a TypeScript interface with a `name` property and a `resolve` method.

```typescript
// Source: src/iam/types.ts

export interface IdentityProvider {
  readonly name: string;

  /**
   * Extract user identity from the request context.
   * Returns null if the request is unauthenticated.
   */
  resolve(request: IncomingRequest): Promise<UserContext | null>;
}
```

## Methods & Properties

### name

- **Signature**: `readonly name: string;`
- **Description**: A read-only string that provides a unique name for the identity provider implementation. This is useful for logging and debugging purposes.

### resolve

- **Signature**: `resolve(request: IncomingRequest): Promise<UserContext | null>;`
- **Description**: The core method that processes an incoming request to determine the user's identity.
- **Parameters**:
    - `request`: `IncomingRequest` - An object representing the incoming server request, containing details like headers, body, and query parameters.
- **Returns**: A `Promise` that resolves to:
    - A `UserContext` object if the user is successfully authenticated.
    - `null` if the request is unauthenticated or credentials are not provided.

## Examples

### Implementing a Custom IdentityProvider

This example shows a basic `IdentityProvider` that authenticates a user based on a static bearer token in the `Authorization` header.

```typescript
import { IdentityProvider, UserContext, IncomingRequest } from 'yaaf';

// A placeholder for the actual IncomingRequest type from a YAAF runtime
type MockIncomingRequest = {
  headers: Record<string, string>;
};

class SimpleBearerTokenProvider implements IdentityProvider {
  readonly name = 'SimpleBearerTokenProvider';

  async resolve(request: MockIncomingRequest): Promise<UserContext | null> {
    const authHeader = request.headers['authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // In a real application, you would validate the token against
      // an identity service, decode a JWT, or look up a session.
      if (token === 'secret-token-for-alice') {
        return {
          userId: 'user-123',
          name: 'Alice',
          roles: ['editor', 'support-team'],
          attributes: {
            tenantId: 'acme-corp',
          },
        };
      }
    }

    // If no valid token is found, the request is unauthenticated.
    return null;
  }
}
```

### Configuring the Provider in an AccessPolicy

Once implemented, the `IdentityProvider` is passed to the agent's constructor within the `AccessPolicy` configuration.

```typescript
import { Agent, AccessPolicy } from 'yaaf';

// Assume SimpleBearerTokenProvider is defined as in the previous example
const myIdentityProvider = new SimpleBearerTokenProvider();

const agent = new Agent({
  // ... other agent configuration
  accessPolicy: {
    identityProvider: myIdentityProvider,
    // Other policies like authorization and dataScope would go here
  },
});
```

## See Also

- `AccessPolicy`: The configuration object where an `IdentityProvider` is supplied to an agent.
- `UserContext`: The object representing the authenticated user, which is the output of the `resolve` method.
- `AuthorizationStrategy`: A security component that uses the resolved `UserContext` to make authorization decisions.
- `DataScopeStrategy`: A security component that uses the resolved `UserContext` to determine data access boundaries for [Tools](../subsystems/tools.md).

## Sources

[Source 1] src/iam/types.ts