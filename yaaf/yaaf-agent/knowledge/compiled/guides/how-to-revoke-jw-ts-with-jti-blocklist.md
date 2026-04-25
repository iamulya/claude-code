---
title: How to Revoke JWTs with JTI Blocklist
entity_type: guide
summary: Learn how to implement JWT token revocation using YAAF's JTI blocklisting mechanisms for enhanced security.
difficulty: intermediate
search_terms:
 - JWT revocation
 - how to block a JWT
 - token blocklist
 - JTI claim
 - JWT ID
 - secure logout
 - invalidating JSON Web Tokens
 - InMemoryJtiBlocklist
 - RedisJtiBlocklist
 - yaaf iam security
 - preventing token reuse
 - session invalidation
 - JwtIdentityProvider blocklist
 - token expiration vs revocation
stub: false
compiled_at: 2026-04-24T18:07:24.083Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/jtiBlocklist.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

This guide demonstrates how to implement JWT (JSON Web Token) revocation in a YAAF application. By default, JWTs are valid until their expiration time (`exp` claim). However, in scenarios like user logout or a detected security breach, it is necessary to invalidate a token immediately.

YAAF provides a JTI (JWT ID) blocklisting mechanism to achieve this. By adding a token's unique `jti` claim to a blocklist, the `JwtIdentityProvider` will reject it, even if it has not yet expired. This guide covers the two available blocklist implementations: a simple in-[Memory](../concepts/memory.md) store and a more robust Redis-backed store for distributed systems [Source 1].

## Prerequisites

*   A YAAF project with the `JwtIdentityProvider` configured.
*   An understanding of JWT claims, specifically `jti` (JWT ID) and `exp` (Expiration Time). Your token issuer must include a unique `jti` claim in each token for this mechanism to work.
*   For the Redis-based implementation, you need a running Redis instance and the `ioredis` package installed in your project:
    ```sh
    npm install ioredis
    ```

## Step-by-Step

### Step 1: Choose a Blocklist Implementation

YAAF offers two blocklist implementations suitable for different use cases [Source 1]:

1.  **`InMemory[[[[[[[[JtiBlocklist]]]]]]]]`**: This is a zero-dependency implementation that stores revoked JTIs in the application's memory. It includes automatic garbage collection to remove expired entries.
    *   **Use [when](../apis/when.md)**: Developing, testing, or running a single-process, single-instance application.
    *   **Limitation**: The blocklist is cleared whenever the application process restarts. It is not shared across multiple instances of an application.

2.  **`RedisJtiBlocklist`**: This implementation uses a Redis server as a persistent, shared blocklist.
    *   **Use when**: Running a multi-process or multi-instance (clustered) application, or when revocation state must survive application restarts.
    *   **Requirement**: Requires the `ioredis` package as a peer dependency.

### Step 2: Instantiate the Blocklist

Create an instance of your chosen blocklist implementation.

**For `InMemoryJtiBlocklist`:**

```typescript
import { InMemoryJtiBlocklist } from 'yaaf/iam';

const blocklist = new InMemoryJtiBlocklist();
```

**For `RedisJtiBlocklist`:**

First, ensure `ioredis` is installed. Then, create a Redis client instance and pass it to the blocklist constructor [Source 1].

```typescript
import Redis from 'ioredis';
import { RedisJtiBlocklist } from 'yaaf/iam';

// Connect to your Redis instance
const redis = new Redis({ host: 'localhost', port: 6379 });

const blocklist = new RedisJtiBlocklist(redis);
```

### Step 3: Integrate with JwtIdentityProvider

Pass the blocklist instance to the `JwtIdentityProvider` during its initialization. The provider will then automatically check the blocklist for the `jti` of every incoming token it validates [Source 1].

```typescript
import { JwtIdentityProvider } from 'yaaf/iam';
// Assuming 'blocklist' is the instance from Step 2

const idp = new JwtIdentityProvider({
  jwksUri: 'https://auth.example.com/.well-known/jwks.json',
  JtiBlocklist: blocklist, // Wire the blocklist into the identity provider
});

// Now, any token validated by 'idp' will first be checked against the blocklist.
```

### Step 4: Revoke a Token

To revoke a token, you must add its `jti` to the blocklist. This is typically done in an API endpoint for user logout or an administrative action.

The `add` method on the blocklist requires both the `jti` and the token's expiration time. The expiration time is used for garbage collection, ensuring the blocklist doesn't grow indefinitely with entries for tokens that are already expired [Source 1].

The following example shows a typical revocation flow, such as in a logout handler:

```typescript
// A utility function to decode JWTs is assumed, e.g., from 'jose' or 'jsonwebtoken'
import { decodeJwt } from 'your-jwt-library';

// 'token' is the raw JWT string you want to revoke
// 'blocklist' is the instance from Step 2

async function revokeToken(token: string) {
  try {
    const { payload } = decodeJwt(token);

    // Ensure the token has the necessary claims
    if (payload.jti && typeof payload.jti === 'string' && payload.exp && typeof payload.exp === 'number') {
      // The 'exp' claim is in seconds, but the blocklist expects milliseconds
      const expiresAtMs = payload.exp * 1000;
      
      await blocklist.add(payload.jti, expiresAtMs);
      console.log(`Token with JTI ${payload.jti} has been revoked.`);
    } else {
      console.warn('Token cannot be revoked: missing jti or exp claim.');
    }
  } catch (error) {
    console.error('Failed to decode or revoke token:', error);
  }
}
```

Once `blocklist.add()` completes, any subsequent attempt to use that token with the configured `JwtIdentityProvider` will fail authentication.

## Common Mistakes

1.  **JWTs Missing `jti` Claim**: The entire revocation mechanism depends on a unique `jti` (JWT ID) claim being present in every token. If your identity provider or token issuer does not include this claim, you cannot use this feature.
2.  **Using `InMemoryJtiBlocklist` in a Cluster**: In a multi-instance deployment (e.g., using PM2 cluster mode or Kubernetes), `InMemoryJtiBlocklist` will lead to inconsistent behavior. A token revoked on one instance will still be valid on all other instances. Use `RedisJtiBlocklist` for any multi-process or distributed environment.
3.  **Incorrect Expiration Timestamp**: The `add(jti, expiresAt)` method requires the `expiresAt` parameter to be in **epoch milliseconds**. The standard JWT `exp` claim is in **epoch seconds**. Forgetting to multiply the `exp` value by 1000 will cause the blocklist entry to be garbage-collected almost immediately.

## Next Steps

*   Review the API for the `JwtIdentityProvider` to understand its other configuration options for token validation.
*   Implement a secure logout endpoint in your application that uses the token revocation logic shown in this guide.
*   Consider how your application will handle authentication errors that arise from a revoked token, providing clear feedback to the user.

## Sources

[Source 1]: src/iam/JtiBlocklist.ts