---
title: Retry-After Header
entity_type: concept
summary: An HTTP header indicating how long a user agent should wait before making a follow-up request, which takes precedence over standard backoff logic in YAAF.
primary_files:
 - src/utils/retry.ts
tags:
 - http
 - error-handling
search_terms:
 - HTTP rate limiting
 - how to handle 429 errors
 - too many requests error
 - backoff strategy
 - server-guided retry delay
 - exponential backoff vs retry-after
 - YAAF retry logic
 - parsing Retry-After header
 - HTTP-date format
 - retry delay calculation
 - provider error handling
 - what is http retry-after
stub: false
compiled_at: 2026-04-24T18:00:52.475Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

The `Retry-After` header is a standard HTTP response header used by servers to manage client request rates. [when](../apis/when.md) a server is temporarily unable to handle a request, often due to [Rate Limiting](../subsystems/rate-limiting.md) (e.g., responding with a `429 Too Many Requests` status code), it can include the `Retry-After` header to instruct the client on how long to wait before sending another request. The value can be specified either as a number of seconds or as a specific date and time [Source 1].

In YAAF, respecting this header is a critical part of robust communication with [LLM](./llm.md) providers. Providers frequently use rate limits to ensure service stability. By honoring the `Retry-After` header, a YAAF agent acts as a well-behaved client, improving its chances of recovering from transient load issues without being blocked and using a more precise, server-guided backoff strategy.

## How It Works in YAAF

YAAF's core retry mechanism, implemented in the `withRetry` utility, has built-in support for the `Retry-After` header [Source 1]. This support is primarily handled within the `computeRetryDelay` function.

When an operation fails with a retryable error, the framework calculates the delay before the next attempt. The logic gives precedence to any `Retry-After` information carried by the error object. If a valid `Retry-After` value is present, it is parsed and used as the delay, overriding the default [Exponential Backoff](./exponential-backoff.md) with [Jitter](./jitter.md) calculation [Source 1].

The framework is designed to parse both supported formats for the header's value [Source 1]:
1.  **Seconds**: A non-negative integer representing the number of seconds to wait.
2.  **HTTP-date**: A timestamp indicating the earliest time the client should retry.

This server-guided delay is then used by the `withRetry` function to pause execution before the next attempt. If the error does not contain a `Retry-After` hint, the system falls back to its standard exponential backoff strategy [Source 1].

## Sources

[Source 1]: src/utils/retry.ts