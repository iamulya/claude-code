---
export_name: getYAAFMeter
source_file: src/instrumentation.ts
category: function
title: getYAAFMeter
entity_type: api
summary: Retrieves the initialized OpenTelemetry Meter for recording custom metrics within the YAAF telemetry pipeline.
stub: false
compiled_at: 2026-04-16T14:11:54.454Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/telemetry.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/telemetry/telemetry.ts
confidence: 1
---

## Overview
`getYAAFMeter` is a utility function used to access the OpenTelemetry `Meter` instance managed by the YAAF framework. It allows developers to define and record custom metrics—such as counters, histograms, and gauges—that are exported via the same pipeline as YAAF's internal instrumentation.

This function is typically used when developers want to track business-specific logic or agent performance metrics that are not captured by default. Because YAAF's telemetry is off by default, `getYAAFMeter` will return `undefined` if `initYAAFTelemetry()` has not been called or if metrics exporting is not configured.

## Signature
```typescript
export function getYAAFMeter(): ReturnType<MeterProvider['getMeter']> | undefined;
```

### Returns
*   **Meter | undefined**: Returns an OpenTelemetry `Meter` object if the telemetry system has been initialized; otherwise, returns `undefined`.

## Examples

### Basic Usage
This example demonstrates how to safely retrieve the meter and create a counter for tracking specific tool usage.

```typescript
import { getYAAFMeter } from 'yaaf';

const meter = getYAAFMeter();

// Use optional chaining as the meter may be undefined
const toolCounter = meter?.createCounter('my_agent.tool_invocations', {
  description: 'Number of times a specific tool was called',
});

// Record a metric
toolCounter?.add(1, { tool_name: 'web_search' });
```

### Usage in Agent Hooks
Custom metrics are often recorded within agent hooks to monitor performance or error rates during a run.

```typescript
import { getYAAFMeter } from 'yaaf';

const meter = getYAAFMeter();
const toolErrors = meter?.createCounter('my_agent.tool_errors');

const agentHooks = {
  afterTool: async (ctx, result) => {
    if (result.error) {
      toolErrors?.add(1, { 
        tool: ctx.toolName,
        error_type: result.error.name 
      });
    }
    return result;
  },
};
```

## See Also
*   `initYAAFTelemetry`: The function required to initialize the telemetry providers.
*   `getYAAFOTelLogger`: Retrieves the structured log emitter for the framework.
*   `flushYAAFTelemetry`: Ensures all pending metrics and spans are exported before process exit.