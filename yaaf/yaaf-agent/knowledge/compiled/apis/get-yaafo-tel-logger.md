---
title: getYAAFOTelLogger
entity_type: api
summary: Retrieves a structured OTLP log emitter for YAAF.
export_name: getYAAFOTelLogger
source_file: src/telemetry/telemetry.ts
category: function
search_terms:
 - structured logging
 - OpenTelemetry logs
 - OTLP log emitter
 - how to log in YAAF
 - telemetry logging
 - observability logs
 - YAAF logging setup
 - emit OTel logs
 - SeverityNumber
 - instrumentation logs
 - YAAF telemetry
 - get logger instance
 - log record attributes
stub: false
compiled_at: 2026-04-24T17:09:16.537Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/telemetry.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `getYAAFOTelLogger` function retrieves an [OpenTelemetry](../concepts/open-telemetry.md) `Logger` instance configured by the YAAF [Telemetry System](../subsystems/telemetry-system.md) [Source 2]. This logger is used to emit [Structured Log](../concepts/structured-log.md)s that can be exported via OTLP to a compatible collector, such as Jaeger or Grafana Tempo [Source 1].

This function is a key part of YAAF's [Observability](../concepts/observability.md) features, allowing developers to add custom, Structured Log records to the telemetry stream alongside automatic traces and metrics [Source 1].

The function will return `undefined` if the telemetry system has not been initialized by calling `initYAAFTelemetry()` first, or if no logs exporter is configured (e.g., `OTEL_LOGS_EXPORTER` is set to `none` or is not defined) [Source 2].

## Signature

The function takes no arguments and returns an OpenTelemetry `Logger` instance or `undefined` [Source 2].

```typescript
import type { Logger } from '@opentelemetry/api-logs';

export function getYAAFOTelLogger(): Logger | undefined;
```

## Examples

The following example demonstrates how to retrieve the logger and emit an informational log record with a custom body and attributes. This requires `initYAAFTelemetry()` to have been called and a logs exporter to be configured via environment variables [Source 1].

```typescript
import { getYAAFOTelLogger, initYAAFTelemetry } from 'yaaf';
import { SeverityNumber } from '@opentelemetry/api-logs';

// Initialize telemetry at application startup
// For this example to work, set e.g. OTEL_LOGS_EXPORTER=console
await initYAAFTelemetry();

const otelLog = getYAAFOTelLogger();

const sessionId = 'session-12345';
const agentName = 'customer-support-agent';

// The logger will be undefined if no logs exporter is configured.
// The optional chaining operator (?.) handles this gracefully.
otelLog?.emit({
  severityNumber: SeverityNumber.INFO,
  body: 'Agent session started',
  attributes: { 'session.id': sessionId, 'agent.name': agentName },
});
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/telemetry.ts