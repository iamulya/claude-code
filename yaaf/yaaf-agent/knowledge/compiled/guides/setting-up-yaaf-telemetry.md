---
title: Setting up YAAF Telemetry
entity_type: guide
summary: A guide to initializing and configuring the YAAF OpenTelemetry system for traces, metrics, and logs.
difficulty: beginner
search_terms:
 - YAAF observability
 - how to enable tracing in YAAF
 - YAAF metrics setup
 - OpenTelemetry integration YAAF
 - OTEL environment variables
 - YAAF_OTEL_TRACES_EXPORTER
 - initYAAFTelemetry function
 - configure YAAF logging
 - exporting traces to Jaeger
 - console exporter for telemetry
 - custom metrics in YAAF
 - instrumenting YAAF agents
 - YAAF performance monitoring
stub: false
compiled_at: 2026-04-24T18:08:10.902Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/telemetry.ts
compiled_from_quality: unknown
confidence: 0.97
---

## Overview

This guide walks through the process of initializing and configuring the YAAF [Telemetry System](../subsystems/telemetry-system.md). YAAF uses [OpenTelemetry](../concepts/open-telemetry.md) to provide [Observability](../concepts/observability.md) signals, including traces, metrics, and logs. By following these steps, a developer can enable telemetry exporting for local development or a production environment. The guide covers basic initialization, configuration via environment variables, and the creation of custom metrics [Source 1].

## Step-by-Step

The YAAF telemetry system is designed to be initialized once at the application's startup [Source 1].

### Step 1: Import the Initializer

First, import the `initYAAFTelemetry` function from the `yaaf/telemetry` module in your application's entry point file.

```typescript
import { initYAAFTelemetry } from 'yaaf/telemetry';
```

### Step 2: Configure Exporters via Environment Variables

YAAF's telemetry is configured using standard OpenTelemetry environment variables. The framework also provides `YAAF_OTEL_*` prefixed versions that can override the standard ones, which is useful for preventing conflicts if the host application also uses OpenTelemetry [Source 1].

The primary variables control which exporter is used for each signal (traces, metrics, logs). Supported exporters are `console`, `otlp`, and `none` (or an empty value) to disable the signal [Source 1].

**For Local Development (Console Output):**

To see telemetry data printed to the console, set the exporter variables to `console`.

```typescript
// Set these environment variables before running your application
process.env.OTEL_TRACES_EXPORTER = 'console';
process.env.OTEL_METRICS_EXPORTER = 'console';
process.env.OTEL_LOGS_EXPORTER = 'console';
```

**For Production (OTLP Exporter):**

To send telemetry data to an OpenTelemetry collector or a compatible backend like Jaeger, use the `otlp` exporter and specify the endpoint.

```typescript
// Set these environment variables before running your application
process.env.OTEL_TRACES_EXPORTER = 'otlp';
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318'; // Example: OTLP HTTP endpoint
```

### Step 3: Initialize Telemetry

Call `initYAAFTelemetry()` at the beginning of your application's lifecycle. This function is asynchronous and should be awaited. It is safe to call multiple times, but only the first call will have an effect [Source 1].

```typescript
import { initYAAFTelemetry } from 'yaaf/telemetry';

async function main() {
  // Initialize telemetry once at startup
  await initYAAFTelemetry();

  // ... your agent logic here
}

main().catch(console.error);
```

### Step 4: Create Custom Metrics (Optional)

The `initYAAFTelemetry` function returns a `Meter` instance from the OpenTelemetry API. This can be used to create custom metrics like counters and histograms. Alternatively, the `getYAAFMeter` function can be used to retrieve the meter instance from anywhere in the application after initialization [Source 1].

```typescript
import { initYAAFTelemetry, getYAAFMeter } from 'yaaf/telemetry';

async function main() {
  const meter = await initYAAFTelemetry();

  // Example 1: Using the returned meter
  const requestCounter = meter.createCounter('yaaf.requests');
  requestCounter.add(1, { agent: 'my-agent' });

  // ... your agent logic
}

// Example 2: Retrieving the meter elsewhere
function someTool() {
  const meter = getYAAFMeter();
  const toolCallCounter = meter?.createCounter('my_agent.tool_calls');
  toolCallCounter?.add(1, { tool: 'search' });
}
```

### Step 5: Ensure Data is Flushed on Exit

YAAF automatically registers shutdown hooks to flush pending telemetry data before the process exits. However, for graceful shutdowns or in environments where exit hooks are unreliable (e.g., serverless functions), it is best practice to call `flushYAAFTelemetry` manually [Source 1].

```typescript
import { flushYAAFTelemetry } from 'yaaf/telemetry';

// Call this before your process terminates
await flushYAAFTelemetry();
```

## Configuration Reference

The telemetry system is configured entirely through environment variables. YAAF-specific variables take precedence over their standard OpenTelemetry counterparts [Source 1].

| Variable                           | Default         | Purpose                                                                                             |
| ---------------------------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| `YAAF_OTEL_TRACES_EXPORTER`        | —               | Overrides `OTEL_TRACES_EXPORTER`. Can be `console`, `otlp`, or `none`.                               |
| `YAAF_OTEL_METRICS_EXPORTER`       | —               | Overrides `OTEL_METRICS_EXPORTER`. Can be `console`, `otlp`, or `none`.                               |
| `YAAF_OTEL_LOGS_EXPORTER`          | —               | Overrides `OTEL_LOGS_EXPORTER`. Can be `console`, `otlp`, or `none`.                                  |
| `YAAF_OTEL_EXPORTER_OTLP_ENDPOINT` | —               | Overrides `OTEL_EXPORTER_OTLP_ENDPOINT`. The target URL for the OTLP exporter.                      |
| `YAAF_OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | The OTLP protocol. Can be `grpc`, `http/json`, or `http/protobuf`.                                  |
| `YAAF_OTEL_SHUTDOWN_TIMEOUT_MS`    | `2000`          | The maximum number of milliseconds to wait for telemetry data to flush on shutdown.                 |
| `OTEL_*`                           | —               | All standard OpenTelemetry environment variables are supported and used as fallbacks.               |

## Common Mistakes

1.  **Forgetting to `await initYAAFTelemetry()`**: The initialization function is asynchronous. Failing to `await` it may lead to a race condition where telemetry is not fully configured before the application proceeds.
2.  **Calling `getYAAFMeter()` before initialization**: The `getYAAFMeter()` function will return `undefined` if `initYAAFTelemetry()` has not been called and completed successfully. This will cause errors [when](../apis/when.md) trying to create custom metrics [Source 1].
3.  **Misconfiguring the OTLP Endpoint**: When using the `otlp` exporter, an incorrect `OTEL_EXPORTER_OTLP_ENDPOINT` value will cause telemetry data to be lost. Ensure the URL is correct and the collector is reachable from the application environment.
4.  **Not Setting Any Exporter Variables**: If no `OTEL_*_EXPORTER` or `YAAF_OTEL_*_EXPORTER` variables are set, no exporters will be registered, and no telemetry data will be emitted. This can give the false impression that the system is not working.

## Sources

[Source 1]: src/telemetry/telemetry.ts