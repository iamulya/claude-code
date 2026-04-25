---
summary: The concept of enforcing rate limits across multiple application instances or processes.
title: Distributed Rate Limiting
entity_type: concept
related_subsystems:
 - security
search_terms:
 - global rate limit
 - multi-pod rate limiting
 - rate limiting across replicas
 - Redis rate limiter
 - atomic counter for rate limiting
 - how to enforce limits in Kubernetes
 - shared rate limit state
 - PerUserRateLimiter backend
 - DistributedRateLimitBackend interface
 - preventing rate limit bypass
 - scaling rate limits
 - centralized rate limiting
stub: false
compiled_at: 2026-04-24T17:54:27.129Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiter.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is
Distributed [Rate Limiting](../subsystems/rate-limiting.md) is a mechanism for enforcing usage quotas and throttling requests across multiple, independent application instances, such as pods in a Kubernetes cluster or servers behind a load balancer [Source 1].

In a horizontally scaled environment, each application process typically runs independently. A simple in-[Memory](./memory.md) rate limiter would maintain its own separate counters within each process. This creates a significant problem: the effective global rate limit becomes the configured limit multiplied by the number of running instances. For example, if the limit is 100 turns per user and there are five application pods, a user could actually make 500 turns before being throttled, defeating the purpose of the limit [Source 1].

Distributed rate limiting solves this by externalizing the state (the counters) to a centralized, shared data store that all instances can access. This ensures that a user's usage is aggregated across all application replicas, enforcing a true global limit [Source 1].

## How It Works in YAAF
YAAF supports distributed rate limiting through a pluggable backend system for its `PerUserRateLimiter`. The framework defines the `DistributedRateLimitBackend` interface, which developers can implement to integrate with an external atomic counter store like Redis or Memcached [Source 1].

The `DistributedRateLimitBackend` interface requires the implementation of three core methods [Source 1]:
*   `increment(userId, field, amount, windowMs)`: Atomically increments a counter for a given user and resource dimension (`cost`, `tokens`, or `turns`). Atomicity is crucial to prevent race conditions where multiple instances try to update the counter simultaneously. This method is also responsible for setting an expiration (TTL) on the counter to manage the rolling window [Source 1].
*   `get(userId, field)`: Retrieves the current value of a specific counter for a user without modifying it [Source 1].
*   `reset(userId)`: Deletes all rate-limiting counters associated with a specific user [Source 1].

By providing a concrete implementation of this interface during the configuration of a `PerUserRateLimiter`, developers can switch from the default in-memory (single-process) limiting to a robust, distributed system suitable for production deployments [Source 1].

## Configuration
To enable distributed rate limiting, a developer must create an instance of `PerUserRateLimiter` and provide a custom `backend` object that implements the `DistributedRateLimitBackend` interface. The backend logic should connect to a shared data store.

The following example demonstrates how to configure a `PerUserRateLimiter` with a Redis backend [Source 1].

```typescript
import { createClient } from 'redis';
import { PerUserRateLimiter } from 'yaaf'; // Assuming import path

// 1. Initialize the external store client
const redis = createClient();
await redis.connect();

// 2. Create the rate limiter with a custom backend
const limiter = new PerUserRateLimiter({
  maxTurnsPerUser: 100,
  windowMs: 3_600_000, // 1 hour
  backend: {
    async increment(userId, field, amount, windowMs) {
      const key = `rl:${userId}:${field}`;
      // Use Redis's atomic INCRBY command
      const val = await redis.incrBy(key, amount);
      // On the first increment in a window, set the key's expiration
      if (val === amount) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }
      return val;
    },
    async get(userId, field) {
      const key = `rl:${userId}:${field}`;
      return Number(await redis.get(key)) || 0;
    },
    async reset(userId) {
      // Delete all keys for the user atomically
      await redis.del([`rl:${userId}:cost`, `rl:${userId}:tokens`, `rl:${userId}:turns`]);
    },
  },
});
```

## Sources
[Source 1] src/security/rateLimiter.ts