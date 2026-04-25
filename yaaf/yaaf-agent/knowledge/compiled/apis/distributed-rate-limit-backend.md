---
summary: An interface defining the contract for a pluggable, distributed rate limiting backend.
export_name: DistributedRateLimitBackend
source_file: src/security/rateLimiter.ts
category: interface
title: DistributedRateLimitBackend
entity_type: api
search_terms:
 - distributed rate limiting
 - rate limit backend
 - Redis rate limiter
 - Memcached rate limiter
 - global rate limits
 - multi-pod rate limiting
 - atomic counter store
 - how to scale rate limits
 - PerUserRateLimiter backend
 - cross-replica rate limiting
 - implement custom rate limiter
 - rate limit across multiple servers
stub: false
compiled_at: 2026-04-24T17:03:21.722Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiter.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `DistributedRateLimitBackend` is an interface that defines the contract for a pluggable backend for cross-replica [Rate Limiting](../subsystems/rate-limiting.md) [Source 1].

By default, YAAF's rate limiting is performed in-[Memory](../concepts/memory.md), which means limits are only enforced within a single process. In deployments with multiple pods or servers, each instance maintains its own separate counters. This results in the effective global rate limit being the configured limit multiplied by the number of pods (e.g., `maxTurnsPerUser × podCount`).

To enforce true global rate limits across all replicas, a developer can implement the `DistributedRateLimitBackend` interface. This implementation should be backed by a shared, distributed data store capable of atomic operations, such as Redis or Memcached. The custom backend can then be provided to a rate limiter like `PerUserRateLimiter` [Source 1].

## Signature

`DistributedRateLimitBackend` is an interface with three required methods [Source 1].

```typescript
export interface DistributedRateLimitBackend {
  increment(
    userId: string,
    field: "cost" | "tokens" | "turns",
    amount: number,
    windowMs: number,
  ): Promise<number>;

  get(userId: string, field: "cost" | "tokens" | "turns"): Promise<number>;

  reset(userId: string): Promise<void>;
}
```

## Methods & Properties

### increment()

Atomically increments a counter for a specific user and resource dimension and returns the new value [Source 1].

**Signature**
```typescript
increment(
  userId: string,
  field: "cost" | "tokens" | "turns",
  amount: number,
  windowMs: number,
): Promise<number>;
```

**Parameters**
- `userId`: The user being tracked.
- `field`: The resource dimension to increment. Can be `'cost'`, `'tokens'`, or `'turns'`.
- `amount`: The value to add to the counter. This may be a fractional number for `cost`.
- `windowMs`: The duration of the rolling window in milliseconds. This is used to set a Time-To-Live (TTL) on the counter key the first time it is written to within a window.

**Returns**
A `Promise` that resolves to the new aggregated value after the increment operation.

### get()

Reads the current value of a counter for a specific user and resource dimension without modifying it [Source 1].

**Signature**
```typescript
get(userId: string, field: "cost" | "tokens" | "turns"): Promise<number>;
```

**Parameters**
- `userId`: The user being tracked.
- `field`: The resource dimension to retrieve.

**Returns**
A `Promise` that resolves to the current value of the counter.

### reset()

Deletes all rate limit counters associated with a specific user. This is typically called by a rate limiter's `resetUser()` method [Source 1].

**Signature**
```typescript
reset(userId: string): Promise<void>;
```

**Parameters**
- `userId`: The user whose counters should be deleted.

**Returns**
A `Promise` that resolves [when](./when.md) the operation is complete.

## Examples

The following example demonstrates how to implement the `DistributedRateLimitBackend` interface using the `redis` library and integrate it with the `PerUserRateLimiter` [Source 1].

```typescript
import { createClient } from 'redis';
import { PerUserRateLimiter, DistributedRateLimitBackend } from 'yaaf';

// Assume PerUserRateLimiter is imported from the correct path

// 1. Create and connect the Redis client
const redis = createClient();
await redis.connect();

// 2. Implement the DistributedRateLimitBackend interface
const redisBackend: DistributedRateLimitBackend = {
  async increment(userId, field, amount, windowMs) {
    const key = `rl:${userId}:${field}`;
    const val = await redis.incrBy(key, amount);
    // On the first increment in a window, set the expiration
    if (val === amount) {
      await redis.expire(key, Math.ceil(windowMs / 1000));
    }
    return val;
  },
  async get(userId, field) {
    const value = await redis.get(`rl:${userId}:${field}`);
    return Number(value) || 0;
  },
  async reset(userId) {
    const keys = [`rl:${userId}:cost`, `rl:${userId}:tokens`, `rl:${userId}:turns`];
    await redis.del(keys);
  },
};

// 3. Provide the custom backend to the rate limiter
const limiter = new PerUserRateLimiter({
  maxTurnsPerUser: 100,
  windowMs: 3_600_000, // 1 hour
  backend: redisBackend,
});

// Now, this limiter will enforce a global limit of 100 turns per hour
// for each user, across all application instances connected to the same Redis.
```

## See Also

- `PerUserRateLimiter`: The primary consumer of `DistributedRateLimitBackend`, which enforces rate limits on a per-user basis.

## Sources

[Source 1] src/security/rateLimiter.ts