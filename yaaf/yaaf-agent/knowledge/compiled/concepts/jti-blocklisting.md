---
title: JTI Blocklisting
entity_type: concept
summary: A mechanism for revoking JWTs before their natural expiration by maintaining a blocklist of JWT IDs (JTIs).
related_subsystems:
 - iam
search_terms:
 - JWT revocation
 - how to invalidate a JWT
 - token blocklist
 - JWT ID
 - jti claim
 - stateless token revocation
 - InMemoryJtiBlocklist
 - RedisJtiBlocklist
 - preventing JWT replay
 - session invalidation with JWT
 - logout with JWT
 - YAAF authentication
 - secure token handling
stub: false
compiled_at: 2026-04-24T17:56:40.911Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/jtiBlocklist.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

JTI Blocklisting is a security mechanism in YAAF for revoking JSON Web Tokens (JWTs) before their scheduled expiration time. JWTs are inherently stateless, meaning a token remains valid until its `exp` (expiration) claim is reached. This poses a challenge for scenarios like user logout or session invalidation, where a token needs to be immediately invalidated. JTI Blocklisting solves this by maintaining a list of revoked JWT IDs (`jti` claims), ensuring that even unexpired but revoked tokens are rejected by the system [Source 1].

## How It Works in YAAF

The JTI Blocklisting mechanism is integrated into YAAF's identity and access management subsystem. The `JwtIdentityProvider` can be configured with a blocklist implementation. [when](../apis/when.md) validating an incoming JWT, the provider checks if the token contains a `jti` claim. If it does, the provider queries the configured blocklist to see if that `jti` has been registered as revoked. If the `jti` is found on the blocklist, the token is rejected, regardless of its signature or expiration status [Source 1].

To prevent the blocklist from growing indefinitely, entries are added with an expiration time that matches the original token's `exp` claim. This allows for automatic garbage collection of `jti`s for tokens that are already expired [Source 1].

YAAF provides a `JtiBlocklist` interface with two primary methods [Source 1]:
*   `add(jti: string, expiresAt: number)`: Adds a JWT ID to the blocklist.
*   `has(jti: string)`: Checks if a JWT ID is currently on the blocklist.

Two concrete implementations are available [Source 1]:

*   **`In[[[[[[[[Memory]]]]]]]]JtiBlocklist`**: A simple, zero-dependency implementation that stores the blocklist in Memory. It is suitable for single-process deployments but does not persist across application restarts.
*   **`RedisJtiBlocklist`**: A robust implementation backed by a Redis server. It is designed for multi-process or clustered deployments, as it provides a shared, persistent blocklist that survives restarts. This implementation requires the `ioredis` package as a peer dependency.

## Configuration

A JTI blocklist is configured by instantiating one of the implementations and passing it to the `JwtIdentityProvider` during its construction [Source 1].

### In-Memory Blocklist

This example demonstrates setting up an in-memory blocklist and using it to revoke a token.

```typescript
import { InMemoryJtiBlocklist } from 'yaaf/iam'
import { JwtIdentityProvider } from 'yaaf/iam'

// 1. Create a blocklist instance.
const blocklist = new InMemoryJtiBlocklist()

// 2. Configure the identity provider to use the blocklist.
const idp = new JwtIdentityProvider({
  jwksUri: 'https://auth.example.com/.well-known/jwks.json',
  JtiBlocklist: blocklist, // revoked tokens will now be rejected
})

// 3. To revoke a token (e.g., on logout):
// Assume 'token' is the JWT string.
const { payload } = decodeJwt(token)
if (payload.jti && payload.exp) {
  // Add the JTI to the blocklist with its original expiry time for GC.
  await blocklist.add(payload.jti, payload.exp * 1000)
}
```
[Source 1]

### Redis Blocklist

For production environments with multiple application instances, the `RedisJtiBlocklist` is recommended.

```typescript
import Redis from 'ioredis'
import { RedisJtiBlocklist } from 'yaaf/iam'

// 1. Connect to your Redis instance.
const redis = new Redis({ host: 'localhost', port: 6379 })

// 2. Create the blocklist instance with the Redis client.
const blocklist = new RedisJtiBlocklist(redis)

// 3. Configure the identity provider.
const idp = new JwtIdentityProvider({
  jwksUri: 'https://auth.example.com/.well-known/jwks.json',
  JtiBlocklist: blocklist,
})
```
[Source 1]

## Sources
[Source 1]: src/iam/[JtiBlocklist](../apis/jti-blocklist.md).ts