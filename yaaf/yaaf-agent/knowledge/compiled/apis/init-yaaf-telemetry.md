---
title: initYAAFTelemetry
entity_type: api
summary: Initializes the YAAF OpenTelemetry stack, registering global providers and wiring flush handlers.
export_name: initYAAFTelemetry
source_file: src/telemetry/telemetry.ts
category: function
search_terms:
 - OpenTelemetry setup
 - how to enable tracing
 - configure observability
 - OTEL environment variables
 - YAAF telemetry initialization
 - start telemetry
 - instrumentation setup
 - get OTel meter
 - register global providers
 - YAAF_OTEL_* overrides
 - console exporter
 - OTLP exporter
 - structured logging setup
stub: false
compiled_at: 2026-04-24T17:14:01.697Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/telemetry.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `initYAAFTelemetry` function is the primary entry point for activating YAAF's [Observability](../concepts/observability.md) features, which are built on [OpenTelemetry](../concepts/open-telemetry.md) [Source 1]. It should be called once at the start of an application's lifecycle [Source 2].

[when](./when.md) invoked, this function performs several key actions:
1.  It reads standard `OTEL_*` environment variables to configure exporters for traces, metrics, and logs. It also respects `YAAF_OTEL_*` prefixed variables, which can be used to override the standard ones and run YAAF's telemetry pipeline alongside a host application's own OpenTelemetry configuration without interference [Source 1, Source 2].
2.  It registers the necessary global OpenTelemetry providers based on the environment configuration [Source 2].
3.  It automatically wires handlers to flush any pending telemetry data before the process exits, helping to prevent data loss on shutdown [Source 2].

The function is idempotent; it is safe to call multiple times, but only the first invocation will have an effect [Source 2]. Telemetry is disabled by default and incurs zero overhead until `initYAAFTelemetry` is called and an exporter is configured via environment variables [Source 1].

## Signature

The function is asynchronous and returns a `Promise` that resolves to an OpenTelemetry `Meter` instance, which can be used for creating custom metrics like counters and histograms [Source 2].

```typescript
export async function initYAAFTelemetry(): Promise<Meter>;
```

## Examples

### Development Usage (Console Exporter)

For local development, telemetry data can be printed directly to the console. This is configured by setting the `OTEL_*_EXPORTER` environment variables to `console` [Source 1, Source 2].

```typescript
import { initYAAFTelemetry } from 'yaaf';

// Set environment variables before calling
process.env.OTEL_TRACES_EXPORTER = 'console';
process.env.OTEL_METRICS_EXPORTER = 'console';

async function main() {
  const meter = await initYAAFTelemetry();

  // The returned meter can be used immediately for custom metrics
  const requests = meter.createCounter('my_agent.requests');
  requests.add(1, { agent: 'my-agent', status: 'ok' });

  // ... run your agent
}

main();
```

### Production Usage (OTLP Exporter)

In a production environment, telemetry is typically sent to a collector like Jaeger or Grafana Tempo using the OpenTelemetry Protocol (OTLP) [Source 1].

```typescript
import { initYAAFTelemetry } from 'yaaf';

// Configure the OTLP exporter via environment variables
process.env.OTEL_TRACES_EXPORTER = 'otlp';
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
process.env.OTEL_EXPORTER_OTLP_PROTOCOL = 'http/protobuf';

async function startServer() {
  // Initialize telemetry once at startup
  const meter = await initYAAFTelemetry();

  // Use the meter to create custom application metrics
  const counter = meter.createCounter('yaaf.requests');
  counter.add(1, { agent: 'my-agent' });

  // ... start your application server
}

startServer();
```

## See Also

- `flushYAAFTelemetry`: A function to manually force the export of all buffered telemetry data.
- `getYAAFMeter`: A function to retrieve the `Meter` instance after it has been initialized.
- `getYAAFOTelLogger`: A function to get a structured logger that sends logs via OTLP.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/telemetry.ts