---
title: "PerUserRateLimiterConfig (Part 3: Examples)"
entity_type: api
part_of: "PerUserRateLimiterConfig"
part_number: 3
---
## Examples

### Basic In-Memory Configuration

This example sets up a rate limiter that allows a user 100 turns per hour. Since no `backend` is provided, it uses an in-memory store, suitable for a single-process application.

```typescript
import { PerUserRateLimiter } from 'yaaf';

const limiter = new PerUserRateLimiter({
  maxTurnsPerUser: 100,
  windowMs: 3_600_000, // 1 hour in milliseconds
});
```

### Configuration with a Distributed Backend (Redis)

For applications running in a distributed environment (e.g., multiple pods or servers), a shared backend like Redis is necessary to enforce global rate limits. This example shows how to configure the `PerUserRateLimiter` with a custom Redis-backed implementation of the [DistributedRateLimitBackend](./distributed-rate-limit-backend.md) interface [Source 1].

```typescript
import { PerUserRateLimiter, PerUserRateLimiterConfig, DistributedRateLimitBackend } from 'yaaf';
import { createClient } from 'redis';

async function setup() {
  const redis = createClient();
  await redis.connect();

  const redisBackend: DistributedRateLimitBackend = {
    async increment(userId, field, amount, windowMs) {
      const key = `rl:${userId}:${field}`;
      const val = await redis.incrBy(key, amount);
      // Set expiration only on the first increment in the window
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
      await redis.del([`rl:${userId}:cost`, `rl:${userId}:tokens`, `rl:${userId}:turns`]);
    },
  };

  const config: PerUserRateLimiterConfig = {
    maxTurnsPerUser: 100,
    windowMs: 3_600_000, // 1 hour
    backend: redisBackend,
  };

  const distributedLimiter = new PerUserRateLimiter(config);
}

setup();
```
## See Also

*   [PerUserRateLimiter](./per-user-rate-limiter.md): The class that consumes this configuration object.
*   [DistributedRateLimitBackend](./distributed-rate-limit-backend.md): The interface for implementing custom distributed backends.
*   [Rate Limiting](../subsystems/rate-limiting.md): The high-level subsystem for controlling resource usage.
## Sources

[Source 1]: src/security/rateLimiter.ts

---

[← Previous: Signature](per-user-rate-limiter-config-part-2.md) | 
*Part 3 of 3*