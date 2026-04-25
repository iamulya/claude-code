---
summary: The default service name used for YAAF telemetry.
export_name: YAAF_SERVICE_NAME
source_file: src/telemetry/attributes.ts
category: constant
title: YAAF_SERVICE_NAME
entity_type: api
search_terms:
 - telemetry service name
 - opentelemetry service name
 - default yaaf service
 - tracing service identifier
 - metrics service name
 - logging service name
 - YAAF telemetry configuration
 - otel service.name attribute
 - yaaf constant
 - com.yaaf.tracing
 - com.yaaf.metrics
 - com.yaaf.logs
 - base telemetry attributes
stub: false
compiled_at: 2026-04-24T17:50:35.189Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/attributes.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`YAAF_SERVICE_NAME` is a constant that holds the default service name, `"yaaf"`, for all telemetry signals emitted by the YAAF framework [Source 1].

In [Observability](../concepts/observability.md) systems like [OpenTelemetry](../concepts/open-telemetry.md), the `service.name` attribute is a fundamental identifier that groups all telemetry data (traces, metrics, logs) originating from a specific service. YAAF uses this constant to ensure that all telemetry it generates is consistently associated with the "yaaf" service by default [Source 1]. This constant is part of a set of base attributes applied to every [Span](./span.md) created by YAAF's internal tracing module, providing a consistent foundation for observability [Source 1].

## Signature

The constant is a string literal with the value `"yaaf"`.

```typescript
export const YAAF_SERVICE_NAME = "yaaf";
```

## Examples

While `YAAF_SERVICE_NAME` is used internally by the framework, it can also be used [when](./when.md) manually configuring an OpenTelemetry SDK to ensure consistency with the framework's telemetry.

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { YAAF_SERVICE_NAME } from 'yaaf';

// When configuring an OpenTelemetry SDK, use YAAF_SERVICE_NAME
// to identify the service that is emitting telemetry.
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: YAAF_SERVICE_NAME,
  }),
  // ... other SDK configuration
});

sdk.start();
```

## See Also

- `YAAF_TRACER_NAME`: The name for the OpenTelemetry Tracer used by YAAF.
- `YAAF_METER_NAME`: The name for the OpenTelemetry Meter used by YAAF.
- `YAAF_LOGGER_NAME`: The name for the OpenTelemetry Logger used by YAAF.

## Sources

[Source 1]: src/telemetry/attributes.ts