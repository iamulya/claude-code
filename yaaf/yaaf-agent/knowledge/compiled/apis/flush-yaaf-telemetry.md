---
export_name: flushYAAFTelemetry
source_file: src/instrumentation.ts
category: function
title: flushYAAFTelemetry
entity_type: api
summary: A function that forces the immediate export of all buffered telemetry data (spans, metrics, and logs) to the configured exporters.
stub: false
compiled_at: 2026-04-16T14:11:59.407Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/telemetry.md
confidence: 1
---

## Overview
`flushYAAFTelemetry` is a utility function used to ensure that all telemetry signals—including traces, metrics, and logs—currently buffered in memory are transmitted to their respective OpenTelemetry exporters. 

In production environments, telemetry data is often batched and exported asynchronously to minimize performance impact on the main execution thread. `flushYAAFTelemetry` overrides this batching behavior to force an immediate synchronization. This is critical in scenarios such as:
*   **Process Termination**: Ensuring no data is lost when a service or CLI tool shuts down.
*   **Serverless Environments**: Forcing an export before a Lambda or Cloud Function execution environment is frozen.
*   **Testing**: Ensuring all spans and metrics are available for assertions in a test suite teardown.

The function's execution time is governed by the `YAAF_OTEL_FLUSH_TIMEOUT_MS` environment variable, which defaults to 5000ms.

## Signature / Constructor

```typescript
async function flushYAAFTelemetry(): Promise<void>
```

### Related Environment Variables
The behavior of the flush operation can be tuned using the following environment variable:

| Variable | Default | Description |
|---|---|---|
| `YAAF_OTEL_FLUSH_TIMEOUT_MS` | `5000` | The maximum time in milliseconds to wait for the flush operation to complete before timing out. |

## Examples

### Handling Process Shutdown
This example demonstrates how to use `flushYAAFTelemetry` to ensure all telemetry is captured when a Node.js process receives a termination signal.

```typescript
import { flushYAAFTelemetry } from 'yaaf';

process.on('SIGINT', async () => {
  console.log('Shutting down... flushing telemetry.');
  try {
    // Ensure all spans and metrics are sent to the collector
    await flushYAAFTelemetry();
  } catch (error) {
    console.error('Failed to flush telemetry:', error);
  } finally {
    process.exit(0);
  }
});
```

### Usage in Test Teardown
When writing integration tests that verify telemetry output, use the flush function in a `globalTeardown` or `afterAll` block.

```typescript
import { flushYAAFTelemetry } from 'yaaf';

afterAll(async () => {
  await flushYAAFTelemetry();
});
```

## See Also
* `initYAAFTelemetry`: The initialization function required to enable the telemetry pipeline.
* `getYAAFMeter`: Access the OpenTelemetry Meter for custom metrics.
* `getYAAFOTelLogger`: Access the OpenTelemetry Logger for structured logging.