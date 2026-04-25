---
summary: An API for JWT-based identity provision, capable of integrating with a JTI blocklist for token revocation.
export_name: JwtIdentityProvider
source_file: src/iam/jwtIdentityProvider.ts
category: class
title: JwtIdentityProvider
entity_type: api
search_terms:
 - JWT authentication
 - JSON Web Token identity
 - user authentication with JWT
 - how to secure agent API
 - token-based access control
 - JWKS URI configuration
 - JTI blocklist integration
 - token revocation
 - JWT claim mapping
 - createServer identity provider
 - YAAF security
 - user context from token
 - sub claim user ID
stub: false
compiled_at: 2026-04-25T00:08:23.624Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/jtiBlocklist.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/server.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `JwtIdentityProvider` class is an implementation of the [IdentityProvider](./identity-provider.md) interface that authenticates incoming requests using JSON Web Tokens (JWTs). It is a primary mechanism for securing agent APIs created with [createServer](./create-server.md).

This provider validates JWTs against a JSON Web Key Set (JWKS) endpoint, typically provided by an external authentication service. It can be configured to map claims from the JWT payload (such as `sub` for user ID or `groups` for roles) to a `UserContext` object, making user information available to the agent and its authorization policies.

A key feature is its integration with a [JtiBlocklist](./jti-blocklist.md), which enables token revocation. By providing a blocklist instance, the `JwtIdentityProvider` can reject tokens that have been explicitly revoked (e.g., upon user logout), even if they have not yet expired. This provides a critical security layer beyond simple token expiration checks [Source 1].

## Signature / Constructor

The `JwtIdentityProvider` is instantiated with a configuration object.

```typescript
import { JwtIdentityProvider } from 'yaaf';
import type { JtiBlocklist } from 'yaaf';

export interface JwtIdentityProviderConfig {
  /**
   * The URI of the JSON Web Key Set (JWKS) endpoint used to verify
   * the signature of incoming JWTs.
   */
  jwksUri: string;

  /**
   * An optional JTI (JWT ID) blocklist for token revocation.
   * If provided, the provider will check if a token's `jti` claim
   * is in the blocklist and reject it if found.
   */
  jtiBlocklist?: JtiBlocklist;

  /**
   * Optional mapping from JWT claims to UserContext fields.
   * For example, `{ userId: 'sub', roles: 'groups' }` would map the
   * JWT's `sub` claim to `user.id` and the `groups` claim to `user.roles`.
   */
  claims?: {
    userId?: string;
    roles?: string;
    [key: string]: string;
  };
}

export class JwtIdentityProvider implements IdentityProvider {
  constructor(config: JwtIdentityProviderConfig);
}
```

## Examples

### Basic Authentication with `createServer`

This example shows how to secure an agent's HTTP API using `JwtIdentityProvider`. It configures the server to authenticate all requests to the `/chat` endpoint by validating a JWT and mapping its claims.

```typescript
import { Agent, createServer, JwtIdentityProvider } from 'yaaf';

const agent = new Agent({
  systemPrompt: 'You are a helpful assistant.',
});

const server = createServer(agent, {
  port: 3000,
  identityProvider: new JwtIdentityProvider({
    jwksUri: 'https://auth.example.com/.well-known/jwks.json',
    claims: { userId: 'sub', roles: 'groups' },
  }),
});

console.log(`Server listening at ${server.url}`);
```
In this configuration, unauthenticated requests will receive a `401 Unauthorized` response [Source 2].

### Token Revocation with a JTI Blocklist

This example demonstrates how to enable token revocation by integrating `JwtIdentityProvider` with an in-memory [JtiBlocklist](./jti-blocklist.md). When a user logs out, their token's JTI (JWT ID) is added to the blocklist, immediately invalidating it for future requests.

```typescript
import { InMemoryJtiBlocklist, JwtIdentityProvider } from 'yaaf/iam';
import { decodeJwt } from 'some-jwt-library'; // Placeholder for a JWT decoding function

// 1. Create a blocklist instance. For production, use RedisJtiBlocklist.
const blocklist = new InMemoryJtiBlocklist();

// 2. Configure the identity provider with the blocklist.
const idp = new JwtIdentityProvider({
  jwksUri: 'https://auth.example.com/.well-known/jwks.json',
  jtiBlocklist: blocklist, // Revoked tokens will now be rejected
});

// This would be used in createServer(agent, { identityProvider: idp })

// 3. Later, to revoke a token (e.g., in a /logout endpoint):
async function revokeToken(token: string) {
  const { payload } = decodeJwt(token);
  // The token must have 'jti' and 'exp' claims.
  if (payload.jti && payload.exp) {
    // The blocklist uses the expiration time for automatic garbage collection.
    const expiresAtMs = payload.exp * 1000;
    await blocklist.add(payload.jti, expiresAtMs);
    console.log(`Token with JTI ${payload.jti} has been revoked.`);
  }
}
```
[Source 1]

## See Also

- [IdentityProvider](./identity-provider.md): The interface that `JwtIdentityProvider` implements.
- [JtiBlocklist](./jti-blocklist.md): The interface for token revocation lists used by this provider.
- [createServer](./create-server.md): The function for creating an HTTP server where this provider is commonly used for authentication.

## Sources

- [Source 1]: `src/iam/jtiBlocklist.ts`
- [Source 2]: `src/runtime/server.ts`