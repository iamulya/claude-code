---
summary: Generates the standard set of OpenTelemetry attributes included in every YAAF span to ensure consistent cardinality.
export_name: getBaseAttributes
source_file: src/telemetry/attributes.ts
category: function
title: getBaseAttributes
entity_type: api
stub: false
compiled_at: 2026-04-16T14:36:54.010Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/telemetry/attributes.ts
confidence: 1
---

## Overview
`getBaseAttributes` is a utility function used to generate a consistent set of OpenTelemetry `Attributes` for use in framework-level tracing and metrics. It ensures that every span created by the YAAF tracing module shares common dimensions, which is essential for maintaining predictable cardinality across observability data.

The function is designed to mirror telemetry patterns used in production environments while being scoped specifically to the YAAF configuration surface. It abstracts away complexities such as session management or OAuth details, focusing instead on agent-specific metadata.

## Signature
```typescript
export function getBaseAttributes(opts?: {
  // Configuration options for attribute generation
}): Attributes
```

### Parameters
*   `opts`: An optional configuration object. While the internal properties are managed by the framework, the behavior of this function is influenced by environment variables:
    *   `YAAF_OTEL_INCLUDE_AGENT_NAME`: A boolean flag (defaulting to `true`) that determines if the agent's identifier is included in the base attribute set.

### Returns
Returns an `Attributes` object (from the `@opentelemetry/api` package) containing standard YAAF metadata.

## Examples

### Basic Usage
This example demonstrates how to retrieve the base attributes for manual span creation.

```typescript
import { getBaseAttributes } from 'yaaf/telemetry';
import { trace } from '@opentelemetry/api';

const baseAttributes = getBaseAttributes();
const tracer = trace.getTracer('my-tracer');

tracer.startSpan('custom-operation', {
  attributes: {
    ...baseAttributes,
    'custom.attribute': 'value'
  }
});
```

### Integration with buildSpanAttributes
In practice, `getBaseAttributes` is often used internally by `buildSpanAttributes` to construct a complete attribute set for specific YAAF operations.

```typescript
import { buildSpanAttributes } from 'yaaf/telemetry';

// buildSpanAttributes internally calls getBaseAttributes
const attributes = buildSpanAttributes('agent.run', {
  'agent.id': 'assistant-01'
});
```

## See Also
* `buildSpanAttributes`: A higher-level utility that combines base attributes with span-specific types.
* `YAAFSpanType`: The union type defining valid span categories in YAAF.

## Sources
* `src/telemetry/attributes.ts`