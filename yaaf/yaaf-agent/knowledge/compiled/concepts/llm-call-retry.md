---
title: LLM Call Retry
entity_type: concept
summary: A specific application of retry logic to automatically re-attempt failed LLM calls, typically using exponential backoff, to improve resilience against transient API errors.
related_subsystems:
 - Knowledge Compiler
see_also:
 - concept:Retry Logic
 - concept:Exponential Backoff
 - api:withRetry
 - concept:LLM Call
 - concept:Error Classification
search_terms:
 - transient API errors
 - handle 429 errors
 - handle 500 errors
 - LLM API resilience
 - automatic retry for LLM
 - exponential backoff for API calls
 - how to make LLM calls more reliable
 - YAAF retry mechanism
 - network error handling
 - API rate limit handling
 - withRetry function
 - fault tolerance for agents
stub: false
compiled_at: 2026-04-25T00:20:39.848Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/retry.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is
LLM Call Retry is a fault-tolerance mechanism within YAAF that automatically re-attempts a failed [LLM Call](./llm-call.md). This pattern is designed to handle transient, or temporary, failures that can occur when communicating with external LLM provider APIs, such as network interruptions, rate limiting (HTTP 429), or temporary server-side errors (HTTP 500) [Source 1].

The primary purpose of this concept is to enhance the resilience and reliability of agents. By automatically retrying temporary failures, YAAF prevents an entire agent task or compilation run from failing due to a brief, recoverable issue with an external service [Source 1].

## How It Works in YAAF
YAAF implements this concept through the [withRetry](../apis/with-retry.md) utility function. This function wraps an asynchronous operation, such as a call to an LLM provider, and executes it. If the operation throws an error, the retry logic determines if the error is retryable [Source 1].

For retryable errors, the system waits for a calculated delay before attempting the operation again. This process is repeated up to a configured maximum number of attempts. The delay between retries typically increases with each failure, a strategy known as [Exponential Backoff](./exponential-backoff.md), which helps to avoid overwhelming a struggling API [Source 1].

Developers can customize the retry behavior by providing a `retryOn` predicate function. This function receives the error and returns `true` if a retry should be attempted or `false` if the error should be thrown immediately, allowing for fine-grained [Error Classification](./error-classification.md) [Source 1]. Additionally, an `onRetry` callback can be supplied to log information or perform other actions before each new attempt [Source 1].

## Configuration
The behavior of an LLM Call Retry is configured via the `RetryOptions` object passed to the [withRetry](../apis/with-retry.md) function. The available options are:

*   `maxRetries`: The maximum number of times to re-attempt the call. Defaults to 3 [Source 1].
*   `baseDelayMs`: The initial delay in milliseconds before the first retry. Defaults to 1000 [Source 1].
*   `maxDelayMs`: The maximum delay cap between retries, preventing excessively long waits. Defaults to 30000 [Source 1].
*   `retryOn`: A custom function `(error: unknown) => boolean` that determines if a given error should trigger a retry [Source 1].
*   `onRetry`: A callback function `(attempt: number, error: unknown, delayMs: number) => void` executed before each retry attempt [Source 1].

### Example

```typescript
import { withRetry } from 'yaaf';

// An example function that makes an LLM call
async function generateFn(systemPrompt: string, userPrompt: string): Promise<string> {
  // ... implementation for calling an LLM API
}

try {
  const result = await withRetry(
    () => generateFn("You are a helpful assistant.", "Tell me a joke."),
    { maxRetries: 3 }
  );
  console.log("LLM call successful:", result);
} catch (error) {
  console.error("LLM call failed after all retries:", error);
}
```
[Source 1]

## See Also
*   [Retry Logic](./retry-logic.md): The general design pattern for re-executing failed operations.
*   [Exponential Backoff](./exponential-backoff.md): The specific strategy used to increase delays between retries.
*   [withRetry](../apis/with-retry.md): The core API function that implements this concept.
*   [LLM Call](./llm-call.md): The type of operation that is typically wrapped with retry logic.
*   [Error Classification](./error-classification.md): The process of determining which errors are transient and thus retryable.

## Sources
*   [Source 1]: `src/knowledge/compiler/retry.ts`