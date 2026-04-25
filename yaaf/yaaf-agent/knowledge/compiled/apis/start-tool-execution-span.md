---
summary: Starts a child OpenTelemetry span for the actual tool function execution.
export_name: startToolExecutionSpan
source_file: src/telemetry/tracing.ts
category: function
title: startToolExecutionSpan
entity_type: api
search_terms:
 - tool execution tracing
 - opentelemetry tool span
 - instrumenting tool functions
 - YAAF tracing API
 - how to trace a tool call
 - span for tool sandbox
 - startToolCallSpan child
 - telemetry for tools
 - monitoring tool performance
 - endToolExecutionSpan pair
 - agent tool observability
 - measure tool function duration
stub: false
compiled_at: 2026-04-24T17:40:21.037Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `startToolExecution[[[[[[[[Span]]]]]]]]` function creates and starts an [OpenTelemetry](../concepts/open-telemetry.md) Span that specifically measures the execution of a tool's underlying function [Source 1]. This is distinct from the span created by `startToolCallSpan`, which represents the entire tool invocation process.

This function is part of YAAF's hierarchical tracing system. The span it creates is designed to be a child of the `tool.call` span, which is in turn a child of the main `agent.run` span. This allows for detailed performance analysis, breaking down the time spent in tool invocation versus the actual work performed by the tool's code, which might run in a separate environment like a sandbox [Source 1].

To complete the [Trace](../concepts/trace.md), the `Span` object returned by this function must be passed to `endToolExecutionSpan` upon the tool function's completion or failure.

Tracing is disabled by default and must be activated by setting the appropriate environment variables and calling `initYAAFTelemetry` at application startup [Source 1]. If tracing is not enabled, this function returns a no-op `Span` and incurs zero performance overhead.

## Signature

The function takes no arguments and returns an OpenTelemetry `Span` object [Source 1].

```typescript
import type { Span } from '@opentelemetry/api';

export function startToolExecutionSpan(): Span;
```

## Examples

The following example demonstrates how to wrap the execution of a tool's function with `startToolExecutionSpan` and `endToolExecutionSpan` to capture its duration and outcome.

```typescript
import { startToolExecutionSpan, endToolExecutionSpan } from 'yaaf';
import { Span } from '@opentelemetry/api';

async function executeMyTool(toolLogic: () => Promise<any>) {
  // Start the span right before executing the tool's code.
  const executionSpan: Span = startToolExecutionSpan();

  try {
    const result = await toolLogic();
    // End the span on success.
    endToolExecutionSpan(executionSpan, { outcome: 'success' });
    return result;
  } catch (error) {
    // End the span on failure, capturing the error.
    endToolExecutionSpan(executionSpan, { outcome: 'error', error });
    throw error;
  }
}

// Usage within a tool execution environment:
// await executeMyTool(async () => { /* ... tool's actual work ... */ });
```

## See Also

- `endToolExecutionSpan`
- `startToolCallSpan`
- `initYAAFTelemetry`

## Sources

[Source 1]: src/telemetry/tracing.ts