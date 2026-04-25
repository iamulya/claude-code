---
summary: Ends an OpenTelemetry span associated with a tool invocation.
export_name: endToolCallSpan
source_file: src/telemetry/tracing.ts
category: function
title: endToolCallSpan
entity_type: api
search_terms:
 - end tool span
 - finish tool call trace
 - OpenTelemetry tool tracing
 - instrument tool usage
 - YAAF tracing API
 - how to trace tool calls
 - telemetry for agent tools
 - span lifecycle management
 - endToolCallSpan vs endToolExecutionSpan
 - agent observability
 - distributed tracing for tools
 - mark tool call complete
stub: false
compiled_at: 2026-04-24T17:04:14.199Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `endToolCall[[[[[[[[Span]]]]]]]]` function is part of the YAAF [OpenTelemetry](../concepts/open-telemetry.md) tracing subsystem. It marks the completion of a `tool.call` Span that was previously initiated by `startToolCallSpan` [Source 1].

In the YAAF tracing hierarchy, a `tool.call` span represents the entire lifecycle of a tool invocation request. This is a parent to the more granular `tool.execution` span, which traces the actual execution of the tool's function body. `endToolCallSpan` is called after the tool has finished executing to close the overarching span [Source 1].

This function, like the rest of the tracing API, is a no-op and incurs zero performance overhead if tracing is not enabled. Tracing is activated by setting the `YAAF_OTEL_TRACES_EXPORTER` or `OTEL_TRACES_EXPORTER` environment variables and initializing the [Telemetry System](../subsystems/telemetry-system.md) with `initYAAFTelemetry()` [Source 1].

Unlike `endLLMRequestSpan`, this function does not require a `Span` object to be passed in. It operates on the current tool-level context established by `startToolCallSpan` via `AsyncLocalStorage` [Source 1].

## Signature

The function is exported with the following signature. It accepts an optional object to add attributes to the span upon completion [Source 1].

```typescript
export function endToolCallSpan(opts?: { /* ... */ }): void;
```

The specific properties of the `opts` object are not detailed in the provided source material [Source 1].

## Examples

The following example illustrates the typical usage pattern, where `endToolCallSpan` is called in a `finally` block to ensure the span is closed even if the [Tool Execution](../concepts/tool-execution.md) fails.

```typescript
import { startToolCallSpan, endToolCallSpan, startToolExecutionSpan, endToolExecutionSpan } from 'yaaf';
import { myToolRegistry } from './tools';

async function invokeAgentTool(toolName: string, toolInput: any) {
  // Start the overarching span for the tool call
  startToolCallSpan({ toolName, toolInput });

  let result;
  let error;

  try {
    const tool = myToolRegistry.get(toolName);
    
    // Start a more specific span for the actual execution
    const executionSpan = startToolExecutionSpan(); 
    try {
      result = await tool.execute(toolInput);
    } finally {
      // End the inner execution span
      endToolExecutionSpan(executionSpan, { result });
    }

  } catch (e) {
    error = e;
    throw e;
  } finally {
    // End the main tool call span, adding final attributes
    endToolCallSpan({ result, error });
  }

  return result;
}
```

## See Also

- `startToolCallSpan`
- `startToolExecutionSpan`
- `endToolExecutionSpan`
- `startAgentRunSpan`
- `executeInSpan`

## Sources

[Source 1]: src/telemetry/tracing.ts