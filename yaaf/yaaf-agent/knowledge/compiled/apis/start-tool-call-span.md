---
summary: Starts an OpenTelemetry span for one tool invocation before execution.
export_name: startToolCallSpan
source_file: src/telemetry/tracing.ts
category: function
title: startToolCallSpan
entity_type: api
search_terms:
 - instrument tool calls
 - trace tool usage
 - OpenTelemetry tool span
 - YAAF tracing API
 - how to trace a tool
 - tool call telemetry
 - agent tool monitoring
 - start tool span
 - endToolCallSpan
 - tool execution parent span
 - AsyncLocalStorage for tools
 - YAAF_OTEL_TRACES_EXPORTER
 - agent observability
stub: false
compiled_at: 2026-04-24T17:40:20.060Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `startToolCall[[[[[[[[Span]]]]]]]]` function begins an [OpenTelemetry](../concepts/open-telemetry.md) Span that represents a single tool invocation within an agent's execution flow [Source 1]. It is a key component of YAAF's optional, zero-overhead tracing system.

This function is designed to be called immediately before a tool is executed. Its primary role is to establish a tracing context using `AsyncLocalStorage`. This allows subsequent, more granular spans, such as the one created by `startToolExecutionSpan`, to automatically be nested as children without needing to manually pass span objects [Source 1].

The typical span hierarchy is `agent.run` → `tool.call` → `tool.execution`. `startToolCallSpan` creates the `tool.call` span. Each call to `startToolCallSpan` should be paired with a corresponding call to `endToolCallSpan` to properly close the span [Source 1].

Note that tracing is disabled by default in YAAF. To use this function, tracing must be activated by setting the `YAAF_OTEL_TRACES_EXPORTER` or `OTEL_TRACES_EXPORTER` environment variable and initializing the [Telemetry System](../subsystems/telemetry-system.md) [Source 1]. If tracing is not enabled, this function becomes a no-op with zero performance overhead.

## Signature

```typescript
export function startToolCallSpan(opts: { /* ... */ }): void;
```

### Parameters

-   `opts`: An options object containing details about the tool call. The specific properties of this object are not detailed in the provided source material [Source 1].

## Examples

While the source material does not provide a specific code example for `startToolCallSpan`, its intended usage pattern is as part of a pair with `endToolCallSpan`, wrapping the logic that invokes a tool.

A typical sequence of operations would be:
1.  Call `startToolCallSpan` before the tool invocation begins.
2.  Inside the tool's sandboxed execution environment, call `startToolExecutionSpan` to create a child span for the actual function execution.
3.  After the tool function completes, call `endToolExecutionSpan` with the span from the previous step.
4.  After the entire tool invocation process is complete, call `endToolCallSpan`.

This creates a nested span structure that accurately reflects the tool call lifecycle [Source 1].

## See Also

-   `endToolCallSpan`
-   `startToolExecutionSpan`
-   `endToolExecutionSpan`
-   `startAgentRunSpan`
-   `isTracingEnabled`

## Sources

[Source 1]: src/telemetry/tracing.ts