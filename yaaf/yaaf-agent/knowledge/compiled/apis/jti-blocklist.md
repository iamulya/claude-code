---
title: JtiBlocklist
entity_type: api
summary: Interface for managing a blocklist of JWT IDs (JTIs) to enable token revocation.
export_name: JtiBlocklist
source_file: src/iam/jtiBlocklist.ts
category: interface
search_terms:
 - JWT revocation
 - token blocklist
 - how to revoke JWT
 - JTI blocklisting
 - session invalidation
 - JWT ID
 - InMemoryJtiBlocklist
 - RedisJtiBlocklist
 - token logout
 - security token management
 - prevent token reuse
 - JwtIdentityProvider integration
stub: false
compiled_at: 2026-04-24T17:15:40.187Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/jtiBlocklist.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `JtiBlocklist` interface defines a contract for a JWT ID (JTI) blocklist, a mechanism for JWT token revocation [Source 1]. By adding a token's `jti` claim to a blocklist, the token can be invalidated before its natural expiration time (`exp` claim). This is a common pattern for handling events like user logout or session termination in systems that use JWTs [Source 1].

YAAF provides two concrete implementations of this interface [Source 1]:
- `In[[[[[[[[Memory]]]]]]]]JtiBlocklist`: A simple, zero-dependency implementation suitable for single-process applications. It does not persist across restarts.
- `RedisJtiBlocklist`: A robust implementation backed by Redis, suitable for multi-process or clustered deployments. It persists across restarts and requires the `ioredis` package as a peer dependency.

A `JtiBlocklist` instance can be provided to an identity provider, such as `JwtIdentityProvider`, to automatically reject tokens that have been revoked [Source 1].

## Signature

```typescript
export interface JtiBlocklist {
  add(jti: string, expiresAt: number): Promise<void>;
  has(jti: string): Promise<boolean>;
  gc?(): Promise<void>;
}
```

## Methods & Properties

### add()

Adds a JWT ID (`jti`) to the blocklist, effectively revoking the corresponding token.

**Signature**
```typescript
add(jti: string, expiresAt: number): Promise<void>;
```

**Parameters**
- `jti`: `string` - The JWT ID from the `jti` claim of the token to be revoked.
- `expiresAt`: `number` - The epoch milliseconds [when](./when.md) the token expires. This value is used by the blocklist implementation for garbage collection to remove stale entries [Source 1].

### has()

Checks if a given JWT ID (`jti`) is present in the blocklist.

**Signature**
```typescript
has(jti: string): Promise<boolean>;
```

**Parameters**
- `jti`: `string` - The JWT ID to check.

**Returns**
- `Promise<boolean>`: A promise that resolves to `true` if the JTI is on the blocklist (i.e., the token is revoked), and `false` otherwise.

### gc()

An optional method to remove expired entries from the blocklist. In `InMemoryJtiBlocklist`, this is called automatically by an internal timer [Source 1].

**Signature**
```typescript
gc?(): Promise<void>;
```

## Examples

The following example demonstrates creating an `InMemoryJtiBlocklist`, integrating it with a `JwtIdentityProvider`, and revoking a token by adding its `jti` to the blocklist [Source 1].

```typescript
import { InMemoryJtiBlocklist, JwtIdentityProvider } from 'yaaf/iam';
import { decodeJwt } from 'jose'; // Assuming 'jose' library for decoding

// 1. Create a blocklist instance
const blocklist = new InMemoryJtiBlocklist();

// 2. Configure the identity provider to use the blocklist
const idp = new JwtIdentityProvider({
  jwksUri: 'https://auth.example.com/.well-known/jwks.json',
  jtiBlocklist: blocklist, // Revoked tokens will now be rejected
});

// 3. To revoke a token (e.g., during a logout flow):
async function revokeToken(token: string) {
  // Decode the token to access its payload
  const payload = decodeJwt(token);

  // Check for jti and exp claims
  if (payload.jti && payload.exp) {
    // Add the JTI to the blocklist.
    // The `exp` claim is in seconds, so convert to milliseconds.
    await blocklist.add(payload.jti, payload.exp * 1000);
    console.log(`Token with JTI ${payload.jti} has been revoked.`);
  }
}

// Example usage:
// const userToken = '...some.jwt.token...';
// await revokeToken(userToken);
```

## See Also

- `InMemoryJtiBlocklist`: A concrete in-Memory implementation of this interface.
- `RedisJtiBlocklist`: A concrete Redis-backed implementation of this interface.
- `JwtIdentityProvider`: An identity provider that can use a `JtiBlocklist` to reject revoked tokens.

## Sources

[Source 1]: src/iam/jtiBlocklist.ts