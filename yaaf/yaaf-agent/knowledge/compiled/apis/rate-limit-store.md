---
summary: Interface for an external store to manage rate limiting state across multiple server instances.
export_name: RateLimitStore
source_file: src/runtime/server.ts
category: interface
title: RateLimitStore
entity_type: api
search_terms:
 - distributed rate limiting
 - multi-instance rate limit
 - shared rate limit state
 - how to rate limit across servers
 - Redis rate limiter
 - Memcached rate limiter
 - external rate limit backend
 - createServer rate limiting
 - scaling YAAF server
 - production rate limiting
 - atomic rate limit increment
 - cluster rate limit
stub: false
compiled_at: 2026-04-25T00:11:45.046Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/runtime/server.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `RateLimitStore` interface defines a contract for an external, shared storage backend used for [Distributed Rate Limiting](../concepts/distributed-rate-limiting.md). It is designed to be used with the `rateLimitStore` option in the [createServer](./create-server.md) function [Source 1].

By default, the YAAF server's rate limiter stores request counts in process memory. This is sufficient for single-instance deployments. However, when running multiple server instances behind a load balancer, each instance would maintain its own separate rate limit counts. This would allow a single client to exceed the intended global rate limit by distributing their requests across different server instances [Source 1].

To solve this, `RateLimitStore` allows developers to delegate rate limit state management to a centralized data store, such as Redis or Memcached. By implementing this interface, all server instances can share and atomically update rate limit counters, ensuring that limits are enforced consistently across the entire cluster [Source 1].

## Signature

The `RateLimitStore` is a TypeScript interface with a single method [Source 1].

```typescript
export interface RateLimitStore {
  /**
   * Atomically check and increment the request count for an IP.
   * Returns true if the request is within the rate limit.
   */
  checkAndIncrement(key: string, max: number, windowMs: number): Promise<boolean>;
}
```

## Methods & Properties

### checkAndIncrement

This method is responsible for the core logic of checking and updating the rate limit count for a given key.

**Signature**
```typescript
checkAndIncrement(key: string, max: number, windowMs: number): Promise<boolean>;
```

**Description**

This method must perform an atomic operation to check if the current request count for `key` is less than `max` within the specified `windowMs`. If it is, the count should be incremented, and the method should return `true`. If the count is already at or above `max`, it should return `false` without incrementing the count. Atomicity is crucial to prevent race conditions in a distributed environment [Source 1].

**Parameters**

- `key`: `string` - A unique identifier for the client being rate-limited, typically their IP address.
- `max`: `number` - The maximum number of requests allowed within the time window. This value is passed from the `rateLimit` option of [createServer](./create-server.md).
- `windowMs`: `number` - The duration of the rate limit window in milliseconds (e.g., 60000 for one minute).

**Returns**

- `Promise<boolean>` - A promise that resolves to `true` if the request is permitted, or `false` if it has been rate-limited.

## Examples

The following example demonstrates how to create a custom `RateLimitStore` implementation (using a conceptual Redis client) and integrate it with [createServer](./create-server.md).

```typescript
import { createServer, RateLimitStore, ServerConfig } from 'yaaf/server';
import { Agent } from 'yaaf';
import { Redis } from 'ioredis'; // NOTE: ioredis is a third-party library

/**
 * A RateLimitStore implementation using Redis.
 * This uses a sorted set to track request timestamps for atomicity.
 */
class RedisRateLimitStore implements RateLimitStore {
  private redis: Redis;

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  async checkAndIncrement(key: string, max: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const keyWithPrefix = `rate-limit:${key}`;

    // Use a Redis transaction (MULTI/EXEC) for atomicity.
    const transaction = this.redis.multi();

    // 1. Remove timestamps older than the current window.
    transaction.zremrangebyscore(keyWithPrefix, 0, windowStart);

    // 2. Get the current count of requests in the window.
    transaction.zcard(keyWithPrefix);

    // 3. Add the current request's timestamp.
    transaction.zadd(keyWithPrefix, now, `${now}-${Math.random()}`);

    // 4. Set an expiration on the key to clean it up after the window passes.
    transaction.expire(keyWithPrefix, Math.ceil(windowMs / 1000));

    // Execute the transaction.
    const results = await transaction.exec();

    if (!results) {
      // Transaction failed
      return false;
    }

    // The result of zcard is the second command in the transaction.
    const currentCount = results[1][1] as number;

    // The check is against `max`, not `max - 1`, because we've already
    // added the current request to the count.
    return currentCount <= max;
  }
}

// 1. Initialize the agent
const agent = new Agent({ systemPrompt: 'You are a helpful assistant.' });

// 2. Create an instance of the external store
const redisClient = new Redis({ host: 'my-redis-host' });
const store = new RedisRateLimitStore(redisClient);

// 3. Configure the server to use the store
const serverConfig: ServerConfig = {
  port: 8080,
  rateLimit: 100, // 100 requests per minute per IP
  rateLimitStore: store, // Plug in the distributed store
  trustProxy: true, // Important when behind a load balancer to get the correct IP
};

const server = createServer(agent, serverConfig);

console.log(`Server with distributed rate limiting running at ${server.url}`);
```

## See Also

- [createServer](./create-server.md): The function that consumes a `RateLimitStore` instance.
- [Distributed Rate Limiting](../concepts/distributed-rate-limiting.md): The core concept this interface enables.
- [Rate Limiting](../subsystems/rate-limiting.md): The parent subsystem for rate limiting in YAAF.

## Sources

[Source 1]: src/runtime/server.ts