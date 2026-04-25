---
primary_files:
 - src/errors.ts
summary: The concept of errors carrying information about whether an operation can be retried and, if so, when.
title: Error Retryability
entity_type: concept
search_terms:
 - retry logic
 - handling transient errors
 - YAAF error types
 - is an error retryable
 - backoff strategy
 - rate limit handling
 - API error classification
 - YAAFError retryable property
 - how to retry failed operations
 - transient vs permanent failures
 - retryAfterMs
 - parse Retry-After header
stub: false
compiled_at: 2026-04-24T17:55:06.532Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/errors.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Error Retryability is a core design principle in YAAF where error objects are structured to carry explicit metadata about whether the failed operation can be safely attempted again [Source 1]. This distinguishes transient failures, such as temporary network issues or API rate limits, from permanent failures, like authentication errors or invalid requests.

This concept allows the framework and developers to build more resilient agents. Instead of relying on fragile logic like parsing error messages, code can inspect a simple boolean property on the error object to decide whether to implement a retry strategy, such as [Exponential Backoff](./exponential-backoff.md). For certain retryable errors, the error object may also contain specific guidance on [when](../apis/when.md) to retry, such as a delay in milliseconds [Source 1].

## How It Works in YAAF

The implementation of error retryability is centered around the YAAF error hierarchy, with `YAAFError` as the base class for all framework-specific errors [Source 1].

Key components of this system include:

*   **`YAAFError` Base Class**: Every error thrown by the framework extends `YAAFError`. This base class includes a `retryable` boolean property, providing a unified way to check if an operation can be retried [Source 1].
*   **Specialized Error Subclasses**: Subclasses of `YAAFError` provide more specific information. For example, a `RateLimitError` would not only be marked as `retryable` but might also include a `retryAfterMs` field indicating the precise delay required before the next attempt [Source 1].
*   **[Error Classification](./error-classification.md)**: YAAF includes utility functions like `classifyAPIError` that are used by subsystems, such as model provider adapters, to convert generic errors (e.g., from an HTTP response) into structured, typed YAAF errors. This function analyzes HTTP status codes, headers, and body content to determine the correct error type and its retryability status [Source 1].
*   **Header Parsing**: To support server-provided retry information, YAAF provides helpers like `parseRetryAfterHeader`. This function can parse the standard `Retry-After` HTTP header, which may contain either a delay in seconds or a specific date, and convert it into milliseconds for use in [Retry Logic](./retry-logic.md) [Source 1].

A typical [workflow](./workflow.md) involves catching an error, checking if it's an instance of `YAAFError`, and then inspecting its `retryable` property. If it is true, the application can wait and retry the operation.

```typescript
try {
  // some YAAF operation
} catch (err) {
  if (err instanceof RateLimitError) {
    console.log(`Retry after ${err.retryAfterMs}ms`);
    // Logic to wait and retry
  } else if (err instanceof YAAFError && err.retryable) {
    console.log(`${err.code}: This error is retryable. Retrying...`);
    // Generic retry logic
  } else if (err instanceof YAAFError) {
    console.log(`${err.code}: ${err.message} [retryable=${err.retryable}]`);
    // Logic to handle non-retryable error
  }
}
```
*Example from source documentation demonstrating how to use retryability properties on caught errors [Source 1].*

## Sources

[Source 1]: src/errors.ts