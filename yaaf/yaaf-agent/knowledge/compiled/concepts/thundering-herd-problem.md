---
title: Thundering Herd Problem
entity_type: concept
summary: A situation where many processes or threads contend for a single resource, often after a shared event, leading to performance degradation.
tags:
 - distributed-systems
 - concurrency
search_terms:
 - concurrent resource contention
 - what is a thundering herd
 - preventing simultaneous retries
 - retry storm
 - dogpiling effect
 - jitter in backoff
 - why use jitter for retries
 - exponential backoff problem
 - coordinated retry issue
 - load spike after failure
 - system recovery contention
 - simultaneous wake-up problem
stub: false
compiled_at: 2026-04-24T18:03:31.930Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

The Thundering Herd Problem is a performance issue that occurs [when](../apis/when.md) a large number of processes or clients, which have been waiting for a shared event or resource, are activated simultaneously. This sudden, coordinated rush to access the resource can overwhelm it, leading to cascading failures or severe performance degradation.

In the context of [LLM](./llm.md) agents and distributed systems, this problem often manifests when a dependent service (like an LLM provider's API) becomes temporarily unavailable. If multiple agent instances use a simple, deterministic retry schedule, they will all attempt to reconnect at the exact same time intervals. This synchronized wave of retries can overload the service just as it is recovering, potentially causing it to fail again and creating a cycle of outages.

## How It Works in YAAF

YAAF mitigates the Thundering Herd Problem in its API request [Retry Logic](./retry-logic.md) by implementing a strategy of [Exponential Backoff](./exponential-backoff.md) with [Jitter](./jitter.md) [Source 1]. This mechanism is built into the framework's `withRetry` utility.

The core components of this strategy are:

1.  **Exponential Backoff**: The delay between retry attempts increases exponentially with each failure. For example, the delays might be 500ms, 1000ms, 2000ms, and so on. This naturally spreads out retries over a progressively longer timeframe.
2.  **Jitter**: A random variance is added to each calculated backoff delay. The YAAF `withRetry` utility applies a ±25% jitter [Source 1]. This is the key element that prevents synchronization. Even if multiple clients experience a failure at the same moment and begin their backoff sequence, the random jitter ensures their subsequent retry attempts will occur at slightly different times, desynchronizing the requests and smoothing the load on the recovering resource.

The `computeRetryDelay` function encapsulates this logic, ensuring that API calls made through the `withRetry` helper are automatically staggered, thus preventing the thundering herd effect [Source 1].

## Configuration

The behavior of the retry mechanism that prevents the thundering herd is configurable through the `RetryConfig` object passed to the `withRetry` function. Developers can adjust parameters like the initial delay and the maximum delay to tune the backoff curve.

```typescript
import { withRetry } from "./utils/retry.js"; // Fictional import path
import { model } from "./my-model-provider.js"; // Fictional import path

async function makeResilientApiCall(params: any, signal: AbortSignal) {
  const result = await withRetry(
    () => model.complete(params),
    {
      // The maximum number of times to retry the operation.
      maxRetries: 5,

      // The starting delay, which will be increased exponentially.
      baseDelayMs: 500,

      // A ceiling on the delay to prevent excessively long waits.
      maxDelayMs: 30_000,

      // An AbortSignal to cancel the entire retry loop.
      signal,
    }
  );
  return result;
}
```
In this example, the combination of `baseDelayMs` and the built-in ±25% jitter ensures that retries are staggered to avoid overwhelming the `model.complete` service [Source 1].

## Sources

[Source 1]: src/utils/retry.ts