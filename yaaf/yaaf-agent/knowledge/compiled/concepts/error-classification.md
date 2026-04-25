---
title: Error Classification
entity_type: concept
summary: The process of categorizing errors to determine appropriate handling, such as whether an operation should be retried.
primary_files:
 - src/errors.ts
tags:
 - error-handling
 - design-pattern
search_terms:
 - is error retryable
 - retryable errors
 - transient vs permanent errors
 - error handling strategy
 - custom error logic
 - YAAFError retryable property
 - network error handling
 - when to retry an operation
 - classifying exceptions
 - provider error types
 - custom isRetryable function
stub: false
compiled_at: 2026-04-24T17:54:50.474Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Error Classification is the process of examining an error to determine its nature and decide on an appropriate response. In a system like YAAF that interacts with external services, not all errors are equal. Some errors are transient (e.g., temporary network outages, [Rate Limiting](../subsystems/rate-limiting.md)), and the failed operation may succeed if attempted again. Other errors are permanent (e.g., an invalid API key, a malformed request), and retrying the operation would be futile.

This concept is crucial for building robust and resilient agents. By correctly classifying errors, the framework can automatically recover from temporary failures using retry mechanisms, while immediately failing on permanent errors. This prevents wasting time and resources on operations that are guaranteed to fail again and allows for more specific error handling logic.

## How It Works in YAAF

In YAAF, error classification is primarily implemented within the `withRetry` utility, which provides [Exponential Backoff](./exponential-backoff.md) [Retry Logic](./retry-logic.md) for asynchronous operations [Source 1]. The decision of whether to retry a failed operation is governed by an `isRetryable` function.

The default behavior for determining if an error is retryable is as follows:
1.  It checks for a `retryable` property on `YAAFError` objects. This allows specific error types within the framework to explicitly declare themselves as retryable or not.
2.  If the error is not a known `YAAFError` type, it falls back to a default assumption, such as treating network-related errors as retryable [Source 1].

This default logic can be overridden for more granular control. The `withRetry` function accepts a `RetryConfig` object, which can include a custom `isRetryable` function. This allows developers to implement their own classification logic tailored to a specific API provider or use case [Source 1]. For example, a custom function could inspect HTTP status codes or specific error messages from a provider's response to decide if a retry is appropriate.

Non-retryable errors are not caught by the retry loop and are re-thrown immediately, allowing for immediate handling by the calling code [Source 1].

## Configuration

A developer can provide a custom error classification strategy by passing an `isRetryable` function in the configuration for the `withRetry` utility.

The following example demonstrates how to configure a retry policy that only considers HTTP 429 (Too Many Requests) and 5xx server errors as retryable.

```typescript
import { withRetry } from "./utils/retry.js";
import { model } from "./some-provider.js";

// A custom error type that might be thrown by a provider client
class ProviderError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'ProviderError';
  }
}

async function makeCancellableApiCall(params: any, signal: AbortSignal) {
  try {
    const result = await withRetry(
      () => {
        // This operation might throw a ProviderError
        return model.complete(params);
      },
      {
        maxRetries: 5,
        signal,
        // Custom error classification logic
        isRetryable: (error: unknown): boolean => {
          if (error instanceof ProviderError) {
            // Retry on "Too Many Requests" or any server-side error
            if (error.statusCode === 429 || error.statusCode >= 500) {
              return true;
            }
          }
          // Do not retry any other errors
          return false;
        },
      }
    );
    console.log("API call successful:", result);
  } catch (error) {
    console.error("API call failed permanently:", error);
  }
}
```

In this example, the custom `isRetryable` function inspects the `statusCode` of a `ProviderError`. If the status indicates a rate limit or a server error, it returns `true`, signaling the `withRetry` utility to attempt the operation again after a delay. For all other errors, it returns `false`, causing `withRetry` to stop and re-throw the error immediately [Source 1].

## Sources

[Source 1] src/utils/retry.ts