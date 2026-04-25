---
title: RedisJtiBlocklist
entity_type: api
summary: A Redis-backed implementation of the JTI blocklist for multi-process and persistent token revocation across instances.
export_name: RedisJtiBlocklist
source_file: src/iam/jtiBlocklist.ts
category: class
search_terms:
 - JWT revocation
 - token blocklist
 - JTI blocklist
 - how to revoke JWT
 - shared token revocation
 - multi-process authentication
 - persistent token blocklist
 - ioredis integration
 - logout implementation
 - session invalidation
 - distributed session management
 - secure token handling
 - cluster token management
stub: false
compiled_at: 2026-04-24T17:31:48.746Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/jtiBlocklist.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `Redis[[[[[[[[JtiBlocklist]]]]]]]]` class provides a persistent, multi-process implementation of the `JtiBlocklist` interface for JWT (JSON Web Token) revocation [Source 1]. It uses a Redis backend to store the JWT IDs (`jti` claim) of revoked tokens.

This implementation is designed for production environments running multiple instances of an application, such as in a cluster or serverless environment. Because the blocklist is stored in Redis, a token revoked on one instance is immediately recognized as revoked by all other instances sharing the same Redis database. The blocklist also survives application restarts [Source 1].

Using `RedisJtiBlocklist` requires the `ioredis` package as a peer dependency [Source 1]. It is the recommended alternative to `InMemoryJtiBlocklist` for any application that is not a single, ephemeral process.

## Signature / Constructor

`RedisJtiBlocklist` implements the `JtiBlocklist` interface.

```typescript
import { JtiBlocklist } from 'yaaf/iam';
import Redis from 'ioredis';

export class RedisJtiBlocklist implements JtiBlocklist {
  constructor(redis: Redis.Redis);

  // ...methods
}
```

**Constructor Parameters:**

*   `redis` (`Redis.Redis`): An active, configured client instance from the `ioredis` library.

## Methods & Properties

`RedisJtiBlocklist` implements the methods defined in the `JtiBlocklist` interface.

### add()

Adds a JWT ID (`jti`) to the blocklist, effectively revoking the token.

```typescript
add(jti: string, expiresAt: number): Promise<void>;
```

*   **Parameters:**
    *   `jti` (`string`): The JWT ID from the `jti` claim of the token to be revoked.
    *   `expiresAt` (`number`): The epoch milliseconds [when](./when.md) the token expires. `RedisJtiBlocklist` uses this value to set an `EXPIREAT` command in Redis, ensuring the blocklist entry is automatically garbage-collected when the token would have naturally expired.
*   **Returns:** `Promise<void>`

### has()

Checks if a given JTI is in the blocklist.

```typescript
has(jti: string): Promise<boolean>;
```

*   **Parameters:**
    *   `jti` (`string`): The JWT ID to check.
*   **Returns:** `Promise<boolean>` — `true` if the JTI is on the blocklist (revoked), `false` otherwise.

## Examples

### Basic Instantiation

First, ensure `ioredis` is installed:

```sh
npm install ioredis
```

Then, create a Redis client and pass it to the `RedisJtiBlocklist` constructor.

```typescript
import Redis from 'ioredis';
import { RedisJtiBlocklist } from 'yaaf/iam';

// Connect to your Redis instance
const redis = new Redis({ host: 'localhost', port: 6379 });

// Create the blocklist instance
const blocklist = new RedisJtiBlocklist(redis);
```

### Integration with JwtIdentityProvider

`RedisJtiBlocklist` is typically used with an identity provider to automatically reject revoked tokens during validation.

```typescript
import Redis from 'ioredis';
import { RedisJtiBlocklist, JwtIdentityProvider } from 'yaaf/iam';
import { decodeJwt } from 'jose';

// 1. Set up the blocklist
const redis = new Redis();
const blocklist = new RedisJtiBlocklist(redis);

// 2. Configure the identity provider to use the blocklist
const idp = new JwtIdentityProvider({
  jwksUri: 'https://auth.example.com/.well-known/jwks.json',
  JtiBlocklist: blocklist,
});

// 3. To revoke a token (e.g., during a logout flow)
async function revokeToken(token: string) {
  // Note: Use a library like 'jose' to decode without verification
  const payload = decodeJwt(token);
  if (payload.jti && typeof payload.exp === 'number') {
    // Add the JTI to the blocklist with its original expiry time
    await blocklist.add(payload.jti, payload.exp * 1000);
    console.log(`Token ${payload.jti} has been revoked.`);
  }
}

// Now, any future attempt to authenticate with the revoked token
// using the `idp` will fail, even if the token is not expired.
```

## See Also

*   `InMemoryJtiBlocklist`: A non-persistent, single-process alternative for development or simple use cases.
*   `JtiBlocklist`: The interface that `RedisJtiBlocklist` implements.
*   `JwtIdentityProvider`: The class that consumes a `JtiBlocklist` to enforce token revocation.

## Sources

[Source 1]: src/iam/JtiBlocklist.ts