---
summary: An in-memory implementation of `PerUserRateLimitStore` suitable for development and single-instance deployments.
capabilities:
 - memory
title: InMemoryRateLimitStore
entity_type: plugin
built_in: true
search_terms:
 - rate limiting store
 - in-memory rate limiter
 - development rate limit
 - single process rate limit
 - PerUserRateLimitStore implementation
 - how to store rate limit data
 - transient rate limit counter
 - testing rate limits
 - ephemeral usage tracking
 - PerUserRateLimiter storage
 - local rate limit store
stub: false
compiled_at: 2026-04-24T18:08:47.425Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiterStore.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`In[[Memory]]RateLimitStore` is a built-in plugin that provides a transient, in-[Memory Storage](../concepts/memory-storage.md) backend for the `PerUserRateLimiter` subsystem [Source 1]. It implements the `[[[[[[[[PerUserRateLimitStore]]]]]]]]` interface, making it a pluggable component for tracking user-specific API usage, such as cost, tokens, and concurrent runs [Source 1].

This implementation is intended for development, testing, and single-instance deployments. Because it stores all usage data in the application's [Memory](../concepts/memory.md), all rate limit counters are reset [when](../apis/when.md)ever the process restarts. It is not suitable for production environments that run across multiple instances or require persistent rate limit tracking [Source 1].

## Installation

`InMemoryRateLimitStore` is a built-in component and does not require a separate installation. It can be imported directly from the `yaaf` package [Source 1].

```typescript
import { InMemoryRateLimitStore } from 'yaaf/security';
```

This plugin has no peer dependencies.

## Configuration

The `InMemoryRateLimitStore` is instantiated without any constructor arguments. It is then passed to a `PerUserRateLimiter` instance via its configuration object [Source 1].

```typescript
import { PerUserRateLimiter, InMemoryRateLimitStore } from 'yaaf/security';

// 1. Instantiate the in-memory store
const store = new InMemoryRateLimitStore();

// 2. Provide the store to the rate limiter
const limiter = new PerUserRateLimiter({
  maxCostPerUser: 100, // Example limit
  store: store,
});
```

## Capabilities

`InMemoryRateLimitStore` provides the `memory` capability by implementing the `PerUserRateLimitStore` interface [Source 1].

### PerUserRateLimitStore

As an implementation of `PerUserRateLimitStore`, this plugin provides the following methods for managing user usage data in memory [Source 1]:

*   `getUsage(userId)`: Retrieves the current usage snapshot for a given user from the in-memory map. Returns `null` if no record exists.
*   `setUsage(userId, usage, ttlMs)`: Stores a user's usage snapshot in the map. The `ttlMs` parameter is respected to ensure stale entries can be expired, although the primary expiration mechanism is process termination.
*   `deleteUsage(userId)`: Removes a user's usage record from memory.

## Limitations

This plugin has several key limitations based on its in-memory design [Source 1]:

*   **No Persistence**: All rate limit data is lost when the application process restarts.
*   **Single-Instance Only**: It is not suitable for multi-instance clusters, as each instance would have its own separate, unsynchronized set of rate limit counters. This would lead to inconsistent and incorrect rate limit enforcement across a distributed system.
*   **Not for Production**: Due to the lack of persistence and multi-instance support, it is not recommended for production SaaS applications [Source 1]. For production use cases, `RedisRateLimitStore` is the recommended alternative [Source 1].

## Sources

[Source 1] src/security/rateLimiterStore.ts