---
title: PerUserRateLimiter
entity_type: api
summary: A class and factory for enforcing per-identity usage limits including cost, tokens, and turns within a rolling time window.
export_name: PerUserRateLimiter
source_file: src/security/rateLimiter.ts
category: class
stub: false
compiled_at: 2026-04-16T14:35:09.963Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/rateLimiter.ts
confidence: 1
---

## Overview
The `PerUserRateLimiter` is a security and resource management utility designed to enforce usage budgets on a per-identity basis. It extends the YAAF guardrails system to track and limit individual user consumption in multi-tenant environments, preventing single users from exhausting global LLM quotas or exceeding financial budgets.

The limiter tracks three primary metrics—USD cost, token count, and turn count (model calls)—within a rolling time window. It also supports burst limiting via concurrent run tracking and allows specific IAM roles to bypass enforcement.

## Signature / Constructor

### Constructor
```typescript
export class PerUserRateLimiter {
  constructor(config?: PerUserRateLimiterConfig);
}
```

### Factory Function
```typescript
export function perUserRateLimiter(config?: PerUserRateLimiterConfig): PerUserRateLimiter;
```

### Configuration Type
The `PerUserRateLimiterConfig` object defines the enforcement boundaries:

| Property | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `maxCostPerUser` | `number` | Maximum USD cost per user within the window. | `Infinity` |
| `maxTokensPerUser` | `number` | Maximum total tokens per user within the window. | `Infinity` |
| `maxTurnsPerUser` | `number` | Maximum turns (model calls) per user within the window. | `Infinity` |
| `maxConcurrentRuns` | `number` | Maximum concurrent runs per user. | `Infinity` |
| `windowMs` | `number` | Rolling window duration in milliseconds. | `3,600,000` (1h) |
| `gcIntervalMs` | `number` | Frequency of garbage collection for expired entries. | `60,000` (1m) |
| `onLimitEvent` | `function` | Callback triggered when limits are approached or hit. | `undefined` |
| `bypassRoles` | `string[]` | IAM roles that are exempt from rate limiting. | `[]` |

## Methods & Properties

### check()
Evaluates the current usage for a specific user against the configured limits.
```typescript
check(userId: string): RateLimitCheckResult;
```
Returns a `RateLimitCheckResult` containing:
- `blocked`: Boolean indicating if the request should be denied.
- `reason`: Optional string explaining which limit was exceeded.
- `usage`: A `UserUsageSummary` object showing current consumption.

### recordUsage()
Updates the internal tracking state for a user after an LLM interaction or agent turn.
```typescript
recordUsage(userId: string, usage: { cost: number; tokens: number; turns: number }): void;
```

## Events
The limiter does not use a standard EventEmitter but instead triggers the `onLimitEvent` callback defined in the configuration.

### RateLimitEvent
The payload provided to the `onLimitEvent` callback:
```typescript
export type RateLimitEvent = {
  userId: string;
  resource: 'cost' | 'tokens' | 'turns' | 'concurrent';
  current: number;
  limit: number;
  action: 'warning' | 'blocked';
  timestamp: Date;
};
```

## Examples

### Basic Usage
This example demonstrates setting up a limiter with a 1-hour rolling window and checking usage before processing a request.

```typescript
import { PerUserRateLimiter } from 'yaaf';

const limiter = new PerUserRateLimiter({
  maxCostPerUser: 5.00,
  maxTokensPerUser: 100_000,
  maxTurnsPerUser: 50,
  windowMs: 3_600_000,  // 1 hour rolling window
});

// Check before processing a run
const check = limiter.check('user-123');
if (check.blocked) {
  throw new Error(`Rate limit exceeded: ${check.reason}`);
}

// ... perform LLM operations ...

// Record usage after each LLM call
limiter.recordUsage('user-123', { 
  cost: 0.02, 
  tokens: 1500, 
  turns: 1 
});
```

### Using the Factory Function
```typescript
import { perUserRateLimiter } from 'yaaf';

const limiter = perUserRateLimiter({
  maxConcurrentRuns: 2,
  onLimitEvent: (event) => {
    console.warn(`User ${event.userId} hit ${event.resource} limit.`);
  }
});
```