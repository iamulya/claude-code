---
title: Usage Quotas
entity_type: concept
summary: Framework-level patterns for managing and limiting resource consumption (tokens, cost, turns) across users or sessions.
related_subsystems:
  - security
stub: false
compiled_at: 2026-04-16T14:35:17.459Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/rateLimiter.ts
confidence: 0.85
---

## What It Is
Usage Quotas are a security and resource management pattern in YAAF designed to prevent resource exhaustion and control operational costs. In multi-tenant or production environments, these quotas ensure that individual users or identities do not exceed predefined thresholds for Large Language Model (LLM) consumption. By enforcing limits on tokens, financial cost, and execution frequency, the framework provides guardrails against both accidental execution loops and intentional resource abuse.

## How It Works in YAAF
The primary implementation of this concept is the `PerUserRateLimiter` class within the `security/rateLimiter` module. It integrates with the framework's Identity and Access Management (IAM) system by using identity contexts to track consumption per user.

The system operates on a **rolling time window** mechanism. Usage data older than the configured window duration is automatically evicted, allowing for continuous, time-bound budgeting (e.g., a maximum number of tokens per hour).

### Tracked Metrics
The framework monitors four primary resource dimensions:
- **Cost**: The cumulative USD value of LLM calls.
- **Tokens**: The total number of input and output tokens processed.
- **Turns**: The number of discrete model interactions or "turns" within a session.
- **Concurrency**: The number of active, simultaneous agent runs permitted per user.

### Enforcement Lifecycle
1. **Check**: Before processing a request or starting a run, the system invokes `limiter.check(userId)`. This returns a `RateLimitCheckResult` indicating whether the user is blocked and providing a `UserUsageSummary`.
2. **Record**: After an LLM interaction or agent step, the system invokes `limiter.recordUsage(userId, usage)` to update the user's consumption metrics.
3. **Eviction**: A background garbage collection process runs at intervals defined by `gcIntervalMs` to remove expired usage entries from memory, ensuring the rolling window remains accurate.

### Alerts and Bypassing
The system supports an `onLimitEvent` callback, which triggers a `RateLimitEvent` when a user approaches or hits a limit. This allows for external logging, user notifications, or administrative alerts. Additionally, specific administrative or system roles can be configured via `bypassRoles` to operate without quota restrictions.

## Configuration
Developers configure usage quotas by passing a `PerUserRateLimiterConfig` object to the `perUserRateLimiter` factory function or the `PerUserRateLimiter` constructor.

```typescript
import { perUserRateLimiter } from 'yaaf';

const limiter = perUserRateLimiter({
  maxCostPerUser: 5.00,       // Limit to $5.00 USD
  maxTokensPerUser: 100_000,  // Limit to 100k tokens
  maxTurnsPerUser: 50,        // Limit to 50 model calls
  windowMs: 3_600_000,        // 1 hour rolling window
  maxConcurrentRuns: 2,       // Prevent more than 2 active runs
  bypassRoles: ['admin'],     // Admins are not restricted
  onLimitEvent: (event) => {
    console.warn(`User ${event.userId} hit ${event.resource} limit`);
  }
});

// Usage check
const check = limiter.check('user-123');
if (check.blocked) {
  console.log(`Blocked: ${check.reason}`);
}
```

## Sources
- `src/security/rateLimiter.ts`