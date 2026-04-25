---
summary: A design pattern used to detect failures and encapsulate the logic of preventing a failing operation from being repeatedly invoked.
title: Circuit Breaker Pattern
entity_type: concept
related_subsystems:
 - Context Management
search_terms:
 - prevent repeated failures
 - error handling pattern
 - fail-fast mechanism
 - stop retrying failing operation
 - context compaction failure
 - CompactionCircuitBreaker
 - unbounded retries
 - API call waste prevention
 - auto-reset failure
 - max consecutive failures
 - irrecoverable context size
stub: false
compiled_at: 2026-04-24T17:53:07.983Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/circuitBreaker.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

The Circuit Breaker is a design pattern used to prevent an application from repeatedly trying to execute an operation that is likely to fail. In YAAF, this pattern is specifically applied to prevent unbounded retries for operations like [Context Window](./context-window.md) auto-compaction [Source 1].

[when](../apis/when.md) an operation such as [Context Compaction](./context-compaction.md) fails multiple times in a row, it may indicate an irrecoverable problem, such as a context that is too large to be processed effectively. Continuously retrying the operation in this state wastes resources, particularly expensive API calls. The Circuit Breaker pattern provides a mechanism to detect these consecutive failures, "open" a circuit to block further attempts for a period, and then allow a limited number of attempts to see if the underlying problem has been resolved [Source 1].

## How It Works in YAAF

YAAF implements this pattern in the `CompactionCircuitBreaker` class, which is designed to manage failures during the context auto-compaction process [Source 1]. The breaker operates as a state machine with two primary states: closed and open.

1.  **Closed State**: This is the default state. The circuit is "closed," and operations are allowed to execute. The `CompactionCircuitBreaker` tracks the outcome of each operation. A successful compaction resets the failure count, which is recorded by calling `recordSuccess()` [Source 1].
2.  **Open State**: If the compaction operation fails consecutively, `recordFailure()` is called. When the number of consecutive failures reaches a configured threshold (`maxConsecutiveFailures`), the circuit transitions to the "open" state. While open, the `isOpen` property returns `true`, and the application should skip the compaction attempt [Source 1].
3.  **Auto-Reset**: After a configured timeout (`autoResetMs`), the circuit can automatically reset itself to the closed state. This is checked via the `maybeAutoReset()` method, which allows the system to try the operation again after a cool-down period [Source 1].

A typical usage pattern involves checking the breaker's state before attempting the operation:

```typescript
// Example usage pattern
const breaker = new CompactionCircuitBreaker({ maxConsecutiveFailures: 3 });

// Before attempting compaction:
breaker.maybeAutoReset(); // Allow timeout-based recovery before checking
if (!breaker.isOpen) {
  try {
    await compact();
    breaker.recordSuccess();
  } catch {
    breaker.recordFailure();
  }
}
```
[Source 1]

## Configuration

The behavior of the `CompactionCircuitBreaker` can be customized through the `CircuitBreakerConfig` object passed to its constructor [Source 1].

-   `maxConsecutiveFailures`: The number of consecutive failures allowed before the circuit opens. The default value is 3 [Source 1].
-   `autoResetMs`: The duration in milliseconds after which an open circuit will automatically close. The default is 300,000 (5 minutes) [Source 1].

```typescript
import { CompactionCircuitBreaker } from './path/to/circuitBreaker';

// Configure the circuit breaker to open after 2 failures
// and reset after 10 minutes.
const customBreaker = new CompactionCircuitBreaker({
  maxConsecutiveFailures: 2,
  autoResetMs: 600_000, // 10 minutes
});
```

## Sources

[Source 1]: src/context/circuitBreaker.ts