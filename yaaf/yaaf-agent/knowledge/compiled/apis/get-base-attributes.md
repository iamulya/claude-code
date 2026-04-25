---
summary: Retrieves the base attributes applied to every YAAF telemetry span.
export_name: getBaseAttributes
source_file: src/telemetry/attributes.ts
category: function
title: getBaseAttributes
entity_type: api
search_terms:
 - telemetry attributes
 - opentelemetry span data
 - common span attributes
 - how to configure telemetry
 - YAAF_OTEL_INCLUDE_AGENT_NAME
 - default span properties
 - tracing dimensions
 - cardinality dimensions
 - shared trace attributes
 - otel configuration
 - base span info
 - standard telemetry tags
stub: false
compiled_at: 2026-04-24T17:08:51.723Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/attributes.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `getBaseAttributes` function returns a set of base attributes that are attached to every telemetry [Span](./span.md) created by the YAAF framework [Source 1]. Its primary purpose is to ensure that all spans within a single [Trace](../concepts/trace.md) share a consistent set of high-level, cardinality-defining dimensions [Source 1].

This function is a key part of YAAF's telemetry subsystem, providing a standardized foundation for [Observability](../concepts/observability.md). The attributes returned can be controlled via environment variables, allowing for configuration of telemetry data cardinality without code changes. For example, the inclusion of the agent name can be toggled with the `YAAF_OTEL_INCLUDE_AGENT_NAME` environment variable [Source 1].

## Signature

The function is exported with the following signature. It accepts an optional options object, though the specific properties of this object are not detailed in the source material [Source 1].

```typescript
export function getBaseAttributes(opts?: { /* ... */ }): Attributes;
```

**Parameters:**

*   `opts` (optional): An object for configuration. The source material indicates configuration is primarily handled via environment variables [Source 1].

**Returns:**

*   `Attributes`: An object conforming to the [OpenTelemetry](../concepts/open-telemetry.md) `Attributes` type, containing the base key-value pairs for a span.

## Examples

The following example demonstrates how a developer might use `getBaseAttributes` to create a custom OpenTelemetry span that includes the standard YAAF dimensions for consistency.

```typescript
import { getBaseAttributes } from 'yaaf';
import { trace, Attributes } from '@opentelemetry/api';

// Assume an OpenTelemetry tracer is configured
const tracer = trace.getTracer('my-app-tracer');

// Get the standard base attributes from YAAF
const baseAttributes: Attributes = getBaseAttributes();

// Start a new span for a custom operation, including the base attributes
tracer.startActiveSpan('my-custom-operation', { attributes: baseAttributes }, (span) => {
  console.log('Performing a custom operation with standard YAAF telemetry...');
  // ... application logic ...
  span.end();
});
```

## See Also

*   `buildSpanAttributes`: A related utility function that combines these base attributes with span-specific and custom attributes.
*   `YAAFSpanType`: The type definition for standard span types within YAAF.

## Sources

[Source 1]: src/telemetry/attributes.ts