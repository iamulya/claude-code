---
title: Jitter
entity_type: concept
summary: The addition of a small, random delay to exponential backoff to prevent synchronized retries and 'thundering herd' problems.
tags:
 - reliability
 - distributed-systems
search_terms:
 - thundering herd problem
 - prevent synchronized retries
 - randomized backoff
 - retry delay randomization
 - exponential backoff jitter
 - what is jitter in retries
 - YAAF retry mechanism
 - distributed system contention
 - API rate limit avoidance
 - network error handling
 - decorrelated jitter
 - how to avoid retry storms
stub: false
compiled_at: 2026-04-24T17:56:27.964Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.98
---

## What It Is

Jitter is a technique used in network programming and distributed systems to add a small, random amount of time to a calculated delay interval. In the context of YAAF, jitter is applied to the [Exponential Backoff](./exponential-backoff.md) strategy used for retrying failed operations, such as API calls to an [LLM](./llm.md) provider [Source 1].

The primary problem jitter solves is the "thundering herd" problem. This occurs [when](../apis/when.md) multiple clients experience a simultaneous failure (e.g., a server becomes temporarily unavailable) and are programmed to retry after the same delay. Without jitter, all clients would retry at the exact same moment, overwhelming the recovering server and potentially causing another cascade of failures. By introducing a random component to the retry delay, jitter desynchronizes the clients, spreading their retry attempts over a time window and increasing the likelihood of successful recovery [Source 1].

## How It Works in YAAF

YAAF's retry mechanism, implemented in the `withRetry` utility, incorporates jitter directly into its delay calculation. The framework uses an exponential backoff strategy, where the delay between retries increases exponentially with each failed attempt. Jitter is then applied to this calculated delay [Source 1].

According to the source documentation, YAAF applies a fixed jitter of ±25%. For a given retry attempt, the `computeRetryDelay` function first calculates the base exponential backoff delay. It then modifies this delay by a random factor ranging from -25% to +25%. This ensures that even if two agents start a retry sequence at the same time with the same configuration, their actual retry attempts will occur at slightly different times, preventing lockstep retries [Source 1].

This functionality is a core part of the `withRetry` helper, which handles retrying asynchronous operations while respecting abort signals and provider-specific error types [Source 1].

## Configuration

The jitter percentage (±25%) is a built-in, non-configurable aspect of YAAF's [Retry Logic](./retry-logic.md). However, developers can configure the underlying exponential backoff parameters that the jitter is applied to. This is done via the `RetryConfig` object passed to the `withRetry` function [Source 1].

The configurable parameters that influence the final delay (including jitter) are:
*   `baseDelayMs`: The initial delay for the first retry.
*   `maxDelayMs`: A ceiling on the backoff delay to prevent excessively long waits.
*   `maxRetries`: The total number of attempts.

```typescript
import { withRetry } from "./utils/retry.js";

// Example of configuring the retry mechanism.
// The ±25% jitter is applied automatically to the calculated delay.
const result = await withRetry(
  () => model.complete(params),
  {
    maxRetries: 5,
    baseDelayMs: 1000, // Jitter will be applied to this value on the first retry
    maxDelayMs: 60_000,
  },
);
```

## Sources
[Source 1]: src/utils/retry.ts