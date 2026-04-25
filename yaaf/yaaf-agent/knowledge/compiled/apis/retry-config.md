---
title: RetryConfig
entity_type: api
summary: Defines the configuration options for the `withRetry` utility, including retry attempts, delays, and error handling.
export_name: RetryConfig
source_file: src/utils/retry.ts
category: type
tags:
 - configuration
 - retry
search_terms:
 - retry logic configuration
 - exponential backoff settings
 - how to configure withRetry
 - set max retries
 - custom retry delay
 - abort signal for retries
 - isRetryable function
 - onRetry callback
 - network error handling
 - API call resilience
 - transient error handling
 - configure jitter
 - Retry-After header
stub: false
compiled_at: 2026-04-24T17:33:12.616Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`RetryConfig` is a type alias for a configuration object used by the `withRetry` utility function. It allows developers to customize the behavior of the [Retry Logic](../concepts/retry-logic.md) for asynchronous operations, such as calls to an [LLM](../concepts/llm.md) provider. The configuration covers the number of attempts, the delay strategy ([Exponential Backoff](../concepts/exponential-backoff.md)), custom error handling logic, cancellation, and [Observability](../concepts/observability.md) hooks [Source 1].

This configuration is essential for building resilient agents that can gracefully handle transient network errors or temporary service unavailability from external APIs [Source 1].

## Signature

`RetryConfig` is a type alias for an object with the following properties [Source 1]:

```typescript
export type RetryConfig = {
  /** Maximum number of retry attempts (default: 5) */
  maxRetries?: number;

  /** Base delay in ms for exponential backoff (default: 500) */
  baseDelayMs?: number;

  /** Maximum delay in ms (cap on exponential growth, default: 30_000) */
  maxDelayMs?: number;

  /** AbortSignal — cancels both the operation and the retry sleep */
  signal?: AbortSignal;

  /**
   * Custom function to determine if an error is retryable.
   * Default: uses YAAFError.retryable, falls back to true for network errors.
   */
  isRetryable?: (error: unknown) => boolean;

  /**
   * Called before each retry sleep — useful for logging or telemetry.
   * Return false to abort the retry loop.
   */
  onRetry?: (info: {
    attempt: number;
    maxRetries: number;
    error: unknown;
    delayMs: number;
  }) => void | boolean | Promise<void | boolean>;
};
```

### Properties

*   **`maxRetries`** `?number`
    The maximum number of times to retry the operation after the initial failure. Defaults to `5`.

*   **`baseDelayMs`** `?number`
    The initial delay in milliseconds for the exponential backoff calculation. Defaults to `500`.

*   **`maxDelayMs`** `?number`
    The maximum possible delay in milliseconds between retries, acting as a cap on the exponential growth. Defaults to `30_000`.

*   **`signal`** `?AbortSignal`
    An `AbortSignal` that can be used to cancel the entire retry process, including any pending delay. If the signal is aborted, `withRetry` will throw an `AbortError`.

*   **`isRetryable`** `?(error: unknown) => boolean`
    An optional function that receives an error and returns `true` if the operation should be retried, or `false` if it should fail immediately. The default implementation considers errors where `YAAFError.retryable` is true, and also assumes most generic network errors are retryable.

*   **`onRetry`** `?(info: object) => void | boolean | Promise<void | boolean>`
    An optional callback function that is executed before each retry attempt. It receives an object with details about the current attempt, the error that caused it, and the calculated delay. This is useful for logging or telemetry. If the function returns `false`, the retry loop will be aborted.

## Examples

### Basic Usage

Configure `withRetry` to attempt an operation up to 3 times.

```typescript
import { withRetry, RetryConfig } from 'yaaf';
import { model } from './my-llm-provider';

async function callModelWithRetry(params: any, signal?: AbortSignal) {
  const retryConfig: RetryConfig = {
    maxRetries: 3,
    signal,
  };

  const result = await withRetry(
    () => model.complete(params),
    retryConfig,
  );

  return result;
}
```

### Advanced Configuration with Logging

Configure `withRetry` with a custom backoff strategy and an `onRetry` callback for logging.

```typescript
import { withRetry, RetryConfig } from 'yaaf';
import { model } from './my-llm-provider';

async function callModelWithAdvancedRetry(params: any) {
  const retryConfig: RetryConfig = {
    maxRetries: 5,
    baseDelayMs: 1000, // Start with a 1-second delay
    maxDelayMs: 60000, // Cap at 1 minute
    onRetry: ({ attempt, maxRetries, error, delayMs }) => {
      console.log(
        `Attempt ${attempt}/${maxRetries} failed. Retrying in ${delayMs}ms...`,
        error
      );
    },
  };

  try {
    const result = await withRetry(() => model.complete(params), retryConfig);
    return result;
  } catch (error) {
    console.error("Operation failed after all retries.", error);
    throw error;
  }
}
```

## See Also

*   `withRetry`: The utility function that consumes the `RetryConfig` object to perform operations with retry logic.
*   `RetryExhaustedError`: The error thrown by `withRetry` [when](./when.md) all retry attempts have been exhausted.
*   `AbortError`: The error thrown by `withRetry` when the operation is cancelled via the `AbortSignal`.

## Sources

[Source 1]: src/utils/retry.ts