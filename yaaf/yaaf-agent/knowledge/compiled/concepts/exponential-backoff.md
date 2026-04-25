---
title: Exponential Backoff
entity_type: concept
summary: A strategy for retrying failed operations with progressively longer delays between attempts to improve reliability when interacting with external services.
tags:
 - reliability
 - distributed-systems
search_terms:
 - retry failed requests
 - how to handle API errors
 - network error handling
 - thundering herd problem
 - jitter in retries
 - Retry-After header
 - withRetry utility
 - YAAF error handling
 - resilient API calls
 - progressive delay
 - backoff strategy
 - RetryExhaustedError
 - transient failure
stub: false
compiled_at: 2026-04-24T17:55:10.843Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.98
---

## What It Is

Exponential Backoff is an error handling strategy used to retry a failed operation, such as a network request, with an increasing delay between each attempt. The delay grows exponentially with each subsequent retry. This pattern is crucial for building robust agents that interact with remote services which may experience transient failures.

The primary purpose of this strategy is to give a temporarily overloaded or unavailable service time to recover. By waiting longer after each failure, the client avoids overwhelming the service with rapid, repeated requests, which could worsen the problem.

YAAF's implementation also includes "[Jitter](./jitter.md)," which adds a small, random amount of time to each delay. This prevents a "thundering herd" scenario where multiple clients, having experienced failure at the same time, would all retry in synchronized waves. Jitter spreads out the retry attempts, smoothing the load on the recovering service [Source 1].

## How It Works in YAAF

In YAAF, exponential backoff is implemented by the `withRetry` utility function. This function wraps an asynchronous operation and automatically handles the [Retry Logic](./retry-logic.md) based on a provided configuration [Source 1].

The process is as follows:
1.  The `withRetry` function executes the provided `operation`.
2.  If the operation fails, the error is checked to see if it is retryable. By default, this is determined by the `YAAFError.retryable` property or if it's a generic network error. This logic can be customized with the `isRetryable` function in the configuration [Source 1].
3.  If the error is not retryable, it is immediately re-thrown.
4.  If the error is retryable, the `computeRetryDelay` function calculates the wait time. This calculation is based on the attempt number, a base delay, and a maximum delay cap. It also incorporates a random jitter of ±25% to prevent synchronized retries [Source 1].
5.  Crucially, if the error response from a service includes a `Retry-After` header (in either seconds or HTTP-date format), that value takes precedence over the calculated exponential delay [Source 1].
6.  The system then waits for the determined delay. This waiting period can be interrupted by an `AbortSignal`, which will cancel the entire retry process [Source 1].
7.  An optional `onRetry` callback is invoked before the wait, allowing for logging or other telemetry on each attempt [Source 1].
8.  After the delay, the process repeats from step 1, up to a configured `maxRetries` limit.
9.  If all attempts are exhausted, a `RetryExhaustedError` is thrown [Source 1].

## Configuration

The behavior of the retry mechanism is configured via the `RetryConfig` object passed to the `withRetry` function.

```typescript
// Example of wrapping a model call with custom retry logic
import { withRetry } from 'yaaf/utils';
import { model } from './my-model-provider.js';

async function callModelWithRetry(params: any, signal: AbortSignal) {
  const result = await withRetry(
    () => model.complete(params),
    {
      maxRetries: 5,         // Attempt up to 5 times after the initial failure
      baseDelayMs: 1000,     // Start with a 1-second delay
      maxDelayMs: 60_000,    // Cap the delay at 60 seconds
      signal: signal,        // Propagate cancellation
      onRetry: ({ attempt, error, delayMs }) => {
        console.log(`Attempt ${attempt} failed. Retrying in ${delayMs}ms...`, error);
      }
    }
  );
  return result;
}
```

The key configuration options are [Source 1]:
*   `maxRetries`: The maximum number of times to retry the operation after the first attempt fails. Defaults to 5.
*   `baseDelayMs`: The initial delay in milliseconds for the first retry, which grows exponentially. Defaults to 500.
*   `maxDelayMs`: The maximum possible delay, which caps the exponential growth. Defaults to 30,000.
*   `signal`: An `AbortSignal` that can be used to cancel the operation and any pending retry delays.
*   `isRetryable`: A custom function `(error: unknown) => boolean` to decide if a given error should trigger a retry.
*   `onRetry`: A callback function invoked before each retry attempt, useful for logging and [Observability](./observability.md).

## Sources
[Source 1] src/utils/retry.ts