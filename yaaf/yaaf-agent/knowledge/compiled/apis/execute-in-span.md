---
export_name: executeInSpan
source_file: src/instrumentation.ts
category: function
title: executeInSpan
entity_type: api
summary: A helper function to wrap arbitrary asynchronous work in a named OpenTelemetry span with automatic context propagation and error handling.
stub: false
compiled_at: 2026-04-16T14:11:44.315Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/telemetry.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/telemetry/tracing.ts
confidence: 1
---

## Overview
`executeInSpan` is a utility function used for custom instrumentation within the YAAF framework. It allows developers to wrap arbitrary asynchronous operations in an OpenTelemetry span. 

The function automatically handles the span lifecycle, including:
- Creating and starting the span with the provided name.
- Automatically parenting the span to the current execution context (such as an active agent run or tool call) using `AsyncLocalStorage`.
- Recording exceptions if the provided function throws an error.
- Ensuring the span is closed (ended) once the function completes, regardless of whether it succeeded or failed.

This function is a "zero-overhead" utility; if tracing is not enabled via environment variables or if `initYAAFTelemetry` has not been called, the function executes the provided callback without creating active spans.

## Signature / Constructor

```typescript
async function executeInSpan<T>(
  spanName: string,
  fn: (span: Span) => Promise<T>,
  attrs?: Attributes
): Promise<T>
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `spanName` | `string` | The name of the span to be created (e.g., `yaaf.my_custom_op`). |
| `fn` | `(span: Span) => Promise<T>` | An asynchronous callback containing the work to be instrumented. The active `Span` is passed as an argument for manual attribute tagging. |
| `attrs` | `Attributes` | (Optional) A collection of OpenTelemetry attributes to attach to the span upon creation. |

## Examples

### Basic Usage
Wrapping a network request to ensure it appears in the trace hierarchy under the current agent run.

```typescript
import { executeInSpan } from 'yaaf';

const data = await executeInSpan('my_service.fetch_data', async (span) => {
  const url = 'https://api.example.com/data';
  span.setAttribute('http.url', url);
  
  const response = await fetch(url);
  const result = await response.json();
  
  span.setAttribute('data.count', result.length);
  return result;
});
```

### Error Handling
The function automatically captures errors thrown within the callback.

```typescript
import { executeInSpan } from 'yaaf';

try {
  await executeInSpan('critical_operation', async (span) => {
    throw new Error('Operation failed');
  });
} catch (e) {
  // The span has already recorded the exception and ended by this point
  console.error(e);
}
```

## See Also
- `initYAAFTelemetry`
- `getCurrentRunSpan`
- `getCurrentToolSpan`