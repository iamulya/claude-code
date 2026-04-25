---
title: Telemetry
entity_type: subsystem
summary: Provides hooks and callbacks within YAAF components for developers to integrate external logging, monitoring, and observability tools.
primary_files:
 - src/utils/retry.ts
tags:
 - observability
 - monitoring
 - logging
exports:
 - withRetry
 - RetryConfig
search_terms:
 - how to monitor agents
 - YAAF observability
 - logging agent errors
 - retry attempt metrics
 - onRetry callback
 - instrumenting YAAF
 - operational data collection
 - agent performance monitoring
 - hook into retries
 - custom logging
 - transient error reporting
 - monitoring API calls
stub: false
compiled_at: 2026-04-24T18:20:13.972Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/retry.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The Telemetry subsystem in YAAF provides mechanisms for observing the internal state and operations of agents and framework components. Rather than implementing a specific logging or metrics solution, YAAF exposes hooks at critical points, allowing developers to integrate their own [Observability](../concepts/observability.md) [Tools](./tools.md). This enables the collection of operational data, such as transient errors, retry attempts, and performance metrics, for monitoring, debugging, and analysis [Source 1].

## Architecture

YAAF's approach to telemetry is based on callbacks and configuration hooks embedded within various [Utilities](./utilities.md) and components. There is no central telemetry service within the framework itself. Instead, components that perform observable actions (like network requests) offer ways to subscribe to events.

For example, the `withRetry` utility, which handles operations with [Exponential Backoff](../concepts/exponential-backoff.md), includes an `onRetry` callback in its configuration. This function serves as a dedicated extension point for telemetry. It is invoked before each retry attempt, providing contextual information about the failure and the subsequent delay. This decentralized architecture allows developers to pipe operational data into any external system (e.g., logging services, metrics collectors) without the framework imposing a specific tool [Source 1].

## Key APIs

The primary API for telemetry integration shown in the source material is the `onRetry` callback within the `RetryConfig` type, used by the `withRetry` utility.

### `RetryConfig.onRetry`

The `onRetry` property is an optional function that is called before a retry attempt is made. It is designed specifically for logging and telemetry purposes [Source 1].

```typescript
// From the RetryConfig type
onRetry?: (info: {
  attempt: number;
  maxRetries: number;
  error: unknown;
  delayMs: number;
}) => void | boolean | Promise<void | boolean>;
```

-   **`info.attempt`**: The current retry attempt number (e.g., 1 for the first retry).
-   **`info.maxRetries`**: The total number of retries configured.
-   **`info.error`**: The error that triggered the retry.
-   **`info.delayMs`**: The calculated delay in milliseconds before the next attempt.

A developer can use this callback to log transient errors or send metrics to a monitoring service [Source 1].

## Configuration

Telemetry is configured on a per-component or per-operation basis. For operations using the `withRetry` utility, developers provide the `onRetry` callback within the `RetryConfig` object passed to the function [Source 1].

```typescript
import { withRetry } from "./utils/retry.js";
import { myLogger, myMetrics } from "./my-observability-tools.js";

async function someFallibleOperation() {
  // ...
}

const result = await withRetry(
  () => someFallibleOperation(),
  {
    maxRetries: 5,
    onRetry: ({ attempt, error, delayMs }) => {
      // Log the retry attempt
      myLogger.warn(`Operation failed, retrying attempt ${attempt}...`, { error, delayMs });

      // Increment a metrics counter
      myMetrics.increment('operation.retries');
    },
  }
);
```

## Extension Points

The primary extension point for telemetry is the implementation of callback functions like `onRetry`. By providing a custom function, developers can execute any logic required to integrate with their chosen observability stack. The callback can be used to:

-   Log detailed error information to a file or logging service.
-   Increment counters in a metrics system (e.g., Prometheus, Datadog) to track retry rates.
-   Create events or spans in a distributed tracing system to visualize the lifecycle of a request.

The `onRetry` function can also conditionally stop the retry loop by returning `false`, allowing for dynamic control based on telemetry data or external signals [Source 1].

## Sources

[Source 1] `src/utils/retry.ts`