---
summary: A problem where many clients simultaneously attempt to access a resource after a shared event, leading to overload, often mitigated by jitter.
title: Thundering Herd
entity_type: concept
see_also:
 - concept:Jitter
 - concept:Exponential Backoff
 - api:withRetry
 - concept:Circuit Breaker Pattern
search_terms:
 - simultaneous client requests
 - coordinated retry problem
 - how to prevent server overload
 - what is jitter for
 - retry storm
 - synchronized failure
 - distributed system contention
 - exponential backoff and jitter
 - load spike after outage
 - why use randomized delay
 - YAAF retry logic
 - concurrent access contention
stub: false
compiled_at: 2026-04-25T00:25:06.970Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

The Thundering Herd Problem is a performance issue that occurs in distributed systems when a large number of clients or processes, which have been waiting for a specific event, are awakened or reactivated simultaneously. This sudden, coordinated rush of activity can overwhelm a shared resource, such as a database, a web server, or an LLM provider's API endpoint [Source 1].

For example, if an external API becomes temporarily unavailable, multiple YAAF agents might enter a retry loop. If their retry logic is deterministic (e.g., "wait 5 seconds, then retry"), they will all attempt to reconnect at the exact same moment. This flood of requests can prevent the recovering service from coming back online, leading to a cycle of failure and synchronized retries [Source 1].

## How It Works in YAAF

YAAF mitigates the Thundering Herd Problem within its core [Retry Logic](./retry-logic.md), specifically in the [withRetry](../apis/with-retry.md) utility function. The primary mechanism for prevention is the application of [Jitter](./jitter.md) to the [Exponential Backoff](./exponential-backoff.md) delay calculation [Source 1].

When an operation fails with a retryable error, the `withRetry` function calculates a delay before the next attempt. Instead of using a fixed delay, it computes a base delay using exponential backoff and then adds or subtracts a random percentage of that time. The comments in the source code indicate this is a ±25% jitter [Source 1].

This randomization ensures that even if multiple agents fail at the same time, their retry attempts are desynchronized and spread out over a time window. This staggered approach gives the recovering resource a chance to handle requests gradually instead of being overwhelmed by a single, massive spike in traffic [Source 1]. The `computeRetryDelay` function is responsible for this calculation, which is then consumed by the main [withRetry](../apis/with-retry.md) execution loop [Source 1].

## See Also

*   [Jitter](./jitter.md): The core technique used to desynchronize client requests.
*   [Exponential Backoff](./exponential-backoff.md): The underlying retry strategy to which jitter is applied.
*   [withRetry](../apis/with-retry.md): The YAAF API that implements retry logic with jitter to prevent this problem.
*   [Circuit Breaker Pattern](./circuit-breaker-pattern.md): A related resiliency pattern that can also help prevent system overload.

## Sources

[Source 1]: src/utils/retry.ts