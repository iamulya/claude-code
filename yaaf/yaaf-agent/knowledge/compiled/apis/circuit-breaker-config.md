---
title: CircuitBreakerConfig
entity_type: api
summary: Configuration options for the CompactionCircuitBreaker, defining failure thresholds and reset intervals.
export_name: CircuitBreakerConfig
source_file: src/context/circuitBreaker.ts
category: type
stub: false
compiled_at: 2026-04-16T14:16:51.573Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/circuitBreaker.ts
confidence: 1
---

## Overview
`CircuitBreakerConfig` defines the operational parameters for the `CompactionCircuitBreaker`. It is used to prevent "unbounded compaction retries," a state where an agent repeatedly attempts to compact a context that is irrecoverably oversized. By configuring failure thresholds and reset intervals, the framework can stop attempting failed operations to prevent wasting API calls.

## Signature / Constructor
```typescript
export type CircuitBreakerConfig = {
  /** Max consecutive failures before opening the circuit. Default: 3. */
  maxConsecutiveFailures?: number
  /** Auto-reset after this many ms. Default: 300_000 (5 min). */
  autoResetMs?: number
}
```

## Methods & Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `maxConsecutiveFailures` | `number` | (Optional) The maximum number of sequential failures allowed before the circuit transitions to an "open" state. Defaults to `3`. |
| `autoResetMs` | `number` | (Optional) The duration in milliseconds to wait before the circuit breaker automatically resets from an "open" state. Defaults to `300000` (5 minutes). |

## Examples
### Basic Configuration
This example demonstrates defining a custom configuration for a circuit breaker.

```typescript
import { CircuitBreakerConfig } from './context/circuitBreaker';

const config: CircuitBreakerConfig = {
  maxConsecutiveFailures: 5,
  autoResetMs: 60000 // 1 minute
};
```

### Usage with CompactionCircuitBreaker
The configuration is typically passed to the constructor of the circuit breaker.

```typescript
import { CompactionCircuitBreaker, CircuitBreakerConfig } from './context/circuitBreaker';

const config: CircuitBreakerConfig = {
  maxConsecutiveFailures: 3
};

const breaker = new CompactionCircuitBreaker(config);

// Usage logic
if (!breaker.isOpen) {
  try {
    // Attempt compaction logic here
    breaker.recordSuccess();
  } catch (error) {
    breaker.recordFailure();
  }
}
```