---
summary: Starts a new OpenTelemetry span for an Agent.run() execution, setting the run-level context.
export_name: startAgentRunSpan
source_file: src/telemetry/tracing.ts
category: function
title: startAgentRunSpan
entity_type: api
search_terms:
 - OpenTelemetry tracing
 - start agent span
 - trace agent execution
 - how to trace an agent run
 - YAAF telemetry
 - instrumenting agent.run
 - parent span for agent
 - AsyncLocalStorage context
 - OTel span hierarchy
 - YAAF_OTEL_TRACES_EXPORTER
 - distributed tracing for agents
 - monitoring agent performance
 - instrumentation entry point
stub: false
compiled_at: 2026-04-24T17:40:02.328Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `startAgentRun[[[[[[[[Span]]]]]]]]` function creates a new [OpenTelemetry](../concepts/open-telemetry.md) Span that represents a single execution of an agent's `run()` method. It serves as the top-level or root span for all operations that occur within that [Agent Turn](../concepts/agent-turn.md) [Source 1].

A key feature of this function is its use of `AsyncLocalStorage` to set a run-level context. This allows all subsequent spans created during the agent's execution, such as those for [LLM](../concepts/llm.md) requests (`startLLMRequestSpan`) or [Tool Calls](../concepts/tool-calls.md) (`startToolCallSpan`), to be automatically parented to this run span without needing to pass the span object explicitly through function calls [Source 1].

This function is part of YAAF's opt-in tracing system. If tracing is disabled, calling this function is a no-op with zero performance overhead. Tracing is enabled by setting the `YAAF_OTEL_TRACES_EXPORTER` or `OTEL_TRACES_EXPORTER` environment variables and initializing telemetry with `initYAAFTelemetry()` at application startup [Source 1].

Every call to `startAgentRunSpan` should be paired with a corresponding call to `endAgentRunSpan` to ensure the span is correctly closed.

## Signature

```typescript
import type { Span } from '@opentelemetry/api';

export function startAgentRunSpan(opts: { 
  /* Agent and run-specific attributes */ 
}): Span;
```

**Parameters:**

*   `opts` (object): An object containing attributes to be attached to the span. The specific properties for this object are not detailed in the provided source material [Source 1].

**Returns:**

*   `Span`: The newly created OpenTelemetry `Span` object, or a no-op span if tracing is disabled [Source 1].

## Examples

The following example illustrates the typical lifecycle pattern of creating and ending an agent run span.

```typescript
import { startAgentRunSpan, endAgentRunSpan } from 'yaaf';
import { trace } from '@opentelemetry/api';

async function runAgent(input: string) {
  // Start the top-level span for this agent run.
  // The 'opts' would contain relevant metadata about the run.
  const span = startAgentRunSpan({
    /* attributes like agent name, run ID, etc. */
  });

  try {
    // All agent logic, including LLM calls and tool usage,
    // would execute here. Any spans created by YAAF's telemetry
    // helpers will automatically be children of 'span'.
    console.log('Executing agent logic...');
    // ... do work ...
    
    // You can also get the current span from the tracer if needed
    const currentSpan = trace.getActiveSpan();
    currentSpan?.addEvent('Reached midpoint of execution.');

  } catch (error) {
    // It is important to record exceptions on the span
    span.recordException(error as Error);
    span.setStatus({ code: 2, message: (error as Error).message }); // 2 = ERROR
    throw error;
  } finally {
    // Always ensure the span is ended.
    endAgentRunSpan({ span });
  }
}
```

## See Also

*   `endAgentRunSpan`
*   `startLLMRequestSpan`
*   `startToolCallSpan`
*   `executeInSpan`

## Sources

[Source 1]: src/telemetry/tracing.ts