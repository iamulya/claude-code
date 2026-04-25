---
title: RetryExhaustedError
entity_type: api
summary: An error thrown by the `withRetry` utility when all configured retry attempts have failed.
export_name: RetryExhaustedError
source_file: src/errors.ts
category: class
tags:
 - error-handling
 - retry
search_terms:
 - retry failed error
 - withRetry exception
 - all retries failed
 - exponential backoff error
 - handling failed operations
 - YAAF error handling
 - max retries reached
 - what error does withRetry throw
 - retry loop exhausted
 - transient error handling failure
 - final retry attempt failed
 - error after multiple attempts
stub: false
compiled_at: 2026-04-24T17:33:31.447Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`RetryExhaustedError` is a specialized error class thrown by the `withRetry` utility function [Source 1]. It signifies that an asynchronous operation has failed to complete successfully even after being retried the maximum number of configured times.

This error is thrown only [when](./when.md) the underlying operation repeatedly fails with errors that are considered retryable. If a non-retryable error occurs, it is thrown immediately without exhausting the retry attempts. `RetryExhaustedError` is a subclass of `YAAFError` and typically wraps the last error that caused the final attempt to fail [Source 1].

Users should catch this specific error type to handle the terminal failure of an operation that was expected to potentially recover from transient issues.

## Signature / Constructor

`RetryExhaustedError` is a class that extends the base `YAAFError` class. While its specific constructor is not detailed in the provided source, it is instantiated by the `withRetry` function when the `maxRetries` limit is reached.

```typescript
// Conceptual signature
class RetryExhaustedError extends YAAFError {
  // The constructor is internal to the framework's [[[[[[[[Retry Logic]]]]]]]].
  // It likely captures the number of attempts and the last error encountered.
}
```

## Methods & Properties

As a subclass of the standard `Error` and `YAAFError`, `RetryExhaustedError` inherits standard properties:

*   **`name`**: `string` - The name of the error, which will be "RetryExhaustedError".
*   **`message`**: `string` - A description of the error, indicating that all retries have failed.
*   **`stack`**: `string | undefined` - The stack [Trace](../concepts/trace.md).
*   **`cause`**: `unknown | undefined` - In modern JavaScript environments, this property often holds the last error object that caused the retry loop to terminate.

It may also inherit properties from `YAAFError`, such as `code` and `retryable`.

## Examples

The primary use case for `RetryExhaustedError` is to handle the final failure state of a `withRetry` call in a `try...catch` block.

```typescript
import { withRetry, RetryExhaustedError } from 'yaaf';

// An example function that always fails.
async function fetchUnreliableResource() {
  console.log('Attempting to fetch resource...');
  throw new Error('Network connection timed out');
}

async function main() {
  try {
    const resource = await withRetry(fetchUnreliableResource, {
      maxRetries: 3,
      baseDelayMs: 100,
    });
    console.log('Resource fetched successfully:', resource);
  } catch (error) {
    if (error instanceof RetryExhaustedError) {
      // This block executes after the operation has failed 4 times
      // (1 initial attempt + 3 retries).
      console.error(
        `Failed to fetch resource after all retries.`,
        error.message
      );
      // You can inspect the `cause` property for the last underlying error.
      if (error.cause) {
        console.error('The last error was:', error.cause);
      }
    } else {
      // Handle other potential errors, like non-retryable ones.
      console.error('An unexpected error occurred:', error);
    }
  }
}

main();
```

## See Also

*   **`withRetry`**: The utility function that orchestrates the Retry Logic and throws this error.
*   **`YAAFError`**: The base error class from which `RetryExhaustedError` inherits.
*   **`AbortError`**: Another error type thrown by `withRetry` when an operation is cancelled via an `AbortSignal`.

## Sources

[Source 1] `src/utils/retry.ts`