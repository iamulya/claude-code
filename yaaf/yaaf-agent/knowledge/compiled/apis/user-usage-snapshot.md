---
summary: Defines the structure for storing a user's current rate limit usage metrics.
export_name: UserUsageSnapshot
source_file: src/security/rateLimiterStore.ts
category: type
title: UserUsageSnapshot
entity_type: api
search_terms:
 - rate limit tracking
 - user usage data structure
 - cost per user
 - token count limit
 - conversation turn limit
 - concurrent request limit
 - rate limiter state
 - PerUserRateLimitStore data
 - usage metrics
 - rate limit window
 - security types
 - how to store rate limit data
stub: false
compiled_at: 2026-04-24T17:46:52.396Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiterStore.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `UserUsageSnapshot` type defines the data structure used to represent a user's resource consumption within a single rate-limiting window [Source 1]. It is the core data model used by implementations of the `PerUserRateLimitStore` interface to persist and retrieve rate limit counters.

This object tracks several key metrics: a generic `cost`, token count, conversation turns, and the number of concurrent agent runs. It also includes a timestamp marking the beginning of the current measurement window, which is essential for determining [when](./when.md) the usage counters should be reset [Source 1].

## Signature

`UserUsageSnapshot` is a TypeScript type alias for an object with the following properties:

```typescript
export type UserUsageSnapshot = {
  cost: number;
  tokens: number;
  turns: number;
  concurrentRuns: number;
  windowStart: number; // epoch ms when the window began
};
```

### Properties

| Property         | Type     | Description                                                                 |
| ---------------- | -------- | --------------------------------------------------------------------------- |
| `cost`           | `number` | The cumulative, abstract cost of operations performed within the window.    |
| `tokens`         | `number` | The total number of [LLM](../concepts/llm.md) tokens processed (input and output) in the window.  |
| `turns`          | `number` | The number of conversational turns or agent invocations in the window.      |
| `concurrentRuns` | `number` | The number of agent runs currently in progress for the user.                |
| `windowStart`    | `number` | The Unix timestamp (in milliseconds) when the current rate limit window began. |

## Examples

The following example illustrates the structure of a `UserUsageSnapshot` object for a user who has consumed some resources within their rate limit window. This object would typically be created and managed internally by a `PerUserRateLimitStore` implementation.

```typescript
import { UserUsageSnapshot } from 'yaaf';

// Example snapshot for a user partway through their usage window.
const user123Usage: UserUsageSnapshot = {
  cost: 45.5,
  tokens: 12800,
  turns: 15,
  concurrentRuns: 2,
  windowStart: 1678886400000, // Represents a specific point in time
};
```

## See Also

*   `PerUserRateLimitStore`: The interface that defines the contract for storing and retrieving `UserUsageSnapshot` objects.
*   `In[[[[[[[[Memory]]]]]]]]RateLimitStore`: A default, in-Memory implementation of `PerUserRateLimitStore`.
*   `RedisRateLimitStore`: A production-grade, Redis-backed implementation of `PerUserRateLimitStore`.
*   `PerUserRateLimiter`: The security component that consumes `UserUsageSnapshot` data to enforce rate limits.

## Sources

[Source 1]: src/security/rateLimiterStore.ts