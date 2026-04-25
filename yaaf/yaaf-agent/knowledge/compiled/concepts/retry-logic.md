---
title: Retry Logic
entity_type: concept
summary: A framework mechanism for automatically re-attempting failed operations, particularly transient network or API errors, based on structured error types and backoff strategies.
related_subsystems:
 - LLM Adapters
see_also:
 - "[Error Classification](./error-classification.md)"
 - "[Error Retryability](./error-retryability.md)"
 - "[Exponential Backoff](./exponential-backoff.md)"
 - "[Jitter](./jitter.md)"
 - "[Circuit Breaker Pattern](./circuit-breaker-pattern.md)"
 - "[Retry-After Header](./retry-after-header.md)"
search_terms:
 - handling transient errors
 - automatic retries for API calls
 - exponential backoff implementation
 - how to retry failed LLM calls
 - YAAF error handling
 - transient failure
 - idempotent operations
 - rate limit handling
 - "503 service unavailable retry"
 - "429 too many requests"
 - jitter in retries
 - circuit breaker for LLM
 - RETRY_EXHAUSTED error
stub: false
compiled_at: 2026-04-25T00:24:01.523Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/errors.ts
compiled_from_quality: unknown
confidence: 0.8
---

## What It Is

Retry Logic is a mechanism within YAAF to automatically re-attempt failed operations that are likely to succeed on a subsequent try. This is essential for building robust agents that interact with external network services, such as [LLM](./llm.md) providers or web-based tools, which can experience transient failures.

The primary goal of Retry Logic is to handle temporary issues like network hiccups, server overloads, or rate limiting without failing the entire agent task. It distinguishes between these temporary, *retryable* errors and permanent, *non-retryable* errors (e.g., authentication failures, invalid requests) that would fail immediately regardless of retries.

## How It Works in YAAF

YAAF's retry mechanism is built upon its structured error hierarchy, where all framework-specific errors extend a base `YAAFError` class [Source 1]. This design is central to implementing reliable retry behavior.

1.  **Error Classification**: When an operation like an API call fails, the responsible component (e.g., an LLM adapter) catches the low-level error. It uses a utility function like `classifyAPIError` to convert the raw response (e.g., an HTTP status code and body) into a specific, typed `YAAFError` subclass, such as `RateLimitError` or `APIConnectionError` [Source 1].

2.  **Retryable Flag**: Every `YAAFError` instance carries a boolean `retryable` property. The classification step sets this flag based on the nature of the error. For example, an HTTP `503 Service Unavailable` would result in an error with `retryable: true`, while a `401 Unauthorized` would have `retryable: false` [Source 1].

3.  **Decision and Delay**: Higher-level framework logic inspects the `retryable` flag of the caught error.
    *   If `true`, the framework waits for a specified delay before re-issuing the request.
    *   For certain errors like rate limiting, YAAF can parse the `Retry-After` HTTP header using the `parseRetryAfterHeader` utility to respect the server's specific backoff request [Source 1]. This is more precise than a generic [Exponential Backoff](./exponential-backoff.md) strategy.
    *   If `false`, the error is immediately propagated up the call stack, failing the operation.

4.  **Exhaustion**: The retry mechanism is configured with a maximum number of attempts. If the operation continues to fail and exhausts all retries, a `RETRY_EXHAUSTED` error is thrown, indicating a persistent failure [Source 1].

This systematic approach, based on typed errors and explicit retryability flags, allows YAAF to handle transient failures gracefully and predictably across different subsystems and external service providers.

## See Also

*   [Error Classification](./error-classification.md): The process of converting raw errors into structured YAAF errors.
*   [Error Retryability](./error-retryability.md): The concept of an error having a `retryable` property.
*   [Exponential Backoff](./exponential-backoff.md): A common strategy for increasing delay between retries.
*   [Jitter](./jitter.md): A technique used with backoff to prevent the [Thundering Herd Problem](./thundering-herd-problem.md).
*   [Circuit Breaker Pattern](./circuit-breaker-pattern.md): An advanced pattern to prevent repeated calls to a failing service.
*   [Retry-After Header](./retry-after-header.md): A specific HTTP header used by servers to manage rate limiting.

## Sources

[Source 1]: src/errors.ts