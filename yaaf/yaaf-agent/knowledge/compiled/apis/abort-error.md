---
title: AbortError
entity_type: api
summary: An error indicating that an operation was aborted, typically via an `AbortSignal`.
export_name: AbortError
source_file: src/errors.ts
category: class
tags:
 - error-handling
 - concurrency
search_terms:
 - operation cancelled
 - request aborted
 - AbortSignal error
 - how to handle cancellation
 - asynchronous operation cancelled
 - YAAF cancellation
 - error for aborted task
 - withRetry abort
 - signal aborted error
 - concurrency cancellation
 - promise cancellation
 - task termination error
stub: false
compiled_at: 2026-04-24T16:46:43.760Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`AbortError` is a specialized error class in YAAF used to indicate that an asynchronous operation was intentionally cancelled before it could complete. This is a common pattern for managing long-running tasks, allowing them to be terminated cleanly.

This error is typically thrown [when](./when.md) an `AbortSignal` passed to an operation is triggered. For example, the `withRetry` utility function throws an `AbortError` if its `signal` option is aborted during the operation or while waiting between retries [Source 1]. This allows calling code to distinguish between a genuine failure (e.g., `RetryExhaustedError`) and a deliberate cancellation, enabling different handling logic for each case.

## Signature / Constructor

`AbortError` is exported from `src/errors.ts`. Based on its usage alongside `YAAFError` in imports, it is a subclass of the base `YAAFError` [Source 1].

The specific constructor signature for `AbortError` is not detailed in the provided source materials. However, it is instantiated and thrown by YAAF [Utilities](../subsystems/utilities.md) when an associated `AbortSignal` is fired.

```typescript
// Source: src/utils/retry.ts [Source 1]
import { YAAFError, AbortError, RetryExhaustedError, type ErrorCode } from "../errors.js";
```

## Examples

The most common use case for `AbortError` is catching it when using a YAAF utility that supports cancellation, such as `withRetry`.

The following example demonstrates how to use an `AbortController` to cancel a `withRetry` operation and then catch the resulting `AbortError`.

```typescript
import { withRetry, AbortError } from 'yaaf';

async function performCancellableOperation() {
  const controller = new AbortController();
  const signal = controller.signal;

  // Schedule the operation to be aborted after 500ms
  setTimeout(() => controller.abort(), 500);

  try {
    console.log('Starting operation with retry...');
    const result = await withRetry(
      async (attempt) => {
        console.log(`Attempt ${attempt}: waiting for 2 seconds...`);
        // Simulate a long-running task
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'Operation completed successfully';
      },
      { maxRetries: 5, signal }
    );
    console.log('Success:', result);
  } catch (error) {
    if (error instanceof AbortError) {
      console.error('Caught AbortError: The operation was cancelled as expected.');
    } else {
      console.error('An unexpected error occurred:', error);
    }
  }
}

performCancellableOperation();
// Expected output:
// Starting operation with retry...
// Attempt 1: waiting for 2 seconds...
// Caught AbortError: The operation was cancelled as expected.
```

## See Also

*   **withRetry**: A utility function that can throw `AbortError` when its operation is cancelled via an `AbortSignal` [Source 1].
*   **YAAFError**: The base error class from which `AbortError` likely inherits.
*   **RetryExhaustedError**: Another error thrown by `withRetry` to indicate that all retry attempts have failed, distinct from an `AbortError`.

## Sources

[Source 1] `src/utils/retry.ts`