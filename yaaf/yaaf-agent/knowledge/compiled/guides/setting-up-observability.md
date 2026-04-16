---
title: Setting up Observability with OpenTelemetry
entity_type: guide
summary: Configure and activate OpenTelemetry tracing, metrics, and logging to monitor YAAF agent performance and execution flow.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:11:35.483Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/telemetry.md
confidence: 1
---

## Overview
YAAF includes a native OpenTelemetry (OTel) integration that provides deep visibility into agent operations. When enabled, the framework automatically instruments every agent turn, LLM request, and tool execution. This guide walks through installing the necessary peer dependencies, initializing the telemetry provider, and configuring exporters for both development and production environments.

The integration uses `AsyncLocalStorage` for context propagation, meaning parent-child span relationships are maintained automatically across asynchronous calls without manual span passing.

## Prerequisites
OpenTelemetry support in YAAF relies on optional peer dependencies. You must install the packages corresponding to the signals (traces, metrics, logs) you wish to collect.

### For Traces Only
```bash
npm install @opentelemetry/api @opentelemetry/sdk-trace-base \
            @opentelemetry/resources @opentelemetry/semantic-conventions
```

### For Full Stack (Traces, Metrics, and Logs)
```bash
npm install @opentelemetry/api @opentelemetry/api-logs \
            @opentelemetry/sdk-trace-base @opentelemetry/sdk-metrics \
            @opentelemetry/sdk-logs @opentelemetry/resources \
            @opentelemetry/semantic-conventions
```

### Exporters
You must also install the exporter package for your chosen protocol (default is `http/protobuf`):
*   **HTTP/Protobuf:** `npm install @opentelemetry/exporter-trace-otlp-proto`
*   **HTTP/JSON:** `npm install @opentelemetry/exporter-trace-otlp-http`
*   **gRPC:** `npm install @opentelemetry/exporter-trace-otlp-grpc`

## Step-by-Step

### 1. Initialize Telemetry
Call `initYAAFTelemetry()` once at the very beginning of your application's entry point. This function reads environment variables, registers global providers, and returns a `Meter` for custom metrics.

```typescript
import { initYAAFTelemetry } from 'yaaf';

// Initialize at process startup
const meter = await initYAAFTelemetry();

// Optional: Use the meter for custom application metrics
const requests = meter.createCounter('my_agent.requests');
requests.add(1, { agent: 'support-bot' });
```

### 2. Configure Environment Variables
Telemetry is disabled by default. Use environment variables to activate exporters and define endpoints.

**Development (Console Output):**
```bash
OTEL_TRACES_EXPORTER=console
OTEL_METRICS_EXPORTER=console
OTEL_LOGS_EXPORTER=console
```

**Production (OTLP Collector):**
```bash
OTEL_TRACES_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

### 3. Add Custom Instrumentation
While YAAF handles core agent logic, you can wrap custom logic or annotate existing spans using the framework's utility functions.

```typescript
import { executeInSpan, getCurrentRunSpan, getCurrentToolSpan } from 'yaaf';

// Wrap a custom service call in a span
const data = await executeInSpan('external_api.fetch', async (span) => {
  span.setAttribute('http.url', 'https://api.example.com');
  return fetch('https://api.example.com').then(r => r.json());
});

// Add business metadata to the current agent run
getCurrentRunSpan()?.setAttribute('customer.id', '12345');
```

### 4. Implement Custom Metrics and Logs
Access the internal OTel providers to record custom signals within agent hooks or tool executions.

```typescript
import { getYAAFMeter, getYAAFOTelLogger } from 'yaaf';
import { SeverityNumber } from '@opentelemetry/api-logs';

// Metrics
const meter = getYAAFMeter();
const toolErrors = meter?.createCounter('agent.tool_errors');

// Structured Logging
const otelLog = getYAAFOTelLogger();
otelLog?.emit({
  severityNumber: SeverityNumber.INFO,
  body: 'Processing user request',
  attributes: { 'user.priority': 'high' },
});
```

### 5. Ensure Clean Shutdown
To prevent data loss, flush the telemetry buffers before the process exits.

```typescript
import { flushYAAFTelemetry } from 'yaaf';

process.on('SIGINT', async () => {
  await flushYAAFTelemetry();
  process.exit(0);
});
```

## Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `OTEL_TRACES_EXPORTER` | — | Exporter type: `console`, `otlp`, or `none`. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | The base URL for your OTLP collector. |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | Communication protocol: `grpc`, `http/json`, or `http/protobuf`. |
| `YAAF_OTEL_TRACES_EXPORTER` | — | Override `OTEL_TRACES_EXPORTER` specifically for YAAF. |
| `YAAF_OTEL_EXPORTER_OTLP_ENDPOINT`| — | Override endpoint specifically for YAAF. |
| `YAAF_OTEL_SHUTDOWN_TIMEOUT_MS` | `2000` | Maximum time to wait for flush during process shutdown. |

## Common Mistakes
*   **Missing Peer Dependencies:** If you configure an OTLP exporter but haven't installed the corresponding `@opentelemetry/exporter-*` package, initialization will fail or default to no-op.
*   **Late Initialization:** Calling `initYAAFTelemetry()` after agents have already been instantiated may result in missing the initial root spans.
*   **Protocol Mismatch:** Ensure `OTEL_EXPORTER_OTLP_PROTOCOL` matches the capabilities of your collector (e.g., using `http/protobuf` against a gRPC-only port).
*   **Ignoring Flushes:** In serverless or short-lived environments, failing to call `flushYAAFTelemetry()` often results in zero spans being received by the collector.

## Next Steps
*   Explore the **Span Hierarchy** to understand how `yaaf.agent.run`, `yaaf.llm.request`, and `yaaf.tool.call` relate to each other in your tracing UI.
*   Set up a dashboard in Jaeger or Grafana to monitor `llm.input_tokens` and `llm.output_tokens` captured by YAAF.