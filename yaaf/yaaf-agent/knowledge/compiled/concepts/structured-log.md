---
title: Structured Log
entity_type: concept
summary: Log entries formatted as machine-readable data structures, typically with key-value pairs, to facilitate analysis and querying, as defined by OpenTelemetry.
related_subsystems:
 - Observability
search_terms:
 - machine-readable logs
 - logging with key-value pairs
 - OTLP logs
 - OpenTelemetry logging
 - how to log in YAAF
 - YAAF observability
 - structured logging framework
 - JSON logs
 - getYAAFOTelLogger
 - log attributes
 - log severity
 - queryable logs
stub: false
compiled_at: 2026-04-24T18:02:48.353Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
compiled_from_quality: documentation
confidence: 0.9
---

## What It Is

A Structured Log is a log entry that is formatted as a machine-readable data structure rather than an unstructured string of text [Source 1]. In YAAF, this is implemented according to the [OpenTelemetry](./open-telemetry.md) specification, where each log record consists of a message body, a severity level, and a set of key-value pairs called attributes. This structure allows for powerful, efficient querying, filtering, and analysis of log data in [Observability](./observability.md) platforms, which is a significant improvement over parsing plain text logs [Source 1].

The primary problem solved by structured logging is making application logs a first-class source of telemetry data, alongside traces and metrics. By attaching contextual attributes (e.g., `session.id`, `agent.name`) to log messages, developers can easily correlate events across different parts of the system and diagnose issues more effectively [Source 1].

## How It Works in YAAF

YAAF provides an integration with the OpenTelemetry Logs SDK to produce structured logs. The framework exposes a `getYAAFOTelLogger()` function that returns an OpenTelemetry `Logger` instance, which can then be used to emit log records [Source 1]. This logger is part of the broader YAAF [Telemetry System](../subsystems/telemetry-system.md), which must be initialized at application startup.

To create a structured log, a developer calls the `.emit()` method on the logger instance. This method accepts an object containing the log record's details [Source 1]:
- `severityNumber`: The log level, using the `SeverityNumber` enum from `@opentelemetry/api-logs`.
- `body`: The human-readable message string for the log entry.
- `attributes`: An object of key-value pairs that provides the structured context for the log.

The following example demonstrates emitting a log [when](../apis/when.md) an [Agent Session](./agent-session.md) starts, including the session ID and agent name as structured attributes [Source 1]:

```typescript
import { getYAAFOTelLogger } from 'yaaf';
import { SeverityNumber } from '@opentelemetry/api-logs';

const otelLog = getYAAFOTelLogger();

otelLog?.emit({
  severityNumber: SeverityNumber.INFO,
  body: 'Agent session started',
  attributes: { 'session.id': sessionId, 'agent.name': agentName },
});
```

These log records are then processed and sent to a configured exporter, such as a console output or an OTLP-compatible backend like Jaeger or Grafana Tempo [Source 1].

## Configuration

Structured logging, like all telemetry in YAAF, is disabled by default to ensure zero performance overhead when not in use [Source 1]. To enable it, the `initYAAFTelemetry()` function must be called once at process startup. This function reads environment variables to configure the OpenTelemetry SDK, including the log exporter [Source 1].

The primary environment variable for configuring structured logs is `OTEL_LOGS_EXPORTER`. It can be set to `console` for development or `otlp` for production environments. YAAF also provides a `YAAF_OTEL_LOGS_EXPORTER` override to configure YAAF's logging pipeline separately from a host application's telemetry [Source 1].

Key environment variables for log configuration include [Source 1]:

| Variable | Default | Purpose |
|---|---|---|
| `OTEL_LOGS_EXPORTER` | — | Sets the log exporter. Common values are `console`, `otlp`, or `none`. |
| `YAAF_OTEL_LOGS_EXPORTER` | — | Overrides `OTEL_LOGS_EXPORTER` specifically for YAAF's telemetry. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | The base URL for the OTLP collector when using the `otlp` exporter. |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | The OTLP protocol to use, such as `grpc`, `http/json`, or `http/protobuf`. |

To use structured logging, the necessary OpenTelemetry peer dependencies must also be installed, including `@opentelemetry/api-logs` and `@opentelemetry/sdk-logs` [Source 1].

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md