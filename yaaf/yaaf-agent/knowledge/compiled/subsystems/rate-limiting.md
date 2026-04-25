---
summary: Provides mechanisms to control resource usage by users, preventing abuse and ensuring fair access.
title: Rate Limiting
entity_type: subsystem
primary_files:
 - src/security/rateLimiter.ts
 - src/security/rateLimiterStore.ts
exports:
 - PerUserRateLimiter
 - perUserRateLimiter
 - DistributedRateLimitBackend
 - PerUserRateLimitStore
 - InMemoryRateLimitStore
 - RedisRateLimitStore
search_terms:
 - prevent user abuse
 - control resource usage
 - limit agent turns
 - token usage limits
 - cost control for agents
 - distributed rate limiting
 - Redis rate limiter
 - in-memory rate limiting
 - how to set user limits
 - fair access policy
 - throttling user requests
 - concurrent run limits
 - usage tracking
stub: false
compiled_at: 2026-04-24T18:18:25.920Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiter.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiterStore.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Rate Limiting subsystem provides a framework for enforcing usage quotas on a per-user basis. Its primary purpose is to prevent system abuse, ensure fair access to resources for all users, and manage operational costs. It tracks several dimensions of usage, including computational cost, token consumption, agent turns, and concurrent executions within a configurable time window [Source 1, Source 2].

## Architecture

The central component of this subsystem is the `PerUserRateLimiter` class, which is responsible for tracking and enforcing limits [Source 1]. The key architectural feature is its pluggable backend for persisting usage counters, which is critical for deployments with multiple server instances.

By default, the rate limiter uses an in-[Memory](../concepts/memory.md) store. This approach is suitable for development and single-process deployments but has a significant limitation in a distributed environment: each process (or pod) maintains its own separate counters. This means the effective global rate limit becomes the configured limit multiplied by the number of running instances (e.g., `maxTurnsPerUser × podCount`) [Source 1].

To enforce true global limits across a cluster, the subsystem provides two primary extension points for connecting to a distributed, atomic counter store like Redis or Memcached:

1.  **`PerUserRateLimitStore`**: A high-level interface for persisting a user's complete usage snapshot. The framework provides built-in adapters for this interface, including `InMemoryRateLimitStore` (the default) and `RedisRateLimitStore` for production use [Source 2]. Implementations must ensure that read-modify-write operations are atomic to prevent race conditions between workers [Source 2].

2.  **`DistributedRateLimitBackend`**: A lower-level interface focused on atomically incrementing individual usage counters (`cost`, `tokens`, `turns`). This provides an alternative integration pattern for data stores that excel at atomic increment operations [Source 1].

For production environments with multiple instances, using a distributed store like the `RedisRateLimitStore` is essential to ensure that limits are applied consistently and accurately across the entire service [Source 2]. The store is responsible for managing the time-to-live (TTL) of usage records to align with the rate limiter's rolling window, ensuring stale entries are automatically expired [Source 2].

## Key APIs

*   **`PerUserRateLimiter`**: The main class that checks usage against configured limits for a given user [Source 1].
*   **`perUserRateLimiter(config)`**: A factory function for creating and configuring a `PerUserRateLimiter` instance [Source 1].
*   **`PerUserRateLimitStore`**: The primary interface for implementing pluggable, persistent storage for user usage data. It defines methods like `getUsage`, `setUsage`, and `deleteUsage` [Source 2].
*   **`InMemoryRateLimitStore`**: The default, non-persistent implementation of `PerUserRateLimitStore`. Usage data is lost on process restart [Source 2].
*   **`RedisRateLimitStore`**: A production-ready `PerUserRateLimitStore` implementation backed by Redis, enabling shared state across multiple server instances [Source 2].
*   **`DistributedRateLimitBackend`**: An alternative, lower-level interface for creating custom distributed backends that operate on atomic increments [Source 1].
*   **`RateLimitCheckResult`**: The data structure returned by the limiter, indicating if a user is blocked and providing their current usage summary [Source 1].

## Configuration

The rate limiter is configured during the instantiation of `PerUserRateLimiter`. Configuration involves setting the limits for various resources and, crucially, specifying the storage backend.

Key configuration parameters include `maxTurnsPerUser`, `maxCostPerUser`, and `windowMs` (the duration of the rolling window in milliseconds) [Source 1].

To configure a distributed backend, an instance implementing `PerUserRateLimitStore` or `DistributedRateLimitBackend` is passed in the configuration object.

**Example using `RedisRateLimitStore`:**
```typescript
import Redis from 'ioredis'
import { RedisRateLimitStore, PerUserRateLimiter } from 'yaaf/security'

const store = new RedisRateLimitStore(new Redis())
const limiter = new PerUserRateLimiter({ maxCostPerUser: 10, store })
```
[Source 2]

**Example using a custom `DistributedRateLimitBackend`:**
```typescript
import { createClient } from 'redis'

const redis = createClient()
await redis.connect()

const limiter = new PerUserRateLimiter({
  maxTurnsPerUser: 100,
  windowMs: 3_600_000,
  backend: {
    async increment(userId, field, amount, windowMs) {
      const key = `rl:${userId}:${field}`
      const val = await redis.incrBy(key, amount)
      if (val === amount) await redis.expire(key, Math.ceil(windowMs / 1000))
      return val
    },
    // ... other methods
  },
})
```
[Source 1]

## Extension Points

The primary method for extending the Rate Limiting subsystem is by providing a custom storage backend to support different data stores or specific architectural requirements. Developers can create a custom class that implements the `PerUserRateLimitStore` interface [Source 2]. This allows the rate limiter to integrate with any data store capable of atomic read-modify-write operations, such as databases with transaction support or other key-value stores.

Alternatively, for data stores optimized for atomic increments, developers can implement the `DistributedRateLimitBackend` interface [Source 1]. This provides a more direct way to leverage the native capabilities of systems like Redis or Memcached for high-performance, distributed counting.

## Sources

*   [Source 1] `src/security/rateLimiter.ts`
*   [Source 2] `src/security/rateLimiterStore.ts`