---
title: executeInSpan
entity_type: api
summary: Wraps an asynchronous function in a new OpenTelemetry span, parented to the current agent turn.
export_name: executeInSpan
source_file: src/telemetry/tracing.ts
category: function
search_terms:
 - custom OpenTelemetry span
 - add trace to agent
 - instrument custom code
 - wrap function in span
 - YAAF observability
 - manual instrumentation
 - how to trace a function
 - create child span
 - telemetry helper
 - opentelemetry async function
 - record exceptions in traces
 - add attributes to span
stub: false
compiled_at: 2026-04-24T17:05:36.796Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `executeIn[[[[[[[[Span]]]]]]]]` function is a utility for custom instrumentation within the YAAF framework [Source 1, Source 2]. It wraps an asynchronous function call in a new [OpenTelemetry](../concepts/open-telemetry.md) Span, providing a simple way to [Trace](../concepts/trace.md) arbitrary blocks of code.

This function is designed to integrate seamlessly with YAAF's automatic tracing. [when](./when.md) called during an agent's execution, the new span is automatically parented to the currently active span (e.g., `yaaf.agent.run` or `yaaf.tool.call`) through [Context Propagation](../concepts/context-propagation.md) via `AsyncLocalStorage` [Source 1, Source 2]. This eliminates the need for manual parent span management.

Key features include:
- **Automatic Lifecycle Management**: The span is started before the provided function executes and is automatically ended upon its completion, whether it resolves successfully or throws an error [Source 2].
- **Exception Recording**: If the wrapped function throws an exception, the error is automatically recorded on the span [Source 2].
- **Contextual Attributes**: The function to be executed receives the newly created `Span` object as an argument, allowing for the addition of custom attributes for more detailed [Observability](../concepts/observability.md) [Source 1, Source 2].
- **Conditional Execution**: The entire operation is a no-op if YAAF tracing is not enabled, ensuring zero performance overhead in environments where tracing is turned off [Source 2].

## Signature

```typescript
export async function executeInSpan<T>(
  spanName: string,
  fn: (span: Span) => Promise<T>,
  attrs?: Attributes,
): Promise<T>
```

**Parameters:**

- `spanName` (`string`): The name for the new span (e.g., `'my_service.fetch'`).
- `fn` (`(span: Span) => Promise<T>`): An asynchronous function to be executed within the span. It receives the newly created `Span` instance as its sole argument.
- `attrs` (`Attributes`, optional): A key-value object of initial attributes to set on the span at creation time.

**Returns:**

- `Promise<T>`: A promise that resolves with the return value of the provided function `fn`.

## Examples

The most common use case is to instrument calls to external services or significant computational tasks within a tool's implementation.

```typescript
import { executeInSpan } from 'yaaf';

// Assume 'url' is defined elsewhere
declare const url: string;

// Wrap a fetch call in a named span to trace its performance and metadata.
const data = await executeInSpan('my_service.fetch', async (span) => {
  // The 'span' object can be used to add custom attributes for observability.
  span.setAttribute('http.url', url);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    // The function automatically records exceptions on the span.
    throw new Error(`API request failed with status ${response.status}`);
  }
  
  return response.json();
});
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts