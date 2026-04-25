---
summary: The OpenTelemetry meter name used by YAAF's metrics module.
export_name: YAAF_METER_NAME
source_file: src/telemetry/attributes.ts
category: constant
title: YAAF_METER_NAME
entity_type: api
search_terms:
 - OpenTelemetry metrics
 - YAAF metrics configuration
 - meter name for metrics
 - com.yaaf.metrics
 - telemetry setup
 - instrumentation scope name
 - how to find YAAF metrics
 - metrics library name
 - OTel meter
 - YAAF observability
 - monitoring YAAF agents
stub: false
compiled_at: 2026-04-24T17:50:32.704Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/attributes.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`YAAF_METER_NAME` is a constant that provides the official [OpenTelemetry](../concepts/open-telemetry.md) instrumentation scope name for metrics emitted by the YAAF framework [Source 1]. Its value is `"com.yaaf.metrics"`.

This constant is used to initialize the OpenTelemetry `Meter` instance within YAAF. [when](./when.md) integrating YAAF into a larger application with its own [Observability](../concepts/observability.md) setup, developers can use this name to retrieve the specific meter instance used by the framework. This allows for consistent naming and filtering of metrics in observability backends, making it easy to isolate and analyze telemetry data originating from YAAF agents.

It is part of a set of standard telemetry identifiers in YAAF, which also includes `YAAF_TRACER_NAME` for tracing and `YAAF_LOGGER_NAME` for logging [Source 1].

## Signature

The constant is a string literal with the value `"com.yaaf.metrics"`.

```typescript
export const YAAF_METER_NAME = "com.yaaf.metrics";
```

## Examples

### Retrieving the YAAF Meter

This example demonstrates how to use `YAAF_METER_NAME` with the OpenTelemetry API to get a reference to the same `Meter` instance that YAAF uses internally. This is useful for creating custom metrics that are logically grouped with YAAF's built-in metrics.

```typescript
import { metrics } from '@opentelemetry/api';
import { YAAF_METER_NAME } from 'yaaf';

// Assuming an OpenTelemetry MeterProvider is already configured and registered.
const meterProvider = metrics.getMeterProvider();

// Get the specific meter used by the YAAF framework.
const yaafMeter = meterProvider.getMeter(YAAF_METER_NAME);

// Now you can create custom instruments (counters, gauges, etc.)
// that will be associated with the same instrumentation scope as YAAF's
// internal metrics.
const customAgentCounter = yaafMeter.createCounter('custom.agent.invocations', {
  description: 'Counts custom agent invocations',
});

// Use the custom instrument.
customAgentCounter.add(1, { 'agent.name': 'MyCustomAgent' });
```

## See Also

- `YAAF_TRACER_NAME`: The constant for the OpenTelemetry tracer name.
- `YAAF_LOGGER_NAME`: The constant for the OpenTelemetry logger name.
- `YAAF_SERVICE_NAME`: The constant for the OpenTelemetry service name.

## Sources

[Source 1]: src/telemetry/attributes.ts