---
summary: Learn how to configure and use different persistent storage options for YAAF's rate limiting system.
title: Setting Up Rate Limiting Storage
entity_type: guide
difficulty: beginner
search_terms:
 - rate limit persistence
 - how to configure rate limiter
 - Redis rate limit store
 - in-memory rate limiting
 - PerUserRateLimitStore
 - share rate limit across servers
 - production rate limiting setup
 - YAAF security configuration
 - prevent rate limit reset on restart
 - ioredis integration
 - distributed rate limiting
 - atomic usage counters
stub: false
compiled_at: 2026-04-24T18:07:57.056Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiterStore.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

This guide explains how to configure a persistent storage backend for YAAF's `PerUserRateLimiter`. The rate limiter uses a pluggable [Storage System](../subsystems/storage-system.md), defined by the `PerUserRateLimitStore` interface, to persist user usage counters [Source 1]. This allows [Rate Limiting](../subsystems/rate-limiting.md) state to be preserved across server restarts and shared between multiple instances in a cluster [Source 1].

This guide covers the two built-in storage adapters:
1.  **`In[[[[[[[[Memory]]]]]]]]RateLimitStore`**: The default option, suitable for development and single-instance deployments.
2.  **`RedisRateLimitStore`**: The production-ready option, suitable for multi-instance clusters requiring shared state.

By the end of this guide, you will be able to select and configure the appropriate storage backend for your application's needs.

## Prerequisites

For the `RedisRateLimitStore` option, the following are required:
*   A running Redis server instance.
*   The `ioredis` package installed in your project. This is a peer dependency for the Redis store [Source 1].

```bash
npm install ioredis
```

## Step-by-Step

The storage adapter is provided to the `PerUserRateLimiter` via the `store` property in its constructor options.

### Option 1: Using the In-Memory Store (Development)

The `InMemoryRateLimitStore` is the default storage adapter. It is suitable for development, testing, and single-instance deployments where persistence across restarts is not required [Source 1]. If no `store` is provided to the `PerUserRateLimiter`, it will use an in-memory store automatically.

Usage data stored this way will be lost [when](../apis/when.md)ever the application process restarts [Source 1].

```typescript
import { PerUserRateLimiter } from 'yaaf/security';

// No 'store' option is provided, so it defaults to InMemoryRateLimitStore.
const limiter = new PerUserRateLimiter({
  maxCostPerUser: 100,
  // store: new InMemoryRateLimitStore() // This is implicit
});
```

### Option 2: Using the Redis Store (Production)

The `RedisRateLimitStore` is designed for production environments, especially those running multiple application instances that need to share a single, consistent rate-limiting state [Source 1]. It uses Redis to store usage counters, ensuring they survive application restarts and are synchronized across a cluster.

To use it, first instantiate an `ioredis` client, then create an instance of `RedisRateLimitStore` with that client, and finally pass the store to the `PerUserRateLimiter` [Source 1].

```typescript
import Redis from 'ioredis';
import { RedisRateLimitStore, PerUserRateLimiter } from 'yaaf/security';

// 1. Create a Redis client instance.
const redisClient = new Redis({ host: 'localhost', port: 6379 });

// 2. Create the RedisRateLimitStore with the client.
const store = new RedisRateLimitStore(redisClient);

// 3. Pass the store to the rate limiter.
const limiter = new PerUserRateLimiter({
  maxCostPerUser: 1000,
  store: store,
});
```

The `RedisRateLimitStore` implementation ensures atomic operations, preventing race conditions when multiple workers attempt to update a user's usage simultaneously [Source 1].

## Common Mistakes

1.  **Using `InMemoryRateLimitStore` in Production:** In a multi-instance production environment, using the default in-memory store will cause each instance to have its own separate rate limits, leading to inconsistent enforcement. Furthermore, all rate limit data will be lost on every deployment or restart.
2.  **Forgetting to Install `ioredis`:** The `RedisRateLimitStore` has a peer dependency on `ioredis`. Forgetting to run `npm install ioredis` will result in a runtime error when the application tries to import or use the store.
3.  **Misconfigured Redis Connection:** If the `ioredis` client is configured with an incorrect host, port, or credentials, the `RedisRateLimitStore` will fail to connect to the Redis server, causing rate limiting checks to fail.

## Next Steps

After configuring the storage backend, the next step is to integrate the `PerUserRateLimiter` into your application's request pipeline or agent execution flow to start enforcing limits.

## Sources

[Source 1]: src/security/rateLimiterStore.ts