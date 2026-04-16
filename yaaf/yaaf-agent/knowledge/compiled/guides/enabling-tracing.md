---
title: Enabling Tracing
entity_type: guide
summary: How to configure and activate OpenTelemetry tracing in a YAAF application using environment variables and initialization functions.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:37:14.880Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/telemetry/tracing.ts
confidence: 0.9
---

## Overview
YAAF provides a zero-overhead, opt-in tracing layer built on the OpenTelemetry span API. When enabled, the framework automatically instruments significant lifecycle events, including agent runs, LLM requests, and tool executions. This guide walks through the steps required to activate tracing and verify that spans are being exported correctly.

## Prerequisites
* A YAAF application integrated into a TypeScript project.
* Access to the application's process environment variables.
* (Optional) An OTLP-compatible collector such as Jaeger or Tempo if exporting traces beyond the console.

## Step-by-Step

### 1. Configure Environment Variables
Tracing in YAAF is disabled by default. To enable it, you must set the appropriate environment variable. YAAF checks for a framework-specific override before falling back to standard OpenTelemetry variables.

Set one of the following in your environment:

```bash
# Option A: Framework-specific (takes precedence)
YAAF_OTEL_TRACES_EXPORTER=console

# Option B: Standard OpenTelemetry variable
OTEL_TRACES_EXPORTER=otlp
```

Supported values include:
* `console`: Outputs span data directly to the process stdout.
* `otlp`: Sends spans to an OTLP-compatible backend.
* `none`: Explicitly disables tracing.

### 2. Initialize Telemetry at Startup
Setting environment variables is insufficient on its own. You must call the initialization function at the very beginning of your application's lifecycle (process startup) to register the `TracerProvider`.

```typescript
import { initYAAFTelemetry } from 'yaaf/telemetry';

// Call this before any agent or LLM logic
initYAAFTelemetry();
```

### 3. Verify Activation
You can programmatically check if tracing is active within your application logic using the `isTracingEnabled()` utility. This function returns `true` only if a valid exporter is configured and the telemetry system has been initialized.

```typescript
import { isTracingEnabled } from 'yaaf/telemetry/tracing';

if (isTracingEnabled()) {
  console.log("YAAF Tracing is active.");
}
```

### 4. (Optional) Add Custom Instrumentation
While YAAF automatically instruments core events, you can wrap custom logic in spans using the `executeInSpan` helper. This helper automatically attaches to the current agent run context via `AsyncLocalStorage`.

```typescript
import { executeInSpan } from 'yaaf/telemetry/tracing';

const result = await executeInSpan('my_custom_operation', async (span) => {
  span.setAttribute('business.logic.value', 42);
  return await performWork();
});
```

## Configuration Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `YAAF_OTEL_TRACES_EXPORTER` | Primary toggle for YAAF tracing. Overrides standard OTEL vars. | (unset) |
| `OTEL_TRACES_EXPORTER` | Standard OpenTelemetry variable used if YAAF-specific var is missing. | `none` |

## Common Mistakes

*   **Missing Initialization**: Setting environment variables without calling `initYAAFTelemetry()` will result in no-op spans. The framework requires the registration of a `TracerProvider` to function.
*   **Late Initialization**: Calling `initYAAFTelemetry()` after agents have already been instantiated or runs have started may result in missing spans for those initial events.
*   **Context Loss in Parallelism**: When running multiple LLM calls in parallel, ensure you are using the returned span objects if manually ending spans, as `AsyncLocalStorage` context may vary across concurrent branches.

## Next Steps
* Consult the API documentation for `executeInSpan` to learn about manual attribute tagging.
* Explore the span hierarchy (Agent Run → LLM Request / Tool Call) in the telemetry architecture overview.

## Sources
* `src/telemetry/tracing.ts`