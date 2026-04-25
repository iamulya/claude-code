---
summary: Ends an OpenTelemetry span associated with an Agent.run() execution.
export_name: endAgentRunSpan
source_file: src/telemetry/tracing.ts
category: function
title: endAgentRunSpan
entity_type: api
search_terms:
 - stop agent trace
 - finish agent run span
 - OpenTelemetry agent tracing
 - how to end a trace
 - agent execution telemetry
 - YAAF tracing API
 - instrumenting agent runs
 - telemetry for agent lifecycle
 - close OTel span
 - tracing agent completion
 - agent.run telemetry
 - complete a trace
stub: false
compiled_at: 2026-04-24T17:04:09.637Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `endAgentRun[[[[[[[[Span]]]]]]]]` function concludes an [OpenTelemetry](../concepts/open-telemetry.md) Span that was initiated by `startAgentRunSpan` for a single `Agent.run()` execution turn [Source 1]. It marks the end of the top-level [Trace](../concepts/trace.md) for an agent interaction.

This function is part of YAAF's opt-in tracing system. [when](./when.md) tracing is enabled, `startAgentRunSpan` creates a span and stores it in an `AsyncLocalStorage` context. `endAgentRunSpan` retrieves this active span from the context and closes it, automatically recording its duration. Because it uses this shared context, the span object does not need to be passed directly to the function [Source 1].

It is best practice to call `endAgentRunSpan` within a `finally` block to ensure that the span is closed even if the agent execution encounters an error.

## Signature

```typescript
export function endAgentRunSpan(opts?: {
  /* options for adding final attributes or status */
}): void;
```
[Source 1]

### Parameters

-   `opts` (optional): An object that can be used to add final attributes or set the status of the span before it is closed. The exact structure of this object is not detailed in the provided source.

## Examples

The most common usage pattern is to wrap an `agent.run()` call in a `try...finally` block to guarantee the span is closed.

```typescript
import { Agent } from 'yaaf'; // Assuming Agent is imported
import { startAgentRunSpan, endAgentRunSpan } from 'yaaf/telemetry';

// Assume an agent instance is configured
const agent = new Agent({
  /* ... configuration ... */
});
const userInput = "What is the capital of France?";

// Start the span before the agent execution
startAgentRunSpan({
  // Attributes for the span
  agentName: 'QnAAgent',
  input: userInput,
});

try {
  const result = await agent.run(userInput);
  console.log('Agent Result:', result);
} catch (error) {
  // The span will automatically record the exception when it ends.
  // Re-throw the error to propagate it.
  console.error('Agent execution failed:', error);
  throw error;
} finally {
  // This ensures the span is always closed, whether the run
  // succeeded or failed.
  endAgentRunSpan();
}
```

## See Also

-   `startAgentRunSpan`: The function used to initiate the agent run span that this function ends.

## Sources

[Source 1]: src/telemetry/tracing.ts