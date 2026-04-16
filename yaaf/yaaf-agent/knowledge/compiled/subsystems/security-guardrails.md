---
title: Security and Guardrails
entity_type: subsystem
summary: The subsystem responsible for enforcing safety, cost, and usage constraints on agent operations.
primary_files:
  - src/security/rateLimiter.ts
exports:
  - PerUserRateLimiter
  - perUserRateLimiter
  - PerUserRateLimiterConfig
  - RateLimitEvent
  - RateLimitCheckResult
  - UserUsageSummary
stub: false
compiled_at: 2026-04-16T14:35:10.948Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/rateLimiter.ts
confidence: 0.9
---

## Purpose
The Security and Guardrails subsystem provides mechanisms to enforce operational constraints on LLM-powered agents. Its primary goal is to prevent resource exhaustion, manage costs, and ensure fair usage in multi-tenant environments. It addresses risks such as runaway agent loops (turn limits), excessive API costs (budget limits), and infrastructure strain (concurrency and token limits).

## Architecture
The subsystem is built around a consumption-tracking architecture that monitors agent activity against defined thresholds. 

### Per-User Rate Limiting
The core component is the `PerUserRateLimiter`, which tracks usage metrics tied to individual identities. It utilizes a rolling time window strategy where usage data is automatically evicted after a configurable Time-To-Live (TTL). 

Key internal mechanisms include:
- **Rolling Window Management**: Tracks usage within a specific duration (e.g., one hour), ensuring that limits are not strictly tied to calendar hours but to a continuous window of time.
- **Garbage Collection**: Periodically removes expired usage entries from memory to maintain performance and prevent memory leaks.
- **Composite Enforcement**: Supports simultaneous enforcement of multiple resource types (cost, tokens, turns, and concurrency).

## Integration Points
The Security and Guardrails subsystem integrates with the framework's Identity and Access Management (IAM) layer. It specifically utilizes the `UserContext` to identify the actor responsible for a given operation, allowing the framework to apply specific limits based on the user's identity or assigned roles.

## Key APIs
The subsystem exposes APIs for checking limits before execution and recording consumption after execution.

### PerUserRateLimiter
The primary class for managing usage constraints.

- `check(userId: string)`: Evaluates if a user has exceeded any configured limits. Returns a `RateLimitCheckResult` indicating whether the operation should be blocked.
- `recordUsage(userId: string, usage: { cost: number, tokens: number, turns: number })`: Updates the internal counters for a specific user after an LLM interaction or agent turn.

### Factory Function
- `perUserRateLimiter(config?: PerUserRateLimiterConfig)`: A convenience function to instantiate a new limiter with the provided configuration.

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
if (check.blocked) throw new Error(check.reason);

// Record usage after each LLM call
limiter.recordUsage('user-123', { cost: 0.02, tokens: 1500, turns: 1 });
```

## Configuration
The subsystem is configured via the `PerUserRateLimiterConfig` object, which allows fine-grained control over resource thresholds:

| Property | Description | Default |
|----------|-------------|---------|
| `maxCostPerUser` | Maximum USD cost allowed per user within the window. | Infinity |
| `maxTokensPerUser` | Maximum total tokens (input + output) per user. | Infinity |
| `maxTurnsPerUser` | Maximum model calls (turns) per user. | Infinity |
| `maxConcurrentRuns` | Maximum number of simultaneous agent executions per user. | Infinity |
| `windowMs` | The duration of the rolling window in milliseconds. | 3,600,000 (1hr) |
| `gcIntervalMs` | Frequency of the garbage collection process for expired data. | 60,000 (1min) |
| `bypassRoles` | Array of IAM roles that are exempt from rate limiting. | [] |

## Extension Points
Developers can extend the behavior of the Security and Guardrails subsystem through the following mechanisms:

- **Event Callbacks**: The `onLimitEvent` hook allows developers to inject custom logic when a user approaches or hits a limit. This is typically used for alerting, logging, or triggering external billing workflows.
- **Role-Based Bypassing**: By configuring `bypassRoles`, specific administrative or system roles can be granted unlimited access, bypassing the guardrail logic entirely.