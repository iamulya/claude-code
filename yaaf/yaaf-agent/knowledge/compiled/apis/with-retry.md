---
title: withRetry
entity_type: api
summary: Executes an asynchronous operation with exponential backoff retry, jitter, and abort signal support.
export_name: withRetry
source_file: src/utils/retry.ts
category: function
tags:
 - utility
 - retry
 - error-handling
 - concurrency
search_terms:
 - exponential backoff
 - retry logic for API calls
 - handle transient errors
 - network error handling
 - API rate limit handling
 - how to retry failed requests
 - jitter in retries
 - AbortSignal with retry
 - YAAF error handling
 - resilient API calls
 - RetryExhaustedError
 - custom retry predicate
 - transient failure
stub: false
compiled_at: 2026-04-24T17:49:44.406Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/retry.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `withRetry` function is a utility for executing an asynchronous operation with a robust, configurable retry mechanism. It is designed to handle transient failures, such as network errors or temporary API issues (e.g., HTTP 429 or 500 status codes), without failing the entire process [Source 1].

Key features include [Source 2]:
*   **[Exponential Backoff](../concepts/exponential-backoff.md)**: The delay between retries increases exponentially with each attempt, preventing immediate, repeated calls to a struggling service.
*   **[Jitter](../concepts/jitter.md)**: A random variance (±25%) is added to the delay to prevent the "thundering herd" problem where multiple clients retry simultaneously.
*   **AbortSignal Support**: The retry loop can be cancelled prematurely via a standard `AbortSignal`, which will also cancel any in-progress delay.
*   **Customizable Logic**: Callers can provide custom logic to determine which errors are retryable and execute callbacks before each retry attempt for logging or telemetry.
*   **Typed Errors**: Throws a `RetryExhaustedError` [when](./when.md) all attempts fail, or an `AbortError` if the operation is cancelled. Non-retryable errors are re-thrown immediately.
*   **`Retry-After` Header Support**: If an error contains a `Retry-After` hint (in seconds or as an HTTP-date), that delay will be used, taking precedence over the calculated backoff delay.

## Signature

The primary signature for this utility is defined in `src/utils/retry.ts` [Source 2].

```typescript
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  config?: RetryConfig
): Promise<T>
```

### Parameters

*   `operation: (attempt: number) => Promise<T>`: The asynchronous function to execute. It receives the current attempt number (starting from 1) and should return a `Promise` that resolves with the operation's result.
*   `config?: RetryConfig`: An optional configuration object to customize the retry behavior.

### Configuration (`RetryConfig`)

The `config` object accepts the following properties [Source 2]:

| Property | Type | Description |
| :--- | :--- | :--- |
| `maxRetries` | `number` | Maximum number of retry attempts. **Default: 5**. |
| `baseDelayMs` | `number` | The base delay in milliseconds for the first retry, used in the exponential backoff calculation. **Default: 500**. |
| `maxDelayMs` | `number` | The maximum delay in milliseconds, capping the exponential growth. **Default: 30,000**. |
| `signal` | `AbortSignal` | An optional `AbortSignal` to cancel the operation and any pending retry delays. |
| `isRetryable` | `(error: unknown) => boolean` | A custom predicate function to determine if an error should be retried. By default, it uses `YAAFError.retryable` and considers network errors retryable. |
| `onRetry` | `(info: RetryInfo) => void \| boolean \| Promise<void \| boolean>` | A callback executed before each retry sleep. It receives an object with details about the attempt. Returning `false` from this callback will abort the retry loop. |

The `info` object passed to `onRetry` has the following shape:
```typescript
{
  attempt: number;
  maxRetries: number;
  error: unknown;
  delayMs: number;
}
```

### Discrepancies

An alternative, simpler signature for `withRetry` exists in `src/knowledge/compiler/retry.ts` for internal use within the compiler subsystem [Source 1]. This version has different defaults and property names in its options object (`RetryOptions`).

Key differences in the alternative signature:
*   The operation function does not receive the `attempt` number: `fn: () => Promise<T>`.
*   `maxRetries` defaults to **3**.
*   `baseDelayMs` defaults to **1000**.
*   The retry predicate is named `retryOn` instead of `isRetryable`.
*   The `onRetry` callback has a simpler signature: `(attempt: number, error: unknown, delayMs: number) => void`.

## Examples

### Basic Retry for an API Call

This example shows how to wrap a model completion call with `withRetry`, specifying a maximum of 5 retries and providing an `AbortSignal` for cancellation.

```typescript
import { withRetry } from 'yaaf/utils';
import { model } from './my-llm-provider';

async function generateText(params: any, signal: AbortSignal) {
  try {
    const result = await withRetry(
      // The operation receives the current attempt number
      (attempt) => {
        console.log(`Attempting to call model, attempt #${attempt}...`);
        return model.complete(params);
      },
      {
        maxRetries: 5,
        signal, // Pass the signal to make the retry loop cancellable
        onRetry: ({ attempt, error, delayMs }) => {
          console.warn(`Attempt ${attempt} failed. Retrying in ${delayMs}ms. Error:`, error);
        }
      }
    );
    return result;
  } catch (error) {
    // Catches RetryExhaustedError, AbortError, or a non-retryable error
    console.error("Failed to generate text after multiple retries:", error);
    throw error;
  }
}
```
[Source 2]

## Sources

*   [Source 1] `src/knowledge/compiler/retry.ts`
*   [Source 2] `src/utils/retry.ts`