---
title: Identity and Access Management (IAM)
entity_type: subsystem
summary: The IAM subsystem provides mechanisms for JWT token revocation to enhance security in authentication flows.
primary_files:
 - src/iam/jtiBlocklist.ts
exports:
 - JtiBlocklist
 - InMemoryJtiBlocklist
 - RedisJtiBlocklist
search_terms:
 - JWT revocation
 - how to block a JWT
 - token blocklist
 - JTI blocklist
 - InMemoryJtiBlocklist
 - RedisJtiBlocklist
 - secure logout
 - preventing token reuse
 - session invalidation
 - JWT ID
 - identity provider integration
 - token management
stub: false
compiled_at: 2026-04-24T18:13:00.337Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/jtiBlocklist.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Identity and Access Management (IAM) subsystem provides functionality for JWT (JSON Web Token) revocation. Its primary purpose is to prevent revoked JWTs from being accepted by the system, even if their expiration claim (`exp`) has not yet passed. This is a critical security feature for handling events like user logout or token compromise, ensuring that invalidated tokens cannot be used for unauthorized access [Source 1].

## Architecture

The core of this subsystem is the `[[[[[[[[JtiBlocklist]]]]]]]]` interface, which defines a contract for blocking JWTs based on their JWT ID (`jti` claim). The system provides two primary implementations of this interface [Source 1].

### JtiBlocklist Interface

The `JtiBlocklist` interface specifies the essential operations for a token revocation list:
- `add(jti, expiresAt)`: Adds a token's JTI to the blocklist.
- `has(jti)`: Checks if a JTI is currently on the blocklist.
- `gc()`: An optional method for garbage collecting expired entries [Source 1].

### Implementations

1.  **`In[[[[[[[[Memory]]]]]]]]JtiBlocklist`**:
    - An in-Memory, single-process implementation with no external dependencies.
    - It features automatic garbage collection to remove expired JTIs.
    - Its main limitation is that the blocklist is cleared upon process restart, making it unsuitable for multi-instance deployments [Source 1].

2.  **`RedisJtiBlocklist`**:
    - A persistent, multi-process implementation that uses Redis as its backend.
    - It is designed for clustered environments, as the blocklist is shared across all instances and survives application restarts.
    - This implementation requires the `ioredis` library as a peer dependency [Source 1].

## Integration Points

The `JtiBlocklist` is designed to be integrated with identity providers within the YAAF framework. For example, an instance of a `JtiBlocklist` implementation can be passed to the `JwtIdentityProvider` during its construction. The identity provider will then use the blocklist to verify incoming tokens, rejecting any whose JTI is found on the list [Source 1].

```ts
import { InMemoryJtiBlocklist } from 'yaaf/iam'
import { JwtIdentityProvider } from 'yaaf/iam'

const blocklist = new InMemoryJtiBlocklist()

const idp = new JwtIdentityProvider({
  jwksUri: 'https://auth.example.com/.well-known/jwks.json',
  jtiBlocklist: blocklist, // revoked tokens will be rejected
})
```

To revoke a token, such as during a user logout, its `jti` and `exp` claims are extracted and added to the blocklist [Source 1].

```ts
// Revoke a token (e.g., on logout):
const { payload } = decodeJwt(token)
if (payload.jti && payload.exp) {
  await blocklist.add(payload.jti, payload.exp * 1000)
}
```

## Key APIs

-   **`JtiBlocklist`**: The interface that defines the contract for token revocation.
    -   `add(jti: string, expiresAt: number): Promise<void>`: Adds a JTI to the blocklist until its expiration time.
    -   `has(jti: string): Promise<boolean>`: Returns `true` if the JTI is on the blocklist.

-   **`InMemoryJtiBlocklist`**: A class implementing `JtiBlocklist` for in-memory, single-process use cases.

-   **`RedisJtiBlocklist`**: A class implementing `JtiBlocklist` using a Redis backend, suitable for distributed systems.

## Configuration

Configuration of the JTI blocklist is achieved by instantiating one of its concrete implementations and injecting it into other components.

For `RedisJtiBlocklist`, an `ioredis` client instance must be created and passed to its constructor [Source 1].

```ts
import Redis from 'ioredis'
import { RedisJtiBlocklist } from 'yaaf/iam'

const redis = new Redis({ host: 'localhost', port: 6379 })
const blocklist = new RedisJtiBlocklist(redis)
```

## Extension Points

The primary extension point is the `JtiBlocklist` interface itself. Developers can create custom blocklist implementations using different storage backends (e.g., a SQL database, another key-value store) by creating a class that implements this interface [Source 1].

## Sources

[Source 1]: src/iam/jtiBlocklist.ts