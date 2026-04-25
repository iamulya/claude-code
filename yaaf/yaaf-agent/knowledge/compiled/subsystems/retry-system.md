---
summary: Provides robust retry mechanisms for asynchronous operations, including exponential backoff, jitter, and error classification.
title: Retry System
entity_type: subsystem
primary_files:
 - src/utils/retry.ts
exports:
 - withRetry
 - computeRetryDelay
 - RetryConfig
search_terms:
 - exponential backoff
 - how to retry failed operations
 - jitter implementation
 - handle transient errors
 - Retry-After header support
 - cancellable retry
 - abort signal with retry
 - network error handling
 - resilient API calls
 - thundering herd prevention
 - YAAF error handling
 - asynchronous operation retry
stub: false
compiled_at: 2026-04-25T00:30:24.179Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Retry System provides a robust, configurable mechanism for retrying failed asynchronous operations, which is essential for building resilient agents that interact with potentially unreliable network services like LLM providers [Source 1]. It aims to handle transient failures gracefully by automatically re-executing an operation according to a defined strategy. The system's features include [Exponential Backoff](../concepts/exponential-backoff.md), [Jitter](../concepts/jitter.md), support for the [Retry-After Header](../concepts/retry-after-header.md), and integration with the standard [Abort Signal](../concepts/abort-signal.md) for cancellation [Source 1].

## Architecture

The Retry System is implemented as a set of utility functions, with the `[[withRetry]]` higher-order function at its core. This function wraps an asynchronous `operation` and executes it. If the operation fails with an error deemed retryable, the system calculates a delay and waits before attempting the operation again [Source 1].

The key components of its architecture are:

- **Retry Loop**: The `[[withRetry]]` function contains the main logic that attempts the operation up to a configured number of times (`maxRetries`) [Source 1].
- **Delay Calculation**: The `[[computeRetryDelay]]` function calculates the wait time before the next attempt. It primarily uses an [Exponential Backoff](../concepts/exponential-backoff.md) algorithm, but it will prioritize the delay specified in a [Retry-After Header](../concepts/retry-after-header.md) if the error provides one. To prevent the "thundering herd" problem where multiple clients retry simultaneously, a ±25% [Jitter](../concepts/jitter.md) is applied to the calculated delay [Source 1].
- **[Error Classification](../concepts/error-classification.md)**: A configurable `isRetryable` function determines whether a given error should trigger a retry. By default, it checks the `retryable` property on a `YAAFError` and considers most network errors to be retryable. Non-retryable errors are re-thrown immediately [Source 1].
- **Cancellation**: The system integrates with the standard web [Abort Signal](../concepts/abort-signal.md) API. If the provided signal is aborted, any pending delay is immediately cancelled, and the `[[withRetry]]` function rejects with an `AbortError` [Source 1].
- **Error Handling**: If all retry attempts are exhausted without success, the system throws a `[[RetryExhaustedError]]` that wraps the last error encountered [Source 1].
- **[Observability](../concepts/observability.md)**: An `onRetry` callback can be provided in the configuration. This function is invoked before each retry attempt, allowing for logging, telemetry, or other side effects [Source 1].

## Integration Points

The Retry System is a core utility designed to be used by other subsystems that perform network I/O or other fallible operations.

- **[LLM Client System](./llm-client-system.md)**: This is a primary consumer, using `[[withRetry]]` to wrap API calls to LLM providers, making them resilient to transient network issues or rate limiting.
- **[Logging System](./logging-system.md) & [Telemetry System](./telemetry-system.md)**: These can integrate via the `onRetry` callback to record retry attempts, delays, and the errors that caused them, providing valuable operational insights.
- **[Agent Core](./agent-core.md)**: Any agent logic involving external API calls can leverage this system to improve reliability. The [Abort Signal](../concepts/abort-signal.md) integration allows long-running retry loops to be cleanly cancelled if the agent's task is aborted.

## Key APIs

- **`[[withRetry]]`**: The main entry point for the subsystem. It takes an asynchronous `operation` function and a `[[RetryConfig]]` object and returns a promise that resolves with the operation's result or rejects if all retries fail [Source 1].
- **`[[computeRetryDelay]]`**: A utility function that calculates the appropriate delay in milliseconds for a given attempt number and error, applying exponential backoff and jitter logic [Source 1].
- **`[[RetryConfig]]`**: The interface for the configuration object passed to `[[withRetry]]`. It allows customization of retry behavior [Source 1].
- **`[[RetryExhaustedError]]`**: A custom error class thrown by `[[withRetry]]` when the maximum number of retries has been reached without a successful outcome [Source 1].

## Configuration

Configuration is provided on a per-call basis through the `[[RetryConfig]]` object passed to the `[[withRetry]]` function. Key parameters include:

- `maxRetries`: The maximum number of retry attempts. Defaults to 5 [Source 1].
- `baseDelayMs`: The initial delay for the exponential backoff calculation. Defaults to 500ms [Source 1].
- `maxDelayMs`: The maximum possible delay, capping the exponential growth. Defaults to 30,000ms [Source 1].
- `signal`: An `AbortSignal` to enable cancellation of the retry loop [Source 1].

Example usage:
```typescript
const result = await withRetry(
  () => model.complete(params),
  { maxRetries: 5, signal },
);
```
[Source 1]

## Extension Points

The Retry System's behavior can be customized via the `[[RetryConfig]]` object:

- **`isRetryable`**: Developers can supply a custom function to implement domain-specific [Error Classification](../concepts/error-classification.md). This function receives the error and must return `true` if a retry should be attempted [Source 1].
- **`onRetry`**: A callback function that is executed before each retry attempt. It receives details about the current attempt, the error, and the calculated delay. This serves as a hook for logging, metrics, or other side effects. Returning `false` from this callback will abort the retry loop [Source 1].

## Sources

[Source 1]: src/utils/retry.ts