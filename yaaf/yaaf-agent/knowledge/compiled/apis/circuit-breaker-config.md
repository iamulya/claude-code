---
summary: Configuration options for the CompactionCircuitBreaker.
export_name: CircuitBreakerConfig
source_file: src/context/circuitBreaker.ts
category: type
title: CircuitBreakerConfig
entity_type: api
search_terms:
 - compaction failure settings
 - auto-compaction retry limit
 - context window error handling
 - prevent infinite compaction loops
 - maxConsecutiveFailures
 - autoResetMs
 - configure CompactionCircuitBreaker
 - circuit breaker options
 - LLM context overflow prevention
 - API call waste reduction
 - oversized context recovery
stub: false
compiled_at: 2026-04-24T16:54:56.147Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/circuitBreaker.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`CircuitBreakerConfig` is a TypeScript type that defines the configuration options for the `CompactionCircuitBreaker` class [Source 1]. It allows developers to customize the behavior of the circuit breaker, which is designed to prevent repeated, failing attempts to compact an oversized agent context. By configuring the number of tolerated failures and the reset timeout, users can avoid wasting API calls on contexts that may be irrecoverably large [Source 1].

## Signature

The `CircuitBreakerConfig` type is an object with the following optional properties [Source 1]:

```typescript
export type CircuitBreakerConfig = {
  /** Max consecutive failures before opening the circuit. Default: 3. */
  maxConsecutiveFailures?: number;
  /** Auto-reset after this many ms. Default: 300_000 (5 min). */
  autoResetMs?: number;
};
```

### Properties

- **`maxConsecutiveFailures`** `?number`
  - The maximum number of consecutive compaction failures allowed before the circuit breaker "opens," temporarily halting further compaction attempts.
  - Defaults to `3` if not specified [Source 1].

- **`autoResetMs`** `?number`
  - The duration in milliseconds after which an "open" circuit will automatically reset to a "half-open" state, allowing a single new compaction attempt.
  - Defaults to `300_000` (5 minutes) if not specified [Source 1].

## Examples

### Default Configuration

If no configuration is provided to the `CompactionCircuitBreaker` constructor, it uses the default values.

```typescript
import { CompactionCircuitBreaker } from 'yaaf';

// Uses default: { maxConsecutiveFailures: 3, autoResetMs: 300_000 }
const breaker = new CompactionCircuitBreaker();
```

### Custom Configuration

To customize the circuit breaker's behavior, pass a `CircuitBreakerConfig` object to the `CompactionCircuitBreaker` constructor. The following example configures the breaker to open after 5 consecutive failures and to attempt a reset after 10 minutes.

```typescript
import { CompactionCircuitBreaker, CircuitBreakerConfig } from 'yaaf';

const customConfig: CircuitBreakerConfig = {
  maxConsecutiveFailures: 5,
  autoResetMs: 10 * 60 * 1000, // 10 minutes
};

const breaker = new CompactionCircuitBreaker(customConfig);

// Now, compaction will be blocked after 5 failures in a row,
// and will not be re-attempted for at least 10 minutes.
```

## See Also

- `CompactionCircuitBreaker`: The class that consumes this configuration type to manage the state of [Context Compaction](../concepts/context-compaction.md) attempts.

## Sources

[Source 1]: src/context/circuitBreaker.ts