---
export_name: initYAAFTelemetry
source_file: src/instrumentation.ts
category: function
title: initYAAFTelemetry
entity_type: api
summary: Initializes the YAAF OpenTelemetry stack for traces, metrics, and logs.
stub: false
compiled_at: 2026-04-16T14:11:42.302Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/telemetry.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/telemetry/telemetry.ts
confidence: 1
---

## Overview
`initYAAFTelemetry` is the primary entry point for enabling observability within a YAAF application. It initializes the OpenTelemetry provider stack, including tracing, metrics, and logging. By default, telemetry is disabled and incurs zero overhead. It becomes active only when specific environment variables are set to configure exporters.

The function performs the following actions:
- Reads standard `OTEL_*` environment variables and YAAF-specific `YAAF_OTEL_*` overrides.
- Registers global OpenTelemetry providers for traces, metrics, and logs.
- Wires `beforeExit` and `exit` handlers to ensure telemetry data is flushed when the process terminates.
- Sets up `AsyncLocalStorage` propagation so that spans (such as agent runs, LLM calls, and tool executions) are correctly parented without manual context passing.

It is safe to call `initYAAFTelemetry` multiple times; only the first invocation takes effect.

## Signature
```typescript
export async function initYAAFTelemetry(): Promise<ReturnType<MeterProvider['getMeter']>>
```

### Returns
- `Promise<Meter>`: Returns the YAAF internal OpenTelemetry `Meter` instance immediately, allowing for the creation of custom counters, histograms, and other metrics.

### Configuration
Configuration is handled via environment variables. YAAF supports standard OpenTelemetry variables and provides `YAAF_OTEL_*` prefixes to allow YAAF's telemetry pipeline to coexist with a host application's own OTel configuration.

| Variable | Default | Purpose |
|---|---|---|
| `OTEL_TRACES_EXPORTER` | — | `console`, `otlp`, or `none` |
| `OTEL_METRICS_EXPORTER` | — | `console`, `otlp`, or `none` |
| `OTEL_LOGS_EXPORTER` | — | `console`, `otlp`, or `none` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | Base URL for OTLP collector |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | `grpc`, `http/json`, or `http/protobuf` |
| `YAAF_OTEL_TRACES_EXPORTER` | — | Override `OTEL_TRACES_EXPORTER` for YAAF |
| `YAAF_OTEL_METRICS_EXPORTER` | — | Override `OTEL_METRICS_EXPORTER` for YAAF |
| `YAAF_OTEL_LOGS_EXPORTER` | — | Override `OTEL_LOGS_EXPORTER` for YAAF |
| `YAAF_OTEL_EXPORTER_OTLP_ENDPOINT`| — | Override endpoint for YAAF only |
| `YAAF_OTEL_SHUTDOWN_TIMEOUT_MS` | `2000` | Max ms to wait for flush on shutdown |

## Examples

### Basic Initialization (Development)
This configuration prints all telemetry data to the console.
```typescript
import { initYAAFTelemetry } from 'yaaf';

// Set environment variables before initialization
process.env.OTEL_TRACES_EXPORTER = 'console';
process.env.OTEL_METRICS_EXPORTER = 'console';

const meter = await initYAAFTelemetry();

// The meter is ready for custom metrics
const requests = meter.createCounter('my_agent.requests');
requests.add(1, { agent: 'primary-assistant' });
```

### Production Initialization (OTLP)
Configuring YAAF to send data to an OTLP-compatible collector like Jaeger or Grafana Tempo.
```typescript
import { initYAAFTelemetry } from 'yaaf';

process.env.OTEL_TRACES_EXPORTER = 'otlp';
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
process.env.OTEL_EXPORTER_OTLP_PROTOCOL = 'http/protobuf';

await initYAAFTelemetry();
```

### Using YAAF Overrides
Using specific overrides to prevent interference with a host application's existing OpenTelemetry setup.
```typescript
import { initYAAFTelemetry } from 'yaaf';

// Host app uses one collector, YAAF uses another
process.env.YAAF_OTEL_TRACES_EXPORTER = 'otlp';
process.env.YAAF_OTEL_EXPORTER_OTLP_ENDPOINT = 'https://yaaf-collector.internal:4318';

await initYAAFTelemetry();
```

## See Also
- `flushYAAFTelemetry`: Manually trigger a flush of all pending telemetry data.
- `getYAAFMeter`: Retrieve the initialized Meter instance for custom metrics.
- `getYAAFOTelLogger`: Retrieve the structured OTLP log emitter.