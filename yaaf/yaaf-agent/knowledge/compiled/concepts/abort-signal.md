---
title: Abort Signal
entity_type: concept
summary: A standard mechanism for signaling that an asynchronous operation should be cancelled.
tags:
 - concurrency
 - cancellation
search_terms:
 - cancel async operation
 - how to stop a request
 - AbortController
 - request cancellation
 - stopping long-running tasks
 - YAAF retry cancellation
 - signal propagation
 - asynchronous cancellation
 - timeout handling
 - preventing retries
 - AbortError
stub: false
compiled_at: 2026-04-24T17:50:50.522Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

An Abort Signal is a standard mechanism for notifying an asynchronous operation that it should be cancelled. It is based on the `AbortController` and `AbortSignal` interfaces from the web platform. In YAAF, it provides a uniform way to gracefully terminate long-running tasks, such as model inference calls or complex retry loops, preventing wasted computation and resources. [when](../apis/when.md) an operation is aborted, it allows the system to clean up and stop further processing, such as subsequent retry attempts [Source 1].

## How It Works in YAAF

YAAF integrates Abort Signals into its asynchronous [Utilities](../subsystems/utilities.md), most notably the `withRetry` function. This function, which handles operations with [Exponential Backoff](./exponential-backoff.md), accepts an optional `signal` property in its configuration object [Source 1].

When an `AbortSignal` is provided, it is monitored throughout the operation's lifecycle. If the signal is triggered (i.e., aborted), two things happen:
1.  If the system is in a waiting period between retry attempts, the wait is immediately cancelled [Source 1].
2.  The `withRetry` function will throw an `AbortError`, allowing the calling code to catch and handle the cancellation explicitly [Source 1].

This pattern of "signal propagation" ensures that a cancellation request is respected not only by the currently executing task but also by the [Retry Logic](./retry-logic.md) that orchestrates it [Source 1].

## Configuration

To use an Abort Signal with a YAAF utility like `withRetry`, a developer first creates an `AbortController` instance. The `signal` property of this controller is then passed into the configuration of the YAAF function. The operation can be cancelled at any time by calling the controller's `abort()` method.

```typescript
// 1. Create an AbortController
const controller = new AbortController();
const signal = controller.signal;

// Example: Cancel the operation after 10 seconds
const timeoutId = setTimeout(() => controller.abort(), 10000);

try {
  // 2. Pass the signal to a YAAF function
  const result = await withRetry(
    () => model.complete(params),
    { maxRetries: 5, signal },
  );
  // If successful, clear the timeout
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('The operation was successfully aborted.');
  } else {
    // Handle other errors
    console.error('An unexpected error occurred:', error);
  }
}
```
In this example, the `withRetry` function will attempt the `model.complete` call up to five times. However, if 10 seconds pass, `controller.abort()` is called, which will cause `withRetry` to throw an `AbortError` and cease any further attempts [Source 1].

## Sources

[Source 1]: src/utils/retry.ts