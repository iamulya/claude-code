---
title: flushYAAFTelemetry
entity_type: api
summary: Forces an immediate flush of all pending YAAF telemetry data.
export_name: flushYAAFTelemetry
source_file: src/telemetry/telemetry.ts
category: function
search_terms:
 - force telemetry export
 - ensure spans are sent
 - OpenTelemetry shutdown
 - graceful process exit
 - wait for telemetry data
 - YAAF observability flush
 - test teardown telemetry
 - OTel flush
 - send pending traces
 - export metrics before exit
 - how to flush otel data
 - YAAF_OTEL_FLUSH_TIMEOUT_MS
stub: false
compiled_at: 2026-04-24T17:07:08.830Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/telemetry.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `flushYAAFTelemetry` function is an asynchronous utility that forces all registered YAAF [OpenTelemetry](../concepts/open-telemetry.md) providers (for traces, metrics, and logs) to immediately export any buffered data [Source 2].

This function is crucial for ensuring that no telemetry data is lost [when](./when.md) an application is about to terminate. OpenTelemetry exporters often batch data to improve performance, meaning there can be a delay between when telemetry is recorded and when it is sent to a collector. Calling `flushYAAFTelemetry` guarantees that these batches are sent before the process exits [Source 1, Source 2].

Common use cases include:
- In a `SIGINT` or `beforeExit` process event handler for graceful shutdown [Source 1].
- In the teardown phase of a test suite (e.g., `afterAll` in Jest) to ensure all test-related spans are exported [Source 2].
- Before a serverless function invocation terminates.

The maximum time the function will wait for the flush to complete is configurable via the `YAAF_OTEL_FLUSH_TIMEOUT_MS` environment variable, which defaults to 5000 milliseconds [Source 1].

## Signature

The function is asynchronous and returns a `Promise` that resolves when the flush operation is complete [Source 2].

```typescript
export async function flushYAAFTelemetry(): Promise<void>;
```

## Examples

### Graceful Process Shutdown

This example shows how to use `flushYAAFTelemetry` to ensure all telemetry is sent before the process exits when it receives a `SIGINT` signal (e.g., from Ctrl+C) [Source 1].

```typescript
import { flushYAAFTelemetry } from 'yaaf';

process.on('SIGINT', async () => {
  console.log('SIGINT received. Flushing telemetry...');
  await flushYAAFTelemetry();
  console.log('Telemetry flushed. Exiting.');
  process.exit(0);
});
```

### Test Suite Teardown

To ensure telemetry from integration or end-to-end tests is captured, call `flushYAAFTelemetry` in a global teardown hook of your test runner [Source 2].

```typescript
// In a test setup file (e.g., using Jest)
import { flushYAAFTelemetry } from 'yaaf';

afterAll(async () => {
  // Ensures all spans and metrics from the test run are exported
  await flushYAAFTelemetry();
});
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/telemetry.ts