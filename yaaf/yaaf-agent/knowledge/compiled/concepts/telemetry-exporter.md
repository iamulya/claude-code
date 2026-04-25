---
title: Telemetry Exporter
entity_type: concept
summary: A component in OpenTelemetry responsible for sending collected telemetry data to a backend or output destination.
related_subsystems:
 - telemetry
search_terms:
 - OpenTelemetry exporter
 - OTLP exporter
 - console exporter
 - how to send telemetry data
 - configure telemetry backend
 - YAAF_OTEL_TRACES_EXPORTER
 - YAAF_OTEL_METRICS_EXPORTER
 - YAAF_OTEL_LOGS_EXPORTER
 - exporting traces
 - exporting metrics
 - exporting logs
 - disable telemetry
 - OTEL environment variables
 - send telemetry to Jaeger
stub: false
compiled_at: 2026-04-24T18:03:24.888Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/telemetry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

A Telemetry Exporter is a component within the [OpenTelemetry](./open-telemetry.md) standard that sends collected telemetry data—such as traces, metrics, and logs—from an application to a specified destination [Source 1]. This destination can be a monitoring backend like Jaeger, a local console for debugging, or any other system capable of receiving telemetry signals.

In YAAF, exporters are the mechanism by which agent [Observability](./observability.md) data is routed out of the framework. They solve the problem of integrating YAAF's operational data into a developer's existing observability stack, allowing for unified monitoring and analysis of the agent's behavior alongside other application components [Source 1].

## How It Works in YAAF

YAAF's [Telemetry System](../subsystems/telemetry-system.md), initialized via the `initYAAFTelemetry` function, configures and registers exporters based on environment variables [Source 1]. The framework supports different exporters for each of the three primary telemetry signals: traces, metrics, and logs.

The supported exporter types are [Source 1]:

*   **`console`**: This exporter prints telemetry data in a human-readable format to the standard output (`stdout`). It is primarily intended for local development and debugging.
*   **`otlp`**: This exporter sends data using the OpenTelemetry Protocol (OTLP) to a compatible backend. It is the standard for production environments. The transport protocol can be configured to `http/protobuf` (the default), `http/json`, or `grpc`.
*   **`none`** (or an empty value): This special value disables the corresponding telemetry signal by not registering any exporter for it.

YAAF's telemetry module includes a `parseExporterList` function, which can parse a comma-separated list of exporter types, allowing for multiple exporters to be configured for a single signal [Source 1].

## Configuration

Telemetry exporters in YAAF are configured entirely through environment variables. The framework honors the standard OpenTelemetry (`OTEL_*`) variables but also provides `YAAF_OTEL_*` prefixed versions that take precedence. This allows YAAF's telemetry to be configured independently from a host application's own OpenTelemetry setup [Source 1].

The primary environment variables for configuring exporters are [Source 1]:

| Variable                           | Default         | Purpose                                                              |
| ---------------------------------- | --------------- | -------------------------------------------------------------------- |
| `YAAF_OTEL_TRACES_EXPORTER`        | —               | Overrides `OTEL_TRACES_EXPORTER` to set the exporter for traces.       |
| `YAAF_OTEL_METRICS_EXPORTER`       | —               | Overrides `OTEL_METRICS_EXPORTER` to set the exporter for metrics.     |
| `YAAF_OTEL_LOGS_EXPORTER`          | —               | Overrides `OTEL_LOGS_EXPORTER` to set the exporter for logs.           |
| `YAAF_OTEL_EXPORTER_OTLP_ENDPOINT` | —               | Overrides `OTEL_EXPORTER_OTLP_ENDPOINT` for the OTLP exporter target.  |
| `YAAF_OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | Sets the OTLP transport protocol (`grpc`, `http/json`, `http/protobuf`). |

### Example: Development Configuration

To send all traces and metrics to the console for local debugging, set the following environment variables before initializing YAAF telemetry [Source 1]:

```typescript
// Development: console output
process.env.OTEL_TRACES_EXPORTER = 'console';
process.env.OTEL_METRICS_EXPORTER = 'console';

// Or using YAAF-specific overrides
// process.env.YAAF_OTEL_TRACES_EXPORTER = 'console';
// process.env.YAAF_OTEL_METRICS_EXPORTER = 'console';

const meter = await initYAAFTelemetry();
```

### Example: Production OTLP Configuration

To send traces to an OTLP-compatible backend like Jaeger running locally, configure the `otlp` exporter and its endpoint [Source 1]:

```typescript
// Production: Jaeger via OTLP
process.env.OTEL_TRACES_EXPORTER = 'otlp';
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';

const meter = await initYAAFTelemetry();
```

### Example: Disabling a Signal

To disable metrics collection entirely, set the corresponding exporter variable to `none` or leave it empty [Source 1]:

```typescript
// Disable metrics, but keep traces enabled for the console
process.env.OTEL_TRACES_EXPORTER = 'console';
process.env.OTEL_METRICS_EXPORTER = 'none';

const meter = await initYAAFTelemetry();
```

## Sources

[Source 1] `src/telemetry/telemetry.ts`