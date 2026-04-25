---
summary: The OpenTelemetry logger name used by YAAF's logging module.
export_name: YAAF_LOGGER_NAME
source_file: src/telemetry/attributes.ts
category: constant
title: YAAF_LOGGER_NAME
entity_type: api
search_terms:
 - OpenTelemetry logging
 - YAAF logger name
 - telemetry configuration
 - logging instrumentation
 - com.yaaf.logs
 - how to find YAAF logs
 - YAAF observability
 - log correlation
 - structured logging name
 - YAAF telemetry constants
 - instrumentation scope name
stub: false
compiled_at: 2026-04-24T17:50:19.411Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/attributes.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`YAAF_LOGGER_NAME` is a constant string that provides a standardized name for the logger used within the YAAF framework [Source 1]. Its value is `"com.yaaf.logs"` [Source 1].

This constant is part of YAAF's [Telemetry System](../subsystems/telemetry-system.md), which uses [OpenTelemetry](../concepts/open-telemetry.md) for [Observability](../concepts/observability.md). By using a consistent logger name, all logs emitted by the framework can be easily identified, filtered, and routed in a centralized logging backend. This is crucial for debugging and monitoring agent behavior in production environments.

It is used alongside other telemetry identifiers like `YAAF_TRACER_NAME` for tracing and `YAAF_METER_NAME` for metrics to provide a cohesive observability experience [Source 1].

## Signature

The constant is a string literal with the value `"com.yaaf.logs"`.

```typescript
export const YAAF_LOGGER_NAME = "com.yaaf.logs";
```

## Examples

### Configuring an OpenTelemetry Logger Provider

This example shows how `YAAF_LOGGER_NAME` might be used [when](./when.md) configuring an OpenTelemetry `LoggerProvider` to specifically handle logs from the YAAF framework.

```typescript
import { logs } from "@opentelemetry/api-logs";
import {
  LoggerProvider,
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
} from "@opentelemetry/sdk-logs";
import { YAAF_LOGGER_NAME } from "yaaf";

// Initialize a LoggerProvider
const loggerProvider = new LoggerProvider();

// Add a processor and exporter to handle logs
loggerProvider.addLogRecordProcessor(
  new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())
);

// Set the global logger provider
logs.setGlobalLoggerProvider(loggerProvider);

// Get a logger instance specifically for YAAF
const yaafLogger = logs.getLogger(YAAF_LOGGER_NAME);

// Now, any part of the YAAF framework that uses this logger name
// will have its logs processed by the configured provider.
yaafLogger.emit({
  body: "Agent initialization complete.",
});
```

### Filtering Logs in a Backend

When querying logs in an observability platform (like Grafana, Datadog, or Splunk), you can use the logger name to isolate logs originating from YAAF.

```plaintext
// Example pseudo-query in a log analysis tool
source="production" AND otel.logger.name="com.yaaf.logs" AND level="error"
```

## See Also

- `YAAF_SERVICE_NAME`
- `YAAF_TRACER_NAME`
- `YAAF_METER_NAME`

## Sources

[Source 1]: src/telemetry/attributes.ts