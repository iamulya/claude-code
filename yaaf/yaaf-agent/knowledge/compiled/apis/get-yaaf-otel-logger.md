---
export_name: getYAAFOTelLogger
source_file: src/instrumentation.ts
category: function
title: getYAAFOTelLogger
entity_type: api
summary: Retrieves the OpenTelemetry Logger instance used by YAAF for emitting structured logs.
stub: false
compiled_at: 2026-04-16T14:11:51.586Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/telemetry.md
confidence: 1
---

## Overview
`getYAAFOTelLogger` is a utility function that provides access to the internal OpenTelemetry Logger instance managed by YAAF. It is used to emit structured logs that are integrated into the same telemetry pipeline as the agent's spans and metrics.

This function is primarily used when developers need to send custom log records to an OTLP collector or the console using the configuration defined during telemetry initialization. If telemetry has not been initialized or if the logs exporter is disabled, this function returns `undefined`.

## Signature
```typescript
function getYAAFOTelLogger(): Logger | undefined;
```

### Return Value
Returns an OpenTelemetry `Logger` instance if telemetry is active; otherwise, it returns `undefined`. The returned logger follows the standard OpenTelemetry Logs API, allowing the use of the `.emit()` method.

## Examples

### Emitting a Structured Log
This example demonstrates how to retrieve the logger and emit a log record with specific severity and custom attributes.

```typescript
import { getYAAFOTelLogger } from 'yaaf';
import { SeverityNumber } from '@opentelemetry/api-logs';

const otelLog = getYAAFOTelLogger();

if (otelLog) {
  otelLog.emit({
    severityNumber: SeverityNumber.INFO,
    body: 'Agent session started',
    attributes: { 
      'session.id': 'sess_123', 
      'agent.name': 'support-agent' 
    },
  });
}
```

## See Also
- `initYAAFTelemetry`
- `getYAAFMeter`
- `flushYAAFTelemetry`