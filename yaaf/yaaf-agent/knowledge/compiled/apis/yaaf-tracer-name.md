---
summary: The OpenTelemetry tracer name used by YAAF's tracing module.
export_name: YAAF_TRACER_NAME
source_file: src/telemetry/attributes.ts
category: constant
title: YAAF_TRACER_NAME
entity_type: api
search_terms:
 - opentelemetry tracer name
 - yaaf tracing identifier
 - com.yaaf.tracing
 - how to get yaaf tracer
 - telemetry configuration
 - tracing instrumentation name
 - otel tracer for yaaf
 - yaaf observability
 - span creation name
 - instrumentation scope name
stub: false
compiled_at: 2026-04-24T17:50:46.117Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/attributes.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`YAAF_TRACER_NAME` is a constant string that serves as the unique identifier for the [OpenTelemetry](../concepts/open-telemetry.md) Tracer used within the YAAF framework [Source 1]. Its value is `"com.yaaf.tracing"` [Source 1].

This constant is used to acquire the specific tracer instance responsible for creating all telemetry spans emitted by YAAF. Using a consistent tracer name ensures that all traces originating from the framework can be easily identified, filtered, and analyzed in [Observability](../concepts/observability.md) platforms. It is part of a set of standard telemetry identifiers, including `YAAF_SERVICE_NAME`, `YAAF_METER_NAME`, and `YAAF_LOGGER_NAME`, which provide a coherent naming scheme for YAAF's observability signals [Source 1].

## Signature

`YAAF_TRACER_NAME` is a string constant.

```typescript
export const YAAF_TRACER_NAME = "com.yaaf.tracing";
```

- **Type**: `string`
- **Value**: `"com.yaaf.tracing"`

## Examples

The most common use case for `YAAF_TRACER_NAME` is to retrieve the YAAF-specific tracer from an OpenTelemetry `TracerProvider`. This is useful [when](./when.md) adding custom instrumentation that should be associated with YAAF's telemetry.

```typescript
import { trace } from '@opentelemetry/api';
import { YAAF_TRACER_NAME } from 'yaaf';

// In an environment where OpenTelemetry is configured,
// get the tracer instance specific to YAAF.
const tracer = trace.getTracer(YAAF_TRACER_NAME);

// Start a new span using the YAAF tracer. This span will
// be associated with the same instrumentation scope as
// spans created internally by the framework.
tracer.startActiveSpan('my-custom-agent-logic', span => {
  try {
    console.log('Performing a custom operation within a YAAF trace...');
    // ... your application logic here
  } finally {
    span.end();
  }
});
```

## See Also

- `YAAF_SERVICE_NAME`: The OpenTelemetry service name for YAAF.
- `YAAF_METER_NAME`: The identifier for YAAF's OpenTelemetry metrics.
- `YAAF_LOGGER_NAME`: The identifier for YAAF's OpenTelemetry logs.

## Sources

[Source 1]: src/telemetry/attributes.ts