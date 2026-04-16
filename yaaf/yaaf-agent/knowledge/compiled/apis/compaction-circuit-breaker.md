---
title: CompactionCircuitBreaker
entity_type: api
summary: A circuit breaker that prevents unbounded context compaction retries after consecutive failures.
export_name: CompactionCircuitBreaker
source_file: src/context/circuitBreaker.ts
category: class
stub: false
compiled_at: 2026-04-16T14:16:41.280Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/circuitBreaker.ts
confidence: 1
---

## Overview
The `CompactionCircuitBreaker` is a utility class designed to manage the reliability of context compaction processes. It prevents the system from entering an infinite loop of failing compaction attempts, which would otherwise waste LLM API calls and compute resources on contexts that are irrecoverably oversized or causing persistent errors.

The implementation is inspired by standard patterns where a threshold of consecutive failures (defaulting to 3) triggers a "circuit open" state, halting further attempts for a cooldown period (defaulting to 5 minutes).

## Signature / Constructor

### CircuitBreakerConfig
```typescript
export type CircuitBreakerConfig = {
  /** Max consecutive failures before opening the circuit. Default: 3. */
  maxConsecutiveFailures?: number
  /** Auto-reset after this many ms. Default: 300_000 (5 min). */
  autoResetMs?: number
}
```

### Constructor
```typescript
constructor(config?: CircuitBreakerConfig)
```

## Methods & Properties

### isOpen
*   **Type**: `boolean`
*   **Description**: A getter that returns `true` if the circuit is currently open (tripped), indicating that compaction should not be attempted.

### recordSuccess()
*   **Description**: Resets the consecutive failure counter to zero and closes the circuit if it was open.

### recordFailure()
*   **Description**: Increments the consecutive failure counter. If the counter reaches the `maxConsecutiveFailures` threshold, the circuit enters the open state.

## Examples

### Basic Usage
The following example demonstrates how to wrap a compaction call with the circuit breaker to prevent redundant failures.

```typescript
const breaker = new CompactionCircuitBreaker({ 
  maxConsecutiveFailures: 3,
  autoResetMs: 300_000 
});

// Before attempting compaction:
if (!breaker.isOpen) {
  try {
    await compact();
    breaker.recordSuccess();
  } catch (error) {
    breaker.recordFailure();
    console.error("Compaction failed, failure recorded.");
  }
} else {
  console.warn("Compaction skipped: Circuit breaker is open.");
}
```

## Sources
- `src/context/circuitBreaker.ts`