---
summary: Interface for extracting and resolving UserContext from incoming requests in server environments.
export_name: IdentityProvider
source_file: src/iam/types.ts
category: interface
title: IdentityProvider
entity_type: api
stub: false
compiled_at: 2026-04-16T14:20:11.722Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/iam/types.ts
confidence: 1
---

## Overview
`IdentityProvider` is an interface used to resolve a user's identity from an incoming request. It serves as the entry point for the Identity and Access Management (IAM) system in server-side runtimes, such as Agent-to-Agent (A2A), HTTP, or WebSocket modes. 

The provider is responsible for extracting credentials (such as tokens or headers) from the request and transforming them into a `UserContext`. This context is subsequently used by authorization and data scoping strategies to enforce security policies. If a request cannot be authenticated, the provider returns `null`.

## Signature
```typescript
export interface IdentityProvider {
  readonly name: string

  /**
   * Extract user identity from the request context.
   * Returns null if the request is unauthenticated.
   */
  resolve(request: IncomingRequest): Promise<UserContext | null>
}
```

## Methods & Properties
- **name**: A read-only string identifying the provider implementation.
- **resolve(request)**: An asynchronous method that processes an `IncomingRequest`. It returns a `Promise` resolving to a `UserContext` object if authentication is successful, or `null` if the identity cannot be determined.

## Examples

### Implementing a Bearer Token Provider
This example demonstrates a basic implementation that extracts a JWT from an authorization header.

```typescript
import { IdentityProvider, UserContext, IncomingRequest } from 'yaaf';

export class JwtIdentityProvider implements IdentityProvider {
  readonly name = 'jwt-auth';

  async resolve(request: IncomingRequest): Promise<UserContext | null> {
    const authHeader = request.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // In a real implementation, verify the token here
      const payload = await verifyToken(token); 
      
      return {
        userId: payload.sub,
        name: payload.name,
        roles: payload.roles,
        attributes: {
          tenantId: payload.tid,
          region: payload.region
        },
        credentials: {
          type: 'bearer',
          token: token
        }
      };
    } catch (error) {
      return null;
    }
  }
}
```

### Usage in AccessPolicy
The `IdentityProvider` is registered within the `AccessPolicy` configuration of an agent.

```typescript
const agent = new Agent({
  accessPolicy: {
    identityProvider: new JwtIdentityProvider(),
    // ... other policy settings
  }
});
```

## See Also
- `UserContext`
- `AccessPolicy`
- `AuthorizationStrategy`