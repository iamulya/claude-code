---
summary: A Redis-backed implementation of `PerUserRateLimitStore` for production, multi-instance clusters.
capabilities:
 - storage
title: RedisRateLimitStore
entity_type: plugin
built_in: true
search_terms:
 - rate limiting in production
 - distributed rate limiter
 - multi-instance rate limit
 - Redis for rate limiting
 - PerUserRateLimitStore implementation
 - how to persist rate limits
 - shared rate limit counter
 - ioredis integration
 - production rate limit store
 - cluster-safe rate limiting
 - preventing race conditions in rate limits
 - atomic usage counters
stub: false
compiled_at: 2026-04-24T18:08:59.402Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiterStore.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`RedisRateLimitStore` is a built-in plugin that provides a persistent storage backend for the `PerUserRateLimiter` subsystem [Source 1]. It implements the `[[[[[[[[PerUserRateLimitStore]]]]]]]]` interface, making it suitable for production environments, especially those running multi-instance clusters. By using a central Redis server, this plugin ensures that rate limit usage counters are shared across all application instances, survive server restarts, and are updated atomically to prevent race conditions [Source 1].

This plugin is the recommended alternative to `InMemoryRateLimitStore` for any application beyond single-process development or testing [Source 1].

## Installation

The `RedisRateLimitStore` plugin is included in the core `yaaf` package. However, it requires the `ioredis` library as a peer dependency, which must be installed separately [Source 1].

```bash
npm install ioredis
```

The plugin can then be imported from the `yaaf/security` module [Source 1].

```typescript
import { RedisRateLimitStore } from 'yaaf/security';
import Redis from 'ioredis';
```

## Configuration

The `RedisRateLimitStore` constructor requires an active `ioredis` client instance. The configuration of the Redis connection (e.g., host, port, password) is handled by the `ioredis` client [Source 1].

The following example demonstrates how to instantiate a Redis client and use it to configure the `RedisRateLimitStore`, which is then passed to a `PerUserRateLimiter` [Source 1].

```typescript
import Redis from 'ioredis';
import { RedisRateLimitStore, PerUserRateLimiter } from 'yaaf/security';

// 1. Configure and create an ioredis client instance.
const redisClient = new Redis({
  host: 'localhost',
  port: 6379,
});

// 2. Pass the client instance to the RedisRateLimitStore constructor.
const store = new RedisRateLimitStore(redisClient);

// 3. Use the store with a rate limiter.
const limiter = new PerUserRateLimiter({
  maxCostPerUser: 100,
  store: store, // The PerUserRateLimiter now uses Redis for persistence.
});
```

## Capabilities

`RedisRateLimitStore` provides the `storage` capability by implementing the `PerUserRateLimitStore` interface [Source 1].

### PerUserRateLimitStore

As an implementation of `PerUserRateLimitStore`, this plugin provides the following methods for managing user-specific rate limit data in Redis:

*   **`getUsage(userId)`**: Retrieves the current usage snapshot for a given user from Redis. If no record exists for the user, it returns `null` [Source 1].
*   **`setUsage(userId, usage, ttlMs)`**: Persists a user's usage snapshot to Redis. It also sets a time-to-live (TTL) on the record, ensuring that stale entries for expired rate limit windows are automatically removed from the database [Source 1].
*   **`deleteUsage(userId)`**: Removes a user's rate limit record from Redis, which can be used [when](../apis/when.md) an account is deleted [Source 1].

The interface contract requires that operations be atomic to prevent race conditions between concurrent requests from different server instances. `RedisRateLimitStore` is designed to fulfill this requirement by leveraging Redis's atomic operations [Source 1].

## Sources

[Source 1] src/security/rateLimiterStore.ts