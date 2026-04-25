---
title: RetryOptions
entity_type: api
summary: Defines options for configuring retry logic with exponential backoff.
export_name: RetryOptions
source_file: src/knowledge/compiler/retry.ts
category: interface
search_terms:
 - exponential backoff configuration
 - how to configure retries
 - transient API failure handling
 - LLM call retry settings
 - maxRetries option
 - baseDelayMs option
 - custom retry predicate
 - onRetry callback
 - network error handling
 - rate limit handling
 - withRetry options
 - configure API call resilience
 - API error recovery
stub: false
compiled_at: 2026-04-24T17:33:32.254Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/retry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `RetryOptions` interface provides a set of configuration parameters for customizing the retry behavior of asynchronous operations, particularly for [LLM](../concepts/llm.md) API calls [Source 1]. It is used in conjunction with the `withRetry` function to handle transient failures such as network errors, [Rate Limiting](../subsystems/rate-limiting.md) (HTTP 429), or temporary server issues (HTTP 5xx) gracefully [Source 1].

By specifying these options, developers can implement resilient API call logic with [Exponential Backoff](../concepts/exponential-backoff.md), preventing a single transient failure from halting an entire process [Source 1]. This is crucial for building robust agents that interact with potentially unreliable external services.

## Signature

`RetryOptions` is an interface with the following optional properties [Source 1]:

```typescript
export interface RetryOptions {
  /** 
   * Maximum number of retry attempts.
   * @default 3 
   */
  maxRetries?: number;

  /** 
   * The base delay in milliseconds before the first retry.
   * This delay increases exponentially with subsequent retries.
   * @default 1000 
   */
  baseDelayMs?: number;

  /** 
   * The maximum delay in milliseconds between retries.
   * This acts as a cap on the exponential backoff calculation.
   * @default 30000 
   */
  maxDelayMs?: number;

  /** 
   * A custom predicate function that determines whether a retry should be
   * attempted based on the error received. Return `true` to retry, or `false`
   * to re-throw the error immediately.
   */
  retryOn?: (error: unknown) => boolean;

  /** 
   * A callback function that is executed before each retry attempt.
   * It receives the current attempt number, the error that caused the failure,
   * and the calculated delay before the next attempt.
   */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}
```

## Examples

### Basic Usage

This example shows how to override the default number of retries and the base delay for an asynchronous function call.

```typescript
import { withRetry, RetryOptions } from 'yaaf';

// A function that might fail transiently
async function callUnreliableApi(): Promise<{ data: string }> {
  // ... implementation
  return { data: 'success' };
}

const options: RetryOptions = {
  maxRetries: 5,
  baseDelayMs: 2000, // Start with a 2-second delay
};

try {
  const result = await withRetry(() => callUnreliableApi(), options);
  console.log('API call successful:', result);
} catch (error) {
  console.error('API call failed after all retries:', error);
}
```

### Advanced Usage with Custom Logic

This example demonstrates using `retryOn` to only retry on specific error types and `onRetry` for logging each attempt.

```typescript
import { withRetry, RetryOptions } from 'yaaf';

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

async function callApiWithRateLimiting(): Promise<string> {
  if (Math.random() > 0.5) {
    throw new RateLimitError('Too many requests');
  }
  return 'Data received';
}

const advancedOptions: RetryOptions = {
  maxRetries: 3,
  // Only retry if the error is an instance of RateLimitError
  retryOn: (error: unknown) => error instanceof RateLimitError,
  // Log each retry attempt
  onRetry: (attempt, error, delayMs) => {
    console.log(
      `Attempt ${attempt} failed. Retrying in ${delayMs}ms. Error:`,
      (error as Error).message
    );
  },
};

try {
  const result = await withRetry(callApiWithRateLimiting, advancedOptions);
  console.log('Success:', result);
} catch (error) {
  console.error('The operation failed permanently:', error);
}
```

## See Also

*   `withRetry`: The function that consumes `RetryOptions` to execute an operation with [Retry Logic](../concepts/retry-logic.md).

## Sources

[Source 1] `src/knowledge/compiler/retry.ts`