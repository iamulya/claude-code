---
summary: A class for enforcing per-user rate limits based on turns, tokens, or cost.
export_name: PerUserRateLimiter
source_file: src/security/rateLimiter.ts
category: class
title: PerUserRateLimiter
entity_type: api
search_terms:
 - rate limiting users
 - prevent abuse
 - control LLM costs
 - token usage limits
 - turn-based rate limits
 - distributed rate limiting
 - Redis rate limiter
 - user usage tracking
 - API security
 - concurrency control
 - cost management
 - how to limit user requests
 - block user requests
 - usage quotas
stub: false
compiled_at: 2026-04-24T17:27:49.310Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiter.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiter.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `PerUserRateLimiter` class provides a mechanism to enforce usage limits for individual users of an agent. It can track and limit usage across several dimensions, including the number of conversational turns, the total tokens consumed, the estimated monetary cost, and the number of concurrent agent runs [Source 1, Source 2].

By default, the rate limiter operates in-[Memory](../concepts/memory.md), making it suitable for single-process deployments. For applications running in a distributed environment (e.g., multiple pods in Kubernetes), this would result in each replica maintaining its own separate counters. To enforce true global rate limits across all replicas, a `DistributedRateLimitBackend` can be provided. This allows the rate limiter to use an external atomic counter store like Redis or Memcached to share state [Source 1, Source 2].

## Signature / Constructor

The `PerUserRateLimiter` class is typically instantiated using the `perUserRateLimiter` factory function, which accepts an optional configuration object.

```typescript
export class PerUserRateLimiter { /* ... */ }

export function perUserRateLimiter(config?: PerUserRateLimiterConfig): PerUserRateLimiter;
```

While the specific properties of `PerUserRateLimiterConfig` are not detailed in the source, the example usage suggests it includes properties like `maxTurnsPerUser` and `windowMs` [Source 1, Source 2].

### Related Types

The following types are used in conjunction with `PerUserRateLimiter`:

**`DistributedRateLimitBackend`**

An interface for a pluggable backend to enable distributed, cross-replica [Rate Limiting](../subsystems/rate-limiting.md) [Source 1, Source 2].

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

**`RateLimitCheckResult`**

The object returned [when](./when.md) checking if a user has exceeded their limits [Source 1, Source 2].

```typescript
export type RateLimitCheckResult = {
  blocked: boolean;
  reason?: string;
  usage: UserUsageSummary;
};
```

**`UserUsageSummary`**

A summary of a user's current resource consumption within the time window [Source 1, Source 2].

```typescript
export type UserUsageSummary = {
  cost: number;
  tokens: number;
  turns: number;
  concurrentRuns: number;
  windowStart: number;
};
```

## Events

The `PerUserRateLimiter` emits events related to rate limiting actions. The payload for these events is described by the `RateLimitEvent` type [Source 1, Source 2].

```typescript
export type RateLimitEvent = {
  userId: string;
  resource: "cost" | "tokens" | "turns" | "concurrent";
  current: number;
  limit: number;
  action: "warning" | "blocked";
  timestamp: Date;
};
```

- `userId`: The identifier for the user who triggered the event.
- `resource`: The specific resource dimension that was checked (`cost`, `tokens`, `turns`, or `concurrent`).
- `current`: The user's current usage count for the resource.
- `limit`: The configured limit for the resource.
- `action`: The action taken by the limiter, either `warning` or `blocked`.
- `timestamp`: The time the event occurred.

## Examples

### Using a Distributed Backend with Redis

To enforce global rate limits in a multi-pod deployment, you can provide a custom backend. The following example demonstrates how to implement a `DistributedRateLimitBackend` using a Redis client [Source 1, Source 2].

```typescript
import { createClient } from 'redis';
import { PerUserRateLimiter } from 'yaaf'; // Assuming PerUserRateLimiter is exported

const redis = createClient();
await redis.connect();

const limiter = new PerUserRateLimiter({
  maxTurnsPerUser: 100,
  windowMs: 3_600_000, // 1 hour
  backend: {
    async increment(userId, field, amount, windowMs) {
      const key = `rl:${userId}:${field}`;
      // Atomically increment the user's counter for the given field
      const val = await redis.incrBy(key, amount);
      // If this is the first increment in the window, set the key's expiration
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
      // Delete all rate limit counters for the user
      await redis.del([
        `rl:${userId}:cost`,
        `rl:${userId}:tokens`,
        `rl:${userId}:turns`
      ]);
    },
  },
});
```

## Sources

[Source 1] src/security/rateLimiter.ts
[Source 2] src/security/rateLimiter.ts