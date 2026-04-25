---
summary: The YAAF subsystem responsible for managing and enforcing usage limits, primarily through per-user rate limiting.
primary_files:
 - src/security/rateLimiterStore.ts
title: Rate Limiting System
entity_type: subsystem
exports:
 - UserUsageSnapshot
 - PerUserRateLimitStore
 - InMemoryRateLimitStore
 - RedisRateLimitStore
search_terms:
 - usage limits
 - preventing abuse
 - throttling requests
 - user quotas
 - Redis rate limiter
 - in-memory rate limiter
 - atomic usage counters
 - how to limit user requests
 - API throttling
 - usage persistence
 - multi-instance rate limiting
stub: false
compiled_at: 2026-04-25T00:30:17.059Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiterStore.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Rate Limiting System provides a persistent storage layer for tracking and enforcing usage limits on a per-user basis. Its primary function is to enable the `PerUserRateLimiter` to maintain accurate usage counters that can survive server restarts and be shared across multiple server instances in a cluster. This prevents users from bypassing limits by making requests to different servers and ensures consistent enforcement of usage policies in production environments [Source 1].

## Architecture

The core of this subsystem is the [PerUserRateLimitStore](../apis/per-user-rate-limit-store.md) interface, which defines a contract for pluggable storage backends. This interface mandates that implementations provide atomic operations for reading and writing usage data to prevent race conditions in concurrent environments, such as a multi-instance cluster [Source 1].

The data managed by the store is encapsulated in the [UserUsageSnapshot](../apis/user-usage-snapshot.md) type, which tracks metrics like `cost`, `tokens`, `turns`, and `concurrentRuns` within a specific time window [Source 1].

YAAF includes two primary implementations of the [PerUserRateLimitStore](../apis/per-user-rate-limit-store.md) interface:

*   **[InMemoryRateLimitStore](../plugins/in-memory-rate-limit-store.md)**: A simple, in-memory implementation suitable for development, testing, and single-instance deployments. Its state is ephemeral and is lost when the process restarts [Source 1].
*   **[RedisRateLimitStore](../plugins/redis-rate-limit-store.md)**: A production-grade implementation that uses Redis as a backend. It ensures that usage data is persistent and can be shared across a distributed cluster of YAAF agents. This adapter requires the `ioredis` library as a peer dependency [Source 1].

The architecture decouples the rate limiting logic (handled by [PerUserRateLimiter](../apis/per-user-rate-limiter.md)) from the state storage, allowing developers to choose or create a storage solution that fits their deployment needs.

## Integration Points

The Rate Limiting System is primarily consumed by other components within the [Security System](./security-system.md). The most direct integration is with the [PerUserRateLimiter](../apis/per-user-rate-limiter.md), which is configured by passing an instance of a [PerUserRateLimitStore](../apis/per-user-rate-limit-store.md) implementation to its constructor. The limiter then uses the provided store to get and set usage snapshots for each user request [Source 1].

## Key APIs

*   **[PerUserRateLimitStore](../apis/per-user-rate-limit-store.md)**: The central interface that defines the contract for storing and retrieving user usage data. Key methods include `getUsage`, `setUsage`, and `deleteUsage` [Source 1].
*   **[UserUsageSnapshot](../apis/user-usage-snapshot.md)**: A type definition for the object that holds a user's usage metrics for a given time window [Source 1].
*   **[InMemoryRateLimitStore](../plugins/in-memory-rate-limit-store.md)**: A built-in class that implements [PerUserRateLimitStore](../apis/per-user-rate-limit-store.md) using in-memory storage [Source 1].
*   **[RedisRateLimitStore](../plugins/redis-rate-limit-store.md)**: A built-in class that implements [PerUserRateLimitStore](../apis/per-user-rate-limit-store.md) using a Redis backend for persistent, distributed state [Source 1].

## Configuration

This subsystem is configured at the application level when instantiating a rate limiter. A developer selects a storage adapter, creates an instance of it (e.g., connecting to a Redis server), and provides it to the [PerUserRateLimiter](../apis/per-user-rate-limiter.md) during its construction [Source 1].

```typescript
import Redis from 'ioredis';
import { RedisRateLimitStore, PerUserRateLimiter } from 'yaaf/security';

// 1. Instantiate a store adapter
const store = new RedisRateLimitStore(new Redis());

// 2. Pass the store to the limiter during configuration
const limiter = new PerUserRateLimiter({ maxCostPerUser: 10, store });
```

## Extension Points

The main extension point is the [PerUserRateLimitStore](../apis/per-user-rate-limit-store.md) interface. Developers can create custom storage backends for different databases (e.g., PostgreSQL, DynamoDB, or a relational database) by creating a new class that implements this interface. The custom store must ensure that its operations, particularly the combination of reading and incrementing usage, are atomic to prevent race conditions [Source 1].

## Sources

[Source 1]: src/security/rateLimiterStore.ts