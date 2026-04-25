---
title: LLM Call Retry Subsystem
entity_type: subsystem
summary: Provides mechanisms for robustly handling transient failures during LLM API calls, including retry logic with exponential backoff.
primary_files:
 - src/knowledge/compiler/retry.ts
exports:
 - RetryOptions
 - withRetry
search_terms:
 - exponential backoff
 - handle LLM API errors
 - retry failed API calls
 - transient failure handling
 - how to make LLM calls reliable
 - "429 Too Many Requests"
 - "500 Internal Server Error"
 - network error handling
 - robust API integration
 - withRetry function
 - YAAF error handling
 - agent resilience
stub: false
compiled_at: 2026-04-24T18:16:28.482Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/retry.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The [LLM](../concepts/llm.md) Call Retry Subsystem provides a robust mechanism for handling transient failures that can occur during asynchronous calls to Large Language Model (LLM) APIs. It aims to prevent entire operations, such as a knowledge compilation run, from failing due to temporary issues like network errors, [Rate Limiting](./rate-limiting.md) (HTTP 429), or temporary server-side problems (HTTP 5xx) [Source 1]. By wrapping LLM calls in [Retry Logic](../concepts/retry-logic.md) with [Exponential Backoff](../concepts/exponential-backoff.md), the subsystem increases the overall resilience and reliability of agents.

## Architecture

The core of this subsystem is the `withRetry` higher-order function. This function accepts another asynchronous function as its primary argument and executes it. If the wrapped function throws an error, the subsystem checks if the error is considered retryable. If it is, `withRetry` waits for a progressively longer delay before attempting to execute the function again. This delay strategy is known as exponential backoff, which helps to avoid overwhelming a struggling API service [Source 1].

The behavior of the retry logic is controlled by an `RetryOptions` object, which allows for fine-grained configuration of the number of attempts, delay timings, and custom error handling logic [Source 1].

## Integration Points

This subsystem is designed to be used by any component within the YAAF framework that makes direct calls to external LLM providers. The source material indicates its use within the knowledge compilation process to ensure that transient API failures do not abort a long-running compilation task [Source 1].

## Key APIs

The primary public API for this subsystem consists of the `withRetry` function and its configuration interface.

- **`withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>`**
  Executes an asynchronous function `fn` and automatically retries it upon failure according to the provided `options`. It returns the promise produced by `fn` upon its first successful execution [Source 1].

  ```typescript
  const result = await withRetry(
    () => generateFn(systemPrompt, userPrompt),
    { maxRetries: 3 },
  )
  ```

- **`RetryOptions`**
  An interface for configuring the retry behavior. Its properties include:
  - `maxRetries`: The maximum number of retry attempts. Defaults to 3.
  - `baseDelayMs`: The initial delay in milliseconds before the first retry. Defaults to 1000.
  - `maxDelayMs`: The maximum delay in milliseconds between retries, acting as a cap on the exponential backoff. Defaults to 30000.
  - `retryOn`: A custom predicate function to determine if a given error should trigger a retry.
  - `onRetry`: A callback function invoked before each retry attempt, useful for logging or monitoring. [Source 1]

## Extension Points

Developers can customize the retry logic on a per-call basis using the `RetryOptions` object, which provides two main extension points:

- **`retryOn: (error: unknown) => boolean`**
  This property allows a developer to supply a custom function that inspects an error and returns `true` if a retry should be attempted or `false` if the error should be thrown immediately. This is critical for distinguishing between transient, retryable errors and permanent, non-retryable errors (e.g., an authentication failure) [Source 1].

- **`onRetry: (attempt: number, error: unknown, delayMs: number) => void`**
  This callback function provides a hook into the retry lifecycle. It is called just before the subsystem waits for the next retry. It receives the current attempt number, the error that caused the failure, and the calculated delay, enabling developers to implement custom logging, metrics emission, or other side effects [Source 1].

## Sources

[Source 1]: src/knowledge/compiler/retry.ts