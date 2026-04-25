---
summary: Checks whether YAAF tracing is currently active based on environment variables and TracerProvider registration.
export_name: isTracingEnabled
source_file: src/telemetry/tracing.ts
category: function
title: isTracingEnabled
entity_type: api
search_terms:
 - check if tracing is on
 - enable YAAF telemetry
 - disable OpenTelemetry
 - YAAF_OTEL_TRACES_EXPORTER
 - OTEL_TRACES_EXPORTER
 - how to activate tracing
 - conditional tracing logic
 - is telemetry enabled
 - performance overhead of tracing
 - no-op spans
 - initYAAFTelemetry
 - TracerProvider registration
 - zero-overhead tracing
stub: false
compiled_at: 2026-04-24T17:15:21.070Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `isTracingEnabled` function returns a boolean value indicating whether the YAAF [OpenTelemetry](../concepts/open-telemetry.md) tracing system is currently active [Source 1]. This allows for conditional logic, such as avoiding expensive computations for [Span](./span.md) attributes [when](./when.md) tracing is disabled.

Tracing is considered active only if two conditions are met [Source 1]:

1.  An environment variable is set to enable an exporter. YAAF checks `YAAF_OTEL_TRACES_EXPORTER` first, then falls back to the standard OpenTelemetry variable `OTEL_TRACES_EXPORTER`. The value must be non-empty and not set to `"none"`.
2.  An OpenTelemetry `TracerProvider` has been registered for the process. In YAAF, this is typically done by calling `initYAAFTelemetry()` at application startup.

If either of these conditions is false, `isTracingEnabled` returns `false`, and all YAAF tracing functions (like `startAgentRunSpan` or `executeInSpan`) become no-ops, ensuring zero performance overhead in production environments where tracing is not explicitly enabled [Source 1].

## Signature

```typescript
export function isTracingEnabled(): boolean;
```

## Examples

### Conditionally Adding Expensive Attributes

Use `isTracingEnabled` to guard against performing costly work that is only needed for telemetry. This avoids performance penalties when tracing is turned off.

```typescript
import { isTracingEnabled, executeInSpan } from 'yaaf';

async function computeComplexDataForTracing() {
  // Represents an expensive operation, e.g., serializing a large object.
  return { detail: 'some-very-detailed-state' };
}

async function myExpensiveOperation() {
  await executeInSpan('my-op', async (span) => {
    // Avoid the cost of computeComplexDataForTracing() if tracing is disabled.
    if (isTracingEnabled()) {
      const complexData = await computeComplexDataForTracing();
      span.setAttribute('my.complex.data', JSON.stringify(complexData));
    }

    // ... continue with the main work of the operation.
    return;
  });
}
```

## See Also

*   `initYAAFTelemetry()`: The function used to initialize and register the tracer provider required for tracing to be enabled.

## Sources

[Source 1]: src/telemetry/tracing.ts