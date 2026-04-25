---
summary: Constructs a complete set of attributes for a YAAF telemetry span, combining base, type-specific, and custom attributes.
export_name: buildSpanAttributes
source_file: src/telemetry/attributes.ts
category: function
title: buildSpanAttributes
entity_type: api
search_terms:
 - telemetry span attributes
 - how to add custom span attributes
 - OpenTelemetry attributes
 - YAAF tracing
 - span metadata
 - create span attributes
 - getBaseAttributes
 - YAAFSpanType
 - llm.request attributes
 - tool.call attributes
 - agent.run span
 - custom telemetry data
stub: false
compiled_at: 2026-04-24T16:53:55.058Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/attributes.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `build[[[[[[[[Span]]]]]]]]Attributes` function is a utility for creating a complete set of attributes for an [OpenTelemetry](../concepts/open-telemetry.md) Span within the YAAF framework [Source 1]. It standardizes attribute creation by combining three sources:

1.  **Base Attributes**: Common attributes attached to every YAAF span, provided by the internal `getBaseAttributes` function. This ensures all spans in a [Trace](../concepts/trace.md) share consistent, high-cardinality dimensions.
2.  **Span Type**: A `span.type` attribute is added based on the `YAAFSpanType` argument provided.
3.  **Custom Attributes**: Any additional, context-specific attributes provided by the caller in the `custom` argument.

Using this function ensures that all telemetry data is consistent and correctly categorized, which is crucial for [Observability](../concepts/observability.md) and debugging.

## Signature

The function takes a span type and an optional object of custom attributes, and returns a complete `Attributes` object for use with an OpenTelemetry tracer.

```typescript
import type { Attributes } from "@opentelemetry/api";
import type { YAAFSpanType } from "yaaf";

export function buildSpanAttributes(
  spanType: YAAFSpanType,
  custom?: Attributes
): Attributes;
```

### Parameters

*   **`spanType: YAAFSpanType`**: A string literal specifying the type of operation the span represents. Possible values are:
    *   `"agent.run"`
    *   `"llm.request"`
    *   `"tool.call"`
    *   `"tool.execution"`
    *   `"tool.blocked"`
    *   `"memory.extract"`
    *   `"memory.retrieve"`
    *   `"compaction"`
*   **`custom?: Attributes`**: An optional object containing custom key-value pairs to add to the span. The `Attributes` type is defined by OpenTelemetry as `{[key: string]: AttributeValue}`. Defaults to an empty object if not provided.

### Returns

*   **`Attributes`**: A new object containing the merged base, type, and custom attributes.

## Examples

Creating attributes for an [LLM](../concepts/llm.md) request span with custom metadata about the model and provider.

```typescript
import { buildSpanAttributes } from 'yaaf';
import type { Attributes } from '@opentelemetry/api';

// Custom attributes specific to this LLM call
const customLlmAttributes: Attributes = {
  'llm.provider': 'openai',
  'llm.model_name': 'gpt-4o',
  'llm.request.temperature': 0.7,
  'llm.request.max_tokens': 1024,
};

// Build the full set of attributes
const spanAttributes = buildSpanAttributes('llm.request', customLlmAttributes);

/*
  The resulting `spanAttributes` object will look something like this:
  {
    // Base attributes from getBaseAttributes()
    'service.name': 'yaaf',
    'agent.name': 'my-research-agent', // if configured
    // Span type attribute
    'span.type': 'llm.request',
    // Custom attributes
    'llm.provider': 'openai',
    'llm.model_name': 'gpt-4o',
    'llm.request.temperature': 0.7,
    'llm.request.max_tokens': 1024
  }
*/

// These attributes can now be passed when creating a new span
// tracer.startSpan('my-llm-request', { attributes: spanAttributes });
```

## See Also

*   `YAAFSpanType`: The type definition for all standard span types within YAAF.
*   `getBaseAttributes`: The internal function that provides the base set of attributes for all YAAF spans.

## Sources

*   [Source 1]: `src/telemetry/attributes.ts`