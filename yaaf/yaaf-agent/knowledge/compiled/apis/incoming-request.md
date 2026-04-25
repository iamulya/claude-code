---
title: IncomingRequest
entity_type: api
summary: Represents the raw, unauthenticated request context from which user identity is extracted by an IdentityProvider.
export_name: IncomingRequest
source_file: src/iam/index.ts
category: type
search_terms:
 - user identity extraction
 - request context
 - unauthenticated request
 - IdentityProvider input
 - user authentication context
 - raw request object
 - how to get user from request
 - access control request
 - security context
 - IAM request
 - http headers
 - authentication token
stub: false
compiled_at: 2026-04-25T00:08:04.488Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/index.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `IncomingRequest` type represents the raw, provider-agnostic context of a request made to an agent before any authentication or authorization has occurred [Source 1]. It serves as the input for an `IdentityProvider`, which is responsible for inspecting the request data (such as HTTP headers, API keys, or other credentials) to identify the user and construct a structured `UserContext`.

This type acts as a generic container, allowing different agent runtimes (e.g., a web server, a CLI, a chat integration) to pass their specific request details to the YAAF Identity and Access Management (IAM) subsystem in a standardized way.

## Signature

`IncomingRequest` is a type alias for a generic object. While the exact definition is not specified in the provided source material, it is conceptually a key-value store, likely `Record<string, any>`, designed to hold arbitrary data from the transport layer.

```typescript
// Conceptual definition
export type IncomingRequest = Record<string, any>;
```

## Examples

An `IdentityProvider` implementation would consume an `IncomingRequest` to extract user credentials. The following example shows a custom provider that looks for an `Authorization` header containing a bearer token.

```typescript
import { IdentityProvider, UserContext, IncomingRequest } from 'yaaf';

// A hypothetical function to validate a token and get user info
async function validateToken(token: string): Promise<{ userId: string; roles: string[] }> {
  // ... logic to validate token and fetch user data
  if (token === 'secret-token-for-alice') {
    return { userId: 'alice', roles: ['editor'] };
  }
  return null;
}

class BearerTokenIdentityProvider implements IdentityProvider {
  async getIdentity(request: IncomingRequest): Promise<UserContext | null> {
    const authHeader = request.headers?.authorization as string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const userInfo = await validateToken(token);
      if (userInfo) {
        return {
          userId: userInfo.userId,
          roles: userInfo.roles,
          attributes: {}, // additional attributes can be populated here
        };
      }
    }

    return null; // No identity could be determined
  }
}
```

## See Also

- `IdentityProvider`: The component that consumes an `IncomingRequest` to produce a `UserContext`.
- [AccessPolicy](./access-policy.md): The configuration that uses the identity derived from an `IncomingRequest` to make authorization decisions.
- `UserContext`: The structured user identity object produced by an `IdentityProvider` from an `IncomingRequest`.

## Sources

[Source 1]: src/iam/index.ts