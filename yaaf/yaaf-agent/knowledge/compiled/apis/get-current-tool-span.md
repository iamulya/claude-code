---
title: getCurrentToolSpan
entity_type: api
summary: Retrieves the OpenTelemetry span for the current tool call.
export_name: getCurrentToolSpan
source_file: src/telemetry.ts
category: function
search_terms:
 - get current tool span
 - opentelemetry tool call
 - add attributes to tool span
 - instrument tool execution
 - YAAF observability
 - tracing tool calls
 - get active tool span
 - annotate tool span
 - custom tool instrumentation
 - how to get tool span
 - telemetry inside a tool
 - access tool call context
stub: false
compiled_at: 2026-04-24T17:09:05.502Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
compiled_from_quality: documentation
confidence: 0.95
---

## Overview

The `getCurrentTool[[[[[[[[Span]]]]]]]]` function retrieves the active [OpenTelemetry](../concepts/open-telemetry.md) `Span` object for the currently executing tool call. This allows for adding custom attributes, events, or other telemetry data directly to the `yaaf.tool.call` Span from within the tool's implementation logic [Source 1].

YAAF uses `AsyncLocalStorage` to propagate tracing context, so this function can be called from anywhere within the tool's execution flow without needing to manually pass the span or context object [Source 1].

It returns `undefined` if called outside the scope of a tool call or if YAAF's [Telemetry System](../subsystems/telemetry-system.md) has not been initialized [Source 1].

## Signature

```typescript
import type { Span } from '@opentelemetry/api';

export declare function getCurrentToolSpan(): Span | undefined;
```

**Returns:**

*   `Span | undefined`: The active OpenTelemetry `Span` for the current tool call, or `undefined` if no tool call span is active.

## Examples

### Annotating a Tool Span

This example shows how to retrieve the current tool span within a tool's implementation to add a custom attribute. The optional chaining operator (`?.`) is used to safely handle cases where no span is active [Source 1].

```typescript
import { getCurrentToolSpan } from 'yaaf';
import { z } from 'zod';

// A hypothetical tool that fetches user data
export const fetchUsersTool = {
  name: 'fetch_users',
  description: 'Fetches a list of users from the database.',
  input: z.object({
    limit: z.number().optional().default(10),
  }),
  execute: async ({ input }) => {
    // ... database logic to fetch users ...
    const users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];

    // Get the current tool span to add custom telemetry
    const toolSpan = getCurrentToolSpan();

    // Add an attribute with the number of rows returned
    toolSpan?.setAttribute('tool.rows_returned', users.length);

    return users;
  },
};
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md