---
summary: Provides a summary of a user's current resource usage for rate limiting purposes.
export_name: UserUsageSummary
source_file: src/security/rateLimiter.ts
category: type
title: UserUsageSummary
entity_type: api
search_terms:
 - rate limit usage
 - user resource consumption
 - track user activity
 - rate limiter state
 - cost tracking
 - token counting
 - turn counting
 - concurrent request limit
 - usage window
 - what is UserUsageSummary
 - rate limit check result
 - per-user limits
stub: false
compiled_at: 2026-04-24T17:47:03.915Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiter.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `UserUsageSummary` type is a data structure that represents a snapshot of a single user's resource consumption within the current rate-limiting window [Source 1]. It is a key component of the YAAF security subsystem, specifically used by the `PerUserRateLimiter`.

This object is returned as part of the `RateLimitCheckResult` type, providing detailed context on why a user's request might be allowed or blocked. It tracks multiple dimensions of usage, including computational cost, token count, number of turns, and concurrent operations [Source 1].

## Signature

`UserUsageSummary` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type UserUsageSummary = {
  cost: number;
  tokens: number;
  turns: number;
  concurrentRuns: number;
  windowStart: number;
};
```

### Fields

-   **`cost`**: `number`
    The cumulative computational or monetary cost accrued by the user in the current window.
-   **`tokens`**: `number`
    The total number of [LLM](../concepts/llm.md) tokens processed for the user in the current window.
-   **`turns`**: `number`
    The number of agent invocations or conversational turns taken by the user in the current window.
-   **`concurrentRuns`**: `number`
    The number of agent runs currently in progress for this user.
-   **`windowStart`**: `number`
    A timestamp (typically milliseconds since the Unix epoch) indicating [when](./when.md) the current rate-limiting window began for this user.

## Examples

`UserUsageSummary` is not instantiated directly but is received as part of a `RateLimitCheckResult` object when checking if a user has exceeded their limits.

```typescript
import { PerUserRateLimiter, RateLimitCheckResult } from 'yaaf';

// Assume a rate limiter instance exists
declare const rateLimiter: PerUserRateLimiter;
declare const userId: string;

async function checkUserLimit(userId: string) {
  const result: RateLimitCheckResult = await rateLimiter.check(userId);

  if (result.blocked) {
    console.log(`User ${userId} is blocked. Reason: ${result.reason}`);
    
    // Access the usage summary for detailed logging or metrics
    const usage: UserUsageSummary = result.usage;
    console.log(`Usage at time of block:`);
    console.log(`- Turns: ${usage.turns}`);
    console.log(`- Tokens: ${usage.tokens}`);
    console.log(`- Cost: ${usage.cost}`);
    console.log(`- Concurrent Runs: ${usage.concurrentRuns}`);
    console.log(`- Window started at: ${new Date(usage.windowStart).toISOString()}`);
  } else {
    console.log(`User ${userId} is within limits.`);
  }
}
```

## See Also

-   `RateLimitCheckResult`: The object that contains a `UserUsageSummary`.
-   `PerUserRateLimiter`: The class that generates and uses `UserUsageSummary` data.

## Sources

[Source 1] `src/security/rateLimiter.ts`