---
summary: Ends an OpenTelemetry span associated with the execution of a tool function.
export_name: endToolExecutionSpan
source_file: src/telemetry/tracing.ts
category: function
title: endToolExecutionSpan
entity_type: api
search_terms:
 - tracing tool execution
 - OpenTelemetry tool span
 - end tool span
 - instrumenting tool functions
 - YAAF telemetry
 - how to trace a tool
 - tool performance monitoring
 - span lifecycle
 - tool.execution span
 - finish tracing tool
 - record tool result in trace
 - close telemetry span
stub: false
compiled_at: 2026-04-24T17:04:26.912Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `endToolExecution[[[[[[[[Span]]]]]]]]` function concludes an [OpenTelemetry](../concepts/open-telemetry.md) `Span` that was initiated by `startToolExecutionSpan`. It marks the completion of the actual execution of a tool's function logic. [Source 1]

This function is a part of YAAF's optional, zero-overhead tracing system. The `tool.execution` Span is a child of the `tool.call` span, creating a nested hierarchy that provides detailed performance insights into tool usage within an agent run. [Source 1]

To use this function, the `Span` object returned by `startToolExecutionSpan` must be passed as the first argument. This is typically done within a `try...finally` block to ensure the span is closed even if the tool's execution throws an error. [Source 1]

Tracing must be enabled via environment variables and initialized by calling `initYAAFTelemetry()` for this function to have any effect. If tracing is disabled, it becomes a no-op with zero performance overhead. [Source 1]

## Signature

The function takes the `Span` to be ended and an optional metadata object. [Source 1]

```typescript
export function endToolExecutionSpan(
  span: Span,
  meta?: { /* ... */ }
): void;
```

### Parameters

-   `span` (`Span`): The OpenTelemetry `Span` object returned from a corresponding call to `startToolExecutionSpan`.
-   `meta` (optional `object`): An optional object containing metadata to be added as attributes to the span before it is closed. The exact structure of this object is not detailed in the provided source.

## Examples

The most common usage pattern is to pair `startToolExecutionSpan` and `endToolExecutionSpan` within a `try...finally` block to ensure the span is always closed.

```typescript
import { startToolExecutionSpan, endToolExecutionSpan } from 'yaaf';
import { Span, SpanStatusCode } from '@opentelemetry/api';

async function myInstrumentedTool(input: string): Promise<string> {
  // 1. Start the span before executing the tool's logic.
  const span: Span = startToolExecutionSpan();

  try {
    // 2. Execute the core logic of the tool.
    const result = `Processed: ${input}`;

    // 3. (Optional) Record success attributes on the span.
    span.setStatus({ code: SpanStatusCode.OK });
    span.setAttribute('tool.output.length', result.length);

    return result;
  } catch (error) {
    // 4. (Optional) Record failure details on the span if an error occurs.
    if (error instanceof Error) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
    throw error;
  } finally {
    // 5. End the span in the 'finally' block to guarantee it closes.
    endToolExecutionSpan(span);
  }
}
```

## See Also

-   `startToolExecutionSpan`: The function used to begin the span that this function ends.
-   `startToolCallSpan`: The function that creates the parent span for a tool invocation.
-   `executeInSpan`: A higher-level utility that wraps a function in a new span, automatically handling its start and end.

## Sources

[Source 1]: src/telemetry/tracing.ts