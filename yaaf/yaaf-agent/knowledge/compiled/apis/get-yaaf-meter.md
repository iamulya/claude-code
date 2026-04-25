---
title: getYAAFMeter
entity_type: api
summary: Retrieves the initialized YAAF OpenTelemetry Meter for custom metrics.
export_name: getYAAFMeter
source_file: src/telemetry/telemetry.ts
category: function
search_terms:
 - custom metrics
 - OpenTelemetry meter
 - how to create a counter
 - how to create a histogram
 - YAAF observability
 - instrumentation
 - monitoring agent performance
 - get meter instance
 - telemetry API
 - OTel metrics
 - record custom data
 - YAAF_METER_NAME
 - using counters in hooks
stub: false
compiled_at: 2026-04-24T17:09:15.762Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/telemetry.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `getYAAFMeter` function provides access to the shared [OpenTelemetry](../concepts/open-telemetry.md) `Meter` instance used by the YAAF framework. It is the primary entry point for creating custom, application-specific [Metric](../concepts/metric.md)s, such as counters and histograms, to monitor agent behavior beyond the default instrumentation provided by YAAF [Source 1].

This function will return `undefined` if the [Telemetry System](../subsystems/telemetry-system.md) has not been initialized by calling `initYAAFTelemetry()` first. Therefore, it is essential to ensure initialization has occurred at process startup before attempting to retrieve the meter [Source 1, Source 2].

## Signature

The function takes no arguments and returns either an OpenTelemetry `Meter` instance or `undefined`.

```typescript
import type { Meter } from '@opentelemetry/api';

export function getYAAFMeter(): Meter | undefined;
```

**Returns:**

- `Meter | undefined`: The OpenTelemetry `Meter` instance if telemetry is initialized, otherwise `undefined`.

## Examples

The most common use case is to retrieve the meter and create custom Metric instruments like counters or histograms. These instruments can then be used throughout an application, often within [Agent Hooks](../concepts/agent-hooks.md), to record measurements.

Because the function can return `undefined`, it is best practice to use optional chaining (`?.`) [when](./when.md) creating and using instruments [Source 2].

```typescript
import { getYAAFMeter, initYAAFTelemetry } from 'yaaf';
import type { AgentHooks } from 'yaaf';

// Telemetry must be initialized first, typically at application startup.
// This is often done by setting environment variables.
// For this example, we'll enable the console exporter programmatically.
process.env.OTEL_METRICS_EXPORTER = 'console';
await initYAAFTelemetry();

// Retrieve the meter
const meter = getYAAFMeter();

// Create custom metric instruments using optional chaining
const llmCalls   = meter?.createCounter('my_agent.llm_calls');
const latency    = meter?.createHistogram('my_agent.turn_latency_ms');
const toolErrors = meter?.createCounter('my_agent.tool_errors');

// These instruments can now be used within agent hooks to record data.
const hooks: AgentHooks = {
  afterLLM: async (ctx, result) => {
    // Record the number of LLM calls, attributed by model
    llmCalls?.add(1, { model: ctx.model });

    // Record the latency of the LLM call
    latency?.record(result.durationMs, { agent: 'my-agent' });

    return { action: 'continue' };
  },
  onToolError: async (ctx, error) => {
    // Increment a counter when a tool fails
    toolErrors?.add(1, { tool_name: ctx.toolName });
  }
};

// Now, an agent configured with these hooks will emit custom metrics.
```

## See Also

- `initYAAFTelemetry`: The function required to initialize the telemetry system before `getYAAFMeter` can return a `Meter` instance.
- `getYAAFOTelLogger`: A related function for retrieving a structured logger for OpenTelemetry Logs.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/telemetry.ts