---
export_name: getCurrentToolSpan
source_file: src/instrumentation.ts
category: function
title: getCurrentToolSpan
entity_type: api
summary: Retrieves the current OpenTelemetry span associated with a tool call or execution.
stub: false
compiled_at: 2026-04-16T14:11:52.405Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/telemetry.md
confidence: 1
---

## Overview
`getCurrentToolSpan` is a utility function used to access the active OpenTelemetry span during a tool's lifecycle. In the YAAF span hierarchy, every tool interaction involves a `yaaf.tool.call` span and a child `yaaf.tool.execution` span. 

This function allows developers to retrieve the active span from `AsyncLocalStorage` to add custom attributes, events, or status updates without manually passing span objects through tool arguments. It is primarily used for custom instrumentation within tool implementations to provide deeper visibility into tool performance and behavior.

If telemetry has not been initialized via `initYAAFTelemetry()` or if the function is called outside the context of a tool execution, it returns `undefined`.

## Signature
```typescript
function getCurrentToolSpan(): Span | undefined;
```

### Returns
* **Span | undefined**: The OpenTelemetry `Span` object for the current tool context, or `undefined` if no span is active.

## Examples

### Annotating a Tool Execution
This example demonstrates how to use `getCurrentToolSpan` inside a tool to record the number of rows returned by a database query.

```typescript
import { getCurrentToolSpan } from 'yaaf';

export const myDatabaseTool = {
  name: 'query_database',
  description: 'Executes a read-only SQL query',
  execute: async ({ query }) => {
    const results = await db.execute(query);
    
    // Retrieve the current span to add custom metadata
    const span = getCurrentToolSpan();
    span?.setAttribute('tool.rows_returned', results.length);
    span?.setAttribute('db.query_length', query.length);

    return results;
  }
};
```

## See Also
* [Source 1: Observability — OpenTelemetry]

## Sources
1. Observability — OpenTelemetry (yaaf/knowledge/raw/docs/telemetry.md)