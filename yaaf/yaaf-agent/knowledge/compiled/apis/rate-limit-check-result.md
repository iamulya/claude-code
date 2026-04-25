---
summary: Defines the result object returned after a rate limit check.
export_name: RateLimitCheckResult
source_file: src/security/rateLimiter.ts
category: type
title: RateLimitCheckResult
entity_type: api
search_terms:
 - rate limit check response
 - what does rate limiter return
 - check if user is blocked
 - rate limit usage summary
 - user rate limit status
 - blocked request reason
 - PerUserRateLimiter check result
 - rate limit enforcement object
 - user usage data
 - concurrent run count
 - token usage tracking
 - is request allowed
stub: false
compiled_at: 2026-04-24T17:31:21.489Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/rateLimiter.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `RateLimitCheckResult` type defines the structure of the object returned by [Rate Limiting](../subsystems/rate-limiting.md) checks, such as those performed by the `PerUserRateLimiter` class [Source 1]. This object provides a clear indication of whether a user's request should be allowed or blocked based on current usage and configured limits. It also includes a summary of the user's consumption across various metrics within the current time window [Source 1].

This type is fundamental for implementing rate-limiting logic, as it contains all the necessary information to enforce limits and provide feedback, such as logging the reason for a blocked request or returning an appropriate HTTP status code (e.g., 429 Too Many Requests).

## Signature

`RateLimitCheckResult` is a TypeScript type alias for an object with the following properties [Source 1]:

```typescript
export type RateLimitCheckResult = {
  /**
   * If true, the request has exceeded a configured limit and should be blocked.
   */
  blocked: boolean;

  /**
   * If blocked is true, this field provides a human-readable reason,
   * e.g., "Exceeded max turns per user".
   */
  reason?: string;

  /**
   * A snapshot of the user's current usage metrics within the rate limit window.
   */
  usage: UserUsageSummary;
};
```

The `usage` property is of type `UserUsageSummary`, which has the following structure [Source 1]:

```typescript
export type UserUsageSummary = {
  /**
   * The cumulative cost consumed by the user in the current window.
   */
  cost: number;

  /**
   * The cumulative number of tokens processed for the user in the current window.
   */
  tokens: number;

  /**
   * The number of turns (requests) made by the user in the current window.
   */
  turns: number;

  /**
   * The number of currently active/concurrent runs for the user.
   */
  concurrentRuns: number;

  /**
   * The timestamp (in milliseconds since epoch) when the current rate limit window started for this user.
   */
  windowStart: number;
};
```

## Examples

The following example demonstrates how to use the `RateLimitCheckResult` object returned from a `PerUserRateLimiter` instance to decide whether to process a request.

```typescript
import { PerUserRateLimiter, RateLimitCheckResult } from 'yaaf';

// Assume limiter is configured and instantiated
const limiter = new PerUserRateLimiter({
  maxTurnsPerUser: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
});

const userId = 'user-abc-123';
const requestCost = 5; // An arbitrary cost for this specific operation

async function handleIncomingRequest(userId: string, cost: number) {
  const result: RateLimitCheckResult = await limiter.check(userId, cost);

  if (result.blocked) {
    console.warn(
      `Request blocked for user ${userId}. Reason: ${result.reason}. ` +
      `Current usage: ${JSON.stringify(result.usage)}`
    );
    // In a web server, you would return a 429 status code here.
    return { status: 429, body: `Too Many Requests: ${result.reason}` };
  }

  console.log(`Request allowed for user ${userId}.`);
  console.log('Current usage summary:', result.usage);
  
  // Proceed with the actual request processing
  return { status: 200, body: "Request processed successfully." };
}

handleIncomingRequest(userId, requestCost);
```

## See Also

- `PerUserRateLimiter`: The class that performs rate limit checks and returns `RateLimitCheckResult` objects.
- `UserUsageSummary`: The type detailing a user's resource consumption, nested within `RateLimitCheckResult`.

## Sources

[Source 1]: src/security/rateLimiter.ts