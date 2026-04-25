---
summary: Manages structured error reporting, classification, and integration with retry mechanisms across YAAF, ensuring consistent error propagation and handling.
primary_files:
 - src/errors.ts
title: Error Handling System
entity_type: subsystem
exports:
 - YAAFError
 - ErrorCode
 - classifyAPIError
 - parseRetryAfterHeader
search_terms:
 - exception handling
 - YAAFError class
 - retryable errors
 - rate limit handling
 - how to catch YAAF errors
 - API error classification
 - Retry-After header parsing
 - structured exceptions
 - error codes
 - provider-specific errors
 - diagnosing LLM failures
 - framework error types
stub: false
compiled_at: 2026-04-25T00:28:21.336Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/errors.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Error Handling System provides a standardized, hierarchical framework for managing errors throughout YAAF. Its primary purpose is to replace generic, untyped exceptions with structured, typed errors that can be programmatically inspected and handled [Source 1]. This enables robust application logic for scenarios like conditional retries, multi-provider diagnostics, and user-facing error reporting.

The system is designed around several key principles [Source 1]:
- **Unified Catching**: All framework-specific errors extend a common base class, `YAAFError`, allowing for a single catch block to handle all YAAF exceptions.
- **Machine-Readability**: Every error includes a `code` property from the [ErrorCode](../apis/error-code.md) set, providing a stable, machine-readable identifier for the error type.
- **Retry Logic Integration**: A `retryable` boolean flag on each error signals to higher-level systems, such as the [LLM Call Retry Subsystem](./llm-call-retry-subsystem.md), whether an operation can be safely attempted again.
- **Multi-Provider Diagnostics**: An optional `provider` string helps disambiguate errors when an agent interacts with multiple external services, aiding in [Multi-Provider Diagnostics](../concepts/multi-provider-diagnostics.md).

## Architecture

The core of the subsystem is the `YAAFError` base class, which extends the native JavaScript `Error` class. All other custom errors within the YAAF framework are expected to inherit from `YAAFError` [Source 1].

Each `YAAFError` instance carries a standard set of properties:
- `code`: A value from the [ErrorCode](../apis/error-code.md) type, such as `RATE_LIMIT`, `API_ERROR`, or `SANDBOX_VIOLATION`.
- `retryable`: A boolean indicating if the failed operation is likely to succeed on a subsequent attempt.
- `provider`: An optional string identifying the source of the error (e.g., the name of an LLM provider).

Subclasses of `YAAFError` can add domain-specific fields to carry more context. For example, a `RateLimitError` might include a `retryAfterMs` property to inform [Retry Logic](../concepts/retry-logic.md) how long to wait before the next attempt [Source 1].

The system also provides utility functions to bridge the gap between low-level network responses and the typed error hierarchy. The `classifyAPIError` function, for instance, inspects HTTP status codes and response bodies to construct the appropriate `YAAFError` subclass [Source 1].

The following example demonstrates the intended usage pattern for catching and handling YAAF errors [Source 1]:
```typescript
try {
  await model.complete(params);
} catch (err) {
  if (err instanceof RateLimitError) {
    console.log(`Retry after ${err.retryAfterMs}ms`);
  } else if (err instanceof YAAFError) {
    console.log(`${err.code}: ${err.message} [retryable=${err.retryable}]`);
  }
}
```

## Integration Points

The Error Handling System is a foundational subsystem that integrates with many other parts of YAAF:

- **[LLM Adapters](./llm-adapters.md)**: Model adapters use `classifyAPIError` to translate raw HTTP errors from provider APIs into structured `YAAFError` instances, ensuring consistent error reporting regardless of the underlying LLM [Source 1].
- **[Retry Logic](../concepts/retry-logic.md)**: The `retryable` property and `retryAfterMs` data on errors like rate limit exceptions are consumed by retry mechanisms to implement strategies like exponential backoff [Source 1].
- **[Sandbox System](./sandbox-system.md)**: The sandbox can throw a `YAAFError` with the code `SANDBOX_VIOLATION` to signal that a tool has attempted an unauthorized action [Source 1].
- **[Authorization System](./authorization-system.md)**: This system can raise errors with the `PERMISSION_DENIED` code to enforce access controls [Source 1].

## Key APIs

- **`YAAFError`**: The base class for all custom errors within the framework. It provides the core properties (`code`, `retryable`, `provider`) that unify error handling [Source 1].
- **[ErrorCode](../apis/error-code.md)**: A string literal type that defines the set of machine-readable error codes used across the framework [Source 1].
- **[classifyAPIError](../apis/classify-api-error.md)**: A utility function used primarily by [LLM Adapters](./llm-adapters.md) to convert raw HTTP responses (status code, body, headers) into a specific `YAAFError` subclass [Source 1].
- **[parseRetryAfterHeader](../apis/parse-retry-after-header.md)**: A helper function that parses the `Retry-After` HTTP header, supporting both seconds-based and date-based formats, and returns the delay in milliseconds. This is crucial for correctly handling rate limits [Source 1].

## Sources

[Source 1]: src/errors.ts