---
export_name: getCurrentRunSpan
source_file: src/instrumentation.ts
category: function
title: getCurrentRunSpan
entity_type: api
summary: Retrieves the OpenTelemetry span associated with the current agent run.
stub: false
compiled_at: 2026-04-16T14:11:43.589Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/telemetry.md
confidence: 1
---

## Overview
`getCurrentRunSpan` is a utility function used to access the active OpenTelemetry span representing the current agent execution. 

In YAAF, every call to `Agent.run()` automatically creates a root span (identified as `yaaf.agent.run`). This function allows developers to retrieve that span from the current execution context to attach custom attributes, events, or metadata. Because YAAF manages span propagation via `AsyncLocalStorage`, this function can be called from anywhere within the execution flow of an agent without requiring the span to be passed manually through function arguments.

## Signature / Constructor

```typescript
function getCurrentRunSpan(): Span | undefined
```

### Returns
* **Span | undefined**: Returns the OpenTelemetry `Span` object for the current `yaaf.agent.run` context. Returns `undefined` if telemetry is not initialized, the exporter is disabled, or the function is called outside the scope of an agent run.

## Examples

### Annotating a Run with Business Metadata
This example demonstrates how to use the function to add a custom customer ID to the trace of the current agent execution.

```typescript
import { getCurrentRunSpan } from 'yaaf';

// Inside a tool, hook, or service called during an agent run
const span = getCurrentRunSpan();

if (span) {
  span.setAttribute('business.customer_id', 'cust_98765');
  span.setAttribute('app.environment', 'production');
}
```

### Conditional Logic Based on Trace Presence
```typescript
import { getCurrentRunSpan } from 'yaaf';

function logDiagnosticInfo() {
  const runSpan = getCurrentRunSpan();
  
  if (runSpan) {
    runSpan.addEvent('diagnostic_check_performed', {
      timestamp: Date.now(),
      status: 'healthy'
    });
  }
}
```

## See Also
* `executeInSpan`
* `getCurrentToolSpan`
* `initYAAFTelemetry`