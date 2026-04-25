---
summary: An interface for pluggable storage backends that persist user rate limit usage counters.
export_name: PerUserRateLimitStore
source_file: src/security/rateLimiterStore.ts
category: interface
title: PerUserRateLimitStore
entity_type: api
search_terms:
 - rate limit storage
 - persist rate limit counters
 - custom rate limit backend
 - Redis rate limiter
 - in-memory rate limiter
 - how to store rate limit data
 - PerUserRateLimiter storage
 - distributed rate limiting
 - atomic usage counters
 - rate limit TTL
 - UserUsageSnapshot
 - pluggable security store
stub: false
compiled_at: 2026-04-24T17:27:27.787Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiterStore.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `PerUserRateLimitStore` is an interface that defines the contract for pluggable storage backends used by the `PerUserRateLimiter` [Source 1]. Its primary purpose is to persist user-specific rate limit usage counters, enabling rate limits to function correctly across server restarts and in distributed, multi-instance environments [Source 1].

Implementations of this interface must ensure that operations are atomic. Concurrent reads and writes from multiple workers must not result in race conditions. For example, a Redis-based implementation should use Lua scripts or transactions to guarantee atomicity [Source 1].

YAAF provides two built-in implementations [Source 1]:
- `In[[[[[[[[Memory]]]]]]]]RateLimitStore`: A default, in-Memory store suitable for development, testing, and single-process deployments. Usage data is lost on process restart.
- `RedisRateLimitStore`: A production-ready store that uses Redis, suitable for multi-instance clusters where state must be shared.

## Signature

The `PerUserRateLimitStore` interface defines three methods for managing user usage data. It operates on the `UserUsageSnapshot` type, which represents the state of a user's consumption within a given time window [Source 1].

```typescript
// The data structure representing a user's usage in a window.
export type UserUsageSnapshot = {
  cost: number;
  tokens: number;
  turns: number;
  concurrentRuns: number;
  windowStart: number; // epoch ms [[[[[[[[when]]]]]]]] the window began
};

// The storage interface.
export interface PerUserRateLimitStore {
  getUsage(userId: string): Promise<UserUsageSnapshot | null>;
  setUsage(userId: string, usage: UserUsageSnapshot, ttlMs: number): Promise<void>;
  deleteUsage(userId: string): Promise<void>;
}
```

## Methods & Properties

### getUsage

Retrieves the current usage snapshot for a specific user. If no record exists for the user, it should return `null`. The `PerUserRateLimiter` interprets a `null` return value as the start of a new window, with all counters at zero [Source 1].

**Signature:**
```typescript
getUsage(userId: string): Promise<UserUsageSnapshot | null>;
```

### setUsage

Persists the current usage snapshot for a user. This method also accepts a `ttlMs` (time-to-live in milliseconds) parameter, which should correspond to the rate limit window's duration. Implementations are expected to use this value to set an expiration time on the stored record, ensuring that stale entries are automatically purged [Source 1].

**Signature:**
```typescript
setUsage(userId: string, usage: UserUsageSnapshot, ttlMs: number): Promise<void>;
```

### deleteUsage

Deletes the usage record for a specific user. This is useful for cleanup tasks, such as when a user's account is deleted from the system [Source 1].

**Signature:**
```typescript
deleteUsage(userId: string): Promise<void>;
```

## Examples

The following example demonstrates how to configure a `PerUserRateLimiter` with a `RedisRateLimitStore` for a production environment [Source 1].

```typescript
import Redis from 'ioredis';
import { RedisRateLimitStore, PerUserRateLimiter } from 'yaaf/security';

// Assumes ioredis is installed as a peer dependency.
const redisClient = new Redis();

// Instantiate the Redis-backed store.
const store = new RedisRateLimitStore(redisClient);

// Provide the store to the rate limiter via its configuration.
const limiter = new PerUserRateLimiter({
  maxCostPerUser: 10,
  store: store,
});

// Now, the limiter will persist usage data in Redis.
```

## Sources

[Source 1]: src/security/rateLimiterStore.ts