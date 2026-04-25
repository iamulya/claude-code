---
summary: A class that implements a circuit breaker pattern to prevent unbounded compaction retries.
export_name: CompactionCircuitBreaker
source_file: src/context/circuitBreaker.ts
category: class
title: CompactionCircuitBreaker
entity_type: api
search_terms:
 - context compaction failure
 - prevent infinite loops
 - circuit breaker pattern
 - auto-compaction errors
 - handle oversized context
 - API call optimization
 - consecutive failures
 - auto-reset mechanism
 - stateful error handling
 - compaction retry logic
 - fault tolerance
stub: false
compiled_at: 2026-04-24T16:55:47.037Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/circuitBreaker.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `CompactionCircuitBreaker` class implements a [Circuit Breaker Pattern](../concepts/circuit-breaker-pattern.md) specifically for the context auto-compaction process [Source 1]. Its primary purpose is to prevent an agent from making repeated, failing attempts to compact a context that may be irrecoverably oversized. By doing so, it helps conserve API calls and system resources [Source 1].

[when](./when.md) auto-compaction fails a configured number of times consecutively, the circuit "opens," and subsequent compaction attempts are temporarily blocked. The circuit can automatically "close" again after a timeout period, allowing compaction attempts to resume [Source 1].

This mechanism is inspired by the pattern of setting a maximum number of consecutive auto-compaction failures before halting retries [Source 1].

## Signature / Constructor

The `CompactionCircuitBreaker` is instantiated with an optional configuration object of type `CircuitBreakerConfig`.

```typescript
export type CircuitBreakerConfig = {
  /** Max consecutive failures before opening the circuit. Default: 3. */
  maxConsecutiveFailures?: number;
  /** Auto-reset after this many ms. Default: 300_000 (5 min). */
  autoResetMs?: number;
};

export class CompactionCircuitBreaker {
  constructor(config?: CircuitBreakerConfig);
  // ...
}
```

**Configuration:**

*   **`maxConsecutiveFailures`** (optional `number`): The number of consecutive compaction failures required to open the circuit. Defaults to `3`.
*   **`autoResetMs`** (optional `number`): The duration in milliseconds after which an open circuit will automatically reset to a closed state. Defaults to `300000` (5 minutes).

## Methods & Properties

Based on example usage, the class exposes the following public interface [Source 1]:

*   **`isOpen`**: A boolean property that is `true` if the circuit is open (meaning compaction should be skipped), and `false` otherwise.
*   **`maybeAutoReset()`**: A method that should be called before checking `isOpen`. It handles the time-based logic to automatically reset the circuit if the `autoResetMs` duration has passed.
*   **`recordSuccess()`**: A method to be called after a successful compaction attempt. This resets the consecutive failure count.
*   **`recordFailure()`**: A method to be called after a failed compaction attempt. This increments the consecutive failure count and may open the circuit if the `maxConsecutiveFailures` threshold is reached.

## Examples

The following example demonstrates the typical usage pattern for the `CompactionCircuitBreaker` [Source 1].

```typescript
import { CompactionCircuitBreaker } from 'yaaf';

// Initialize the circuit breaker with a limit of 3 consecutive failures.
const breaker = new CompactionCircuitBreaker({ maxConsecutiveFailures: 3 });

// A placeholder for the actual compaction logic.
async function compact() {
  // ... compaction logic that might throw an error ...
}

// Before attempting compaction:
async function attemptCompaction() {
  // Allow the breaker to reset if the timeout has expired.
  breaker.maybeAutoReset();

  // Only attempt compaction if the circuit is closed.
  if (!breaker.isOpen) {
    try {
      await compact();
      // On success, reset the failure counter.
      breaker.recordSuccess();
      console.log('Compaction successful.');
    } catch (error) {
      // On failure, increment the failure counter.
      breaker.recordFailure();
      console.error('Compaction failed. Circuit breaker may open.');
    }
  } else {
    console.log('Circuit is open. Skipping compaction.');
  }
}
```

## Sources

[Source 1]: src/context/circuitBreaker.ts