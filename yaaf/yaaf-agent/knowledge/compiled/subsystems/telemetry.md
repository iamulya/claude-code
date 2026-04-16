---
summary: The subsystem responsible for observability, tracing, and metrics within the YAAF framework using OpenTelemetry standards.
primary_files:
  - src/telemetry/attributes.ts
title: Telemetry Subsystem
entity_type: subsystem
exports:
  - YAAF_SERVICE_NAME
  - YAAF_TRACER_NAME
  - YAAF_METER_NAME
  - YAAF_LOGGER_NAME
  - YAAFSpanType
  - getBaseAttributes
  - buildSpanAttributes
stub: false
compiled_at: 2026-04-16T14:36:42.445Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/telemetry/attributes.ts
confidence: 0.95
---

## Purpose
The Telemetry Subsystem provides a standardized approach to observability within the YAAF framework. It is designed to capture traces, metrics, and logs using OpenTelemetry standards, ensuring that LLM-powered agent operations are transparent and measurable. The subsystem solves the problem of inconsistent metadata across distributed traces by enforcing a common set of attributes and span types for all framework activities.

## Architecture
The subsystem is built as a wrapper around the `@opentelemetry/api`. It defines a set of core identifiers and types that categorize the various operations performed by an agent.

### Core Identifiers
The framework uses specific naming conventions for its telemetry components:
*   **Service Name**: `yaaf`
*   **Tracer Name**: `com.yaaf.tracing`
*   **Meter Name**: `com.yaaf.metrics`
*   **Logger Name**: `com.yaaf.logs`

### Span Categorization
The subsystem defines a specific type, `YAAFSpanType`, which categorizes the lifecycle of an agentic operation:
*   `agent.run`: Represents a single execution of the agent's main loop.
*   `llm.request`: Tracks calls to the underlying Language Model.
*   `tool.call`: Captures the intent to invoke a tool.
*   `tool.execution`: Tracks the actual execution of tool logic within a sandbox.
*   `tool.blocked`: Records instances where a tool call was denied by security policies or hooks.
*   `memory.extract` / `memory.retrieve`: Tracks interactions with the agent's memory strategies.
*   `compaction`: Records context window management and compaction events.

## Key APIs
The Telemetry Subsystem exposes functions to ensure consistent attribute attachment across all spans.

### `getBaseAttributes()`
This function generates the foundational attributes required for every YAAF span. These attributes ensure that all spans within a trace share consistent cardinality dimensions, allowing for effective filtering and aggregation in telemetry backends.

### `buildSpanAttributes(spanType, custom)`
A utility function used to construct a complete attribute set for a span. It merges the base attributes with the specific `YAAFSpanType` and any additional custom attributes provided by the caller.

```typescript
export function buildSpanAttributes(
  spanType: YAAFSpanType,
  custom: Attributes = {}
): Attributes;
```

## Configuration
The behavior of the Telemetry Subsystem can be influenced by environment variables, primarily to control the cardinality of the data produced.

*   **`YAAF_OTEL_INCLUDE_AGENT_NAME`**: A boolean flag (defaulting to `true`) that determines whether the agent's specific name is included in the base attributes of every span.

## Sources
* `src/telemetry/attributes.ts`