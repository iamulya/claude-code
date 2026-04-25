---
title: InMemoryJtiBlocklist
entity_type: api
summary: An in-memory implementation of the JTI blocklist, suitable for single-process applications with automatic garbage collection.
export_name: InMemoryJtiBlocklist
source_file: src/iam/jtiBlocklist.ts
category: class
search_terms:
 - JWT revocation
 - token blocklist
 - JTI blocklist
 - how to revoke JWTs
 - in-memory token store
 - single process token revocation
 - JWT ID
 - JtiBlocklist interface
 - token logout
 - session invalidation
 - preventing token reuse
 - JWT security
 - JwtIdentityProvider integration
stub: false
compiled_at: 2026-04-24T17:13:27.345Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/jtiBlocklist.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `In[[[[[[[[Memory]]]]]]]][[[[[[[[JtiBlocklist]]]]]]]]` is a class that provides an in-Memory mechanism for JWT (JSON Web Token) revocation [Source 1]. It implements the `JtiBlocklist` interface to prevent revoked JWTs from being accepted, even if their expiration time (`exp` claim) has not yet passed [Source 1].

This implementation is designed for single-process applications and has zero external dependencies. It features automatic garbage collection to remove expired token IDs (JTIs) from memory [Source 1].

A key limitation of `InMemoryJtiBlocklist` is that its state is volatile and will be lost if the application process restarts. For multi-instance deployments or scenarios requiring persistence, the `RedisJtiBlocklist` is the recommended alternative [Source 1].

## Signature / Constructor

`InMemoryJtiBlocklist` is a class that implements the `JtiBlocklist` interface. It is instantiated without any constructor arguments.

```typescript
export class InMemoryJtiBlocklist implements JtiBlocklist {
  // constructor is parameterless
  constructor();
}
```

## Methods & Properties

`InMemoryJtiBlocklist` implements the methods defined in the `JtiBlocklist` interface.

### add()

Adds a JWT ID (JTI) to the blocklist, effectively revoking the corresponding token.

**Signature**
```typescript
add(jti: string, expiresAt: number): Promise<void>;
```

**Parameters**
- `jti`: `string` - The JWT ID from the `jti` claim of the token to be revoked.
- `expiresAt`: `number` - The epoch milliseconds [when](./when.md) the token expires. This value is used for garbage collection purposes to automatically clean up the blocklist.

### has()

Checks if a given JTI exists in the blocklist.

**Signature**
```typescript
has(jti: string): Promise<boolean>;
```

**Parameters**
- `jti`: `string` - The JWT ID to check.

**Returns**
- `Promise<boolean>` - A promise that resolves to `true` if the JTI is on the blocklist (i.e., the token is revoked), and `false` otherwise.

### gc()

Removes expired entries from the blocklist. This method is part of the `JtiBlocklist` interface but is called automatically by an internal timer within the `InMemoryJtiBlocklist` implementation. Manual invocation is typically not required.

**Signature**
```typescript
gc?(): Promise<void>;
```

## Examples

The primary use case for `InMemoryJtiBlocklist` is to integrate it with an identity provider, such as `JwtIdentityProvider`, to enable token revocation.

The following example demonstrates how to set up the blocklist and use it to revoke a token, for instance, during a user logout operation.

```typescript
import { InMemoryJtiBlocklist } from 'yaaf/iam';
import { JwtIdentityProvider } from 'yaaf/iam';
import { decodeJwt } from 'jose'; // Assuming 'jose' or a similar library is used

// 1. Create an instance of the blocklist.
const blocklist = new InMemoryJtiBlocklist();

// 2. Provide it to the identity provider during configuration.
const idp = new JwtIdentityProvider({
  jwksUri: 'https://auth.example.com/.well-known/jwks.json',
  JtiBlocklist: blocklist, // Revoked tokens will now be rejected
});

// 3. To revoke a token (e.g., on user logout):
// Assume 'token' is the JWT string received from the client.
async function revokeToken(token: string) {
  // Decode the token to access its payload without verification.
  const payload = decodeJwt(token);

  // Check for the required claims 'jti' and 'exp'.
  if (payload.jti && payload.exp) {
    // Add the JTI to the blocklist.
    // The 'exp' claim is in seconds, so convert it to milliseconds.
    await blocklist.add(payload.jti, payload.exp * 1000);
    console.log(`Token with JTI ${payload.jti} has been revoked.`);
  }
}
```
[Source 1]

## See Also

- `RedisJtiBlocklist`: A persistent, multi-process alternative backed by Redis.
- `JwtIdentityProvider`: An identity provider that can use a `JtiBlocklist` to verify token revocation status.
- `JtiBlocklist`: The interface that `InMemoryJtiBlocklist` implements.

## Sources

[Source 1]: src/iam/JtiBlocklist.ts