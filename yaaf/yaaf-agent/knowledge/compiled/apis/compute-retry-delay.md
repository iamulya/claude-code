---
title: computeRetryDelay
entity_type: api
summary: Calculates the next retry delay using exponential backoff, jitter, and respecting Retry-After hints.
export_name: computeRetryDelay
source_file: src/utils/retry.ts
category: function
tags:
 - utility
 - retry
 - timing
search_terms:
 - exponential backoff
 - calculate retry time
 - jitter algorithm
 - how to handle retries
 - delay calculation
 - Retry-After header
 - network request backoff
 - API rate limit handling
 - thundering herd problem
 - retry sleep duration
 - backoff with jitter
 - custom retry logic
 - wait time between attempts
stub: false
compiled_at: 2026-04-24T16:56:56.312Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `computeRetryDelay` function is a utility that calculates the appropriate wait time in milliseconds before the next attempt in a retry loop [Source 1]. It implements an [Exponential Backoff](../concepts/exponential-backoff.md) strategy with [Jitter](../concepts/jitter.md) to prevent multiple clients from retrying simultaneously (a "thundering herd" problem) [Source 1].

This function is a core component of the framework's [Retry Logic](../concepts/retry-logic.md), used internally by the `withRetry` helper. It can also be used directly [when](./when.md) building custom retry mechanisms that require fine-grained control over timing.

The calculation prioritizes `Retry-After` hints found in the error object, if present. If no such hint exists, it calculates the delay using the formula: `baseDelayMs * 2^(attempt - 1)`, adds a random jitter of ±25%, and caps the result at `maxDelayMs` [Source 1].

## Signature

```typescript
export function computeRetryDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  error?: unknown,
): number;
```

**Parameters:**

*   **`attempt`** `number`
    The current retry attempt number. This should be `1` for the first retry, `2` for the second, and so on.

*   **`baseDelayMs`** `number`
    The base delay in milliseconds for the exponential backoff calculation. This is the starting point for the first retry's delay before jitter is applied.

*   **`maxDelayMs`** `number`
    The maximum delay in milliseconds. The calculated delay will not exceed this value, acting as a cap on the exponential growth.

*   **`error`** `unknown` (optional)
    The error that triggered the retry. The function inspects this object for `Retry-After` hints (e.g., from HTTP headers on a rate-limiting error). If a valid hint is found, it overrides the exponential backoff calculation [Source 1].

**Returns:**

*   `number`
    The computed delay in milliseconds that the application should wait before the next attempt.

## Examples

### Basic Exponential Backoff Calculation

This example demonstrates how to calculate the delay for the first three retry attempts with a base delay of 200ms.

```typescript
const baseDelayMs = 200;
const maxDelayMs = 10000;

// For the first retry (attempt = 1)
// Delay will be around 200ms (200 * 2^0) plus/minus jitter
const delay1 = computeRetryDelay(1, baseDelayMs, maxDelayMs);
console.log(`Attempt 1: Wait approximately ${delay1}ms`);

// For the second retry (attempt = 2)
// Delay will be around 400ms (200 * 2^1) plus/minus jitter
const delay2 = computeRetryDelay(2, baseDelayMs, maxDelayMs);
console.log(`Attempt 2: Wait approximately ${delay2}ms`);

// For the third retry (attempt = 3)
// Delay will be around 800ms (200 * 2^2) plus/minus jitter
const delay3 = computeRetryDelay(3, baseDelayMs, maxDelayMs);
console.log(`Attempt 3: Wait approximately ${delay3}ms`);
```

### Respecting a Retry-After Hint

This example shows how the function prioritizes a `Retry-After` value from a simulated error object over the standard backoff calculation.

```typescript
const baseDelayMs = 500;
const maxDelayMs = 30000;

// A simulated error from an API that includes a Retry-After header value in seconds.
// YAAF's internal error handling would typically parse an HTTP response
// and attach this information to the error object.
const rateLimitError = {
  message: "Rate limit exceeded",
  retryAfter: 15, // 15 seconds
};

// Even though this is the first attempt, the function will use the hint.
// The result will be 15000ms.
const delay = computeRetryDelay(1, baseDelayMs, maxDelayMs, rateLimitError);

console.log(`Delay from Retry-After hint: ${delay}ms`); // Expected: 15000
```

## See Also

*   `withRetry`: A higher-level utility that uses `computeRetryDelay` to automatically retry an async operation.
*   `RetryConfig`: The configuration type that provides parameters like `baseDelayMs` and `maxDelayMs` to the `withRetry` function.

## Sources

[Source 1]: src/utils/retry.ts