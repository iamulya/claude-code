---
title: getCurrentRunSpan
entity_type: api
summary: Retrieves the OpenTelemetry span for the current agent run.
export_name: getCurrentRunSpan
source_file: src/telemetry.ts
category: function
search_terms:
 - get current agent span
 - opentelemetry agent run
 - add attribute to run span
 - custom telemetry annotation
 - access root span
 - YAAF observability
 - tracing context
 - how to get agent span
 - instrument agent run
 - AsyncLocalStorage span propagation
 - yaaf.agent.run span
 - annotate agent execution
stub: false
compiled_at: 2026-04-24T17:09:02.829Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
compiled_from_quality: documentation
confidence: 0.95
---

## Overview

The `getCurrentRun[[[[[[[[Span]]]]]]]]` function retrieves the active [OpenTelemetry](../concepts/open-telemetry.md) `Span` object corresponding to the current `Agent.run()` execution [Source 1].

Each call to `Agent.run()` creates a root Span named `yaaf.agent.run`. This function provides a way to access that specific span from anywhere within the agent's execution context, such as inside a tool or a hook. This is useful for adding custom attributes or annotations that apply to the entire agent run, rather than a more specific operation like an [[]] Call]] or [Tool Execution](../concepts/tool-execution.md) [Source 1].

The function works without requiring the span to be passed down manually through function arguments. YAAF uses `AsyncLocalStorage` to propagate the active tracing context, allowing `getCurrentRunSpan` to look up the correct span automatically [Source 1].

If telemetry is not enabled or if the function is called outside of an active `Agent.run()` context, it will return `undefined` [Source 1].

## Signature

The function takes no arguments and returns an OpenTelemetry `Span` object or `undefined`.

```typescript
import { Span } from '@opentelemetry/api';

export function getCurrentRunSpan(): Span | undefined;
```

## Examples

### Annotating the Run Span from a Tool

This example shows how a tool could add a business-specific attribute, like a customer ID, directly to the root span of the agent run.

```typescript
import { Agent, Tool, getCurrentRunSpan } from 'yaaf';
import { z } from 'zod';

// A tool that retrieves user data
const getUserData = new Tool({
  name: 'getUserData',
  description: 'Fetches data for a given user ID.',
  schema: z.object({ userId: z.string() }),
  async implementation({ userId }) {
    // Annotate the main agent run span with the customer ID being processed
    const runSpan = getCurrentRunSpan();
    runSpan?.setAttribute('business.customer_id', userId);

    // ... tool logic to fetch data
    return { success: true, data: { id: userId, name: 'Jane Doe' } };
  },
});

// Agent setup would follow...
```
[Source 1]

## See Also

*   `executeInSpan`: A function to wrap arbitrary code in a new child span.
*   `getCurrentToolSpan`: A function to retrieve the span for the currently executing tool call.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md