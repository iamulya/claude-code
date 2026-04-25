---
title: Span
entity_type: api
summary: Represents an OpenTelemetry span, which is the fundamental unit of work in YAAF's distributed tracing system.
export_name: Span
source_file: src/telemetry/tracing.ts
category: type
search_terms:
 - OpenTelemetry tracing
 - distributed tracing in YAAF
 - how to add custom attributes to traces
 - instrumenting agent code
 - what is a span
 - trace context propagation
 - observability for agents
 - monitoring LLM calls
 - performance tracing
 - executeInSpan usage
 - OTel span
 - add metadata to spans
 - trace attributes
stub: false
compiled_at: 2026-04-24T17:39:45.755Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `Span` type represents a single unit of work or operation within YAAF's tracing system [Source 1]. It is the fundamental building block of a [Trace](../concepts/trace.md), capturing timing information, metadata (attributes), and relationships between operations. YAAF's tracing is built on the [OpenTelemetry](../concepts/open-telemetry.md) standard, and this `Span` type is a direct re-export from the `@opentelemetry/api` package [Source 1].

A `Span` can represent operations like a full agent run (`yaaf.agent.run`), a call to a large language model (`yaaf.llm.request`), or the invocation of a tool (`yaaf.tool.call`) [Source 2]. Spans are organized into a hierarchy, where child spans represent sub-operations within a parent span. For example, an `llm.request` span is a child of the `agent.run` span it belongs to [Source 2].

This system is opt-in and designed to have zero overhead [when](./when.md) disabled. It is activated by setting environment variables such as `OTEL_TRACES_EXPORTER` and calling `initYAAFTelemetry()` at application startup [Source 1, Source 2].

## Signature

`Span` is an interface re-exported from the `@opentelemetry/api` package. It is not instantiated directly by users but is provided by YAAF's tracing functions.

```typescript
import type { Span } from "@opentelemetry/api";

export type { Span };
```
[Source 1]

## Methods & Properties

While the `Span` interface from OpenTelemetry has many methods, YAAF users will most commonly interact with a few key methods to add custom context to traces. Many lifecycle methods like `start()` and `end()` are managed automatically by YAAF helper functions like `executeInSpan` [Source 1].

### `setAttribute(key: string, value: AttributeValue)`

Sets a single key-value pair attribute on the span. This is the most common way to add custom metadata, such as business-specific identifiers or operational details, to a trace [Source 2].

### `setAttributes(attributes: Attributes)`

Sets multiple attributes on the span at once.

### `addEvent(name: string, attributes?: Attributes)`

Records a time-stamped event within the span's lifecycle. This is useful for marking significant moments that occur during the operation's execution.

### `recordException(exception: Exception, time?: TimeInput)`

Records an error or exception that occurred during the span's execution. The `executeInSpan` helper calls this automatically if the wrapped function throws an error [Source 1].

### `setStatus(status: SpanStatus)`

Sets the status of the span, typically to indicate whether the operation completed successfully (`{ code: SpanStatusCode.OK }`) or with an error (`{ code: SpanStatusCode.ERROR, message: '...' }`).

## Examples

### Wrapping a Custom Operation in a Span

The `executeInSpan` helper is the recommended way to create custom spans. It handles span creation, context attachment, error recording, and ending the span automatically.

```typescript
import { executeInSpan } from 'yaaf';

async function fetchUserData(url: string) {
  // This entire function will be traced as a single span named 'my_service.fetch'.
  const data = await executeInSpan('my_service.fetch', async (span) => {
    // The span object is passed to the callback.
    span.setAttribute('http.url', url);
    const response = await fetch(url);
    span.setAttribute('http.status_code', response.status);
    return response.json();
  });
  return data;
}
```
[Source 1, Source 2]

### Annotating an Existing YAAF Span

Within agent logic or hooks, you can get the current active span for the agent run or tool call and add attributes to it.

```typescript
import { getCurrentRunSpan } from 'yaaf';

// Inside a tool or hook where an agent run is active
function processCustomerData(customerId: string) {
  // Get the current agent.run span
  const runSpan = getCurrentRunSpan();

  // Add a business-specific attribute to it
  runSpan?.setAttribute('business.customer_id', customerId);

  // ... continue processing
}
```
[Source 2]

## Sources

[Source 1]: src/telemetry/tracing.ts
[Source 2]: docs/telemetry.md