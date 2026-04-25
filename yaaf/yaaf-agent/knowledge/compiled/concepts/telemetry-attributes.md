---
summary: Standardized attributes used across YAAF's telemetry spans and metrics for consistent observability.
title: Telemetry Attributes
entity_type: concept
related_subsystems:
 - telemetry
search_terms:
 - opentelemetry attributes
 - standard span attributes
 - YAAF observability
 - tracing dimensions
 - metrics cardinality
 - how to add custom span data
 - YAAF_OTEL_INCLUDE_AGENT_NAME
 - YAAFSpanType
 - agent.run span
 - llm.request span
 - tool.call span
 - consistent tracing tags
 - base span attributes
stub: false
compiled_at: 2026-04-24T18:03:15.681Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/attributes.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Telemetry Attributes in YAAF are a standardized set of key-value pairs attached to [Observability](./observability.md) signals like [Trace](./trace.md)s, metrics, and logs. They provide a consistent structure for telemetry data, enabling effective filtering, aggregation, and analysis across the framework.

The primary purpose of these attributes is to ensure that all telemetry emitted by YAAF shares a common set of dimensions, referred to as "cardinality dimensions" [Source 1]. Every [Span](../apis/span.md) created by the framework's tracing module is automatically decorated with a set of base attributes, ensuring that an entire Trace can be analyzed consistently [Source 1]. This pattern is scoped specifically for YAAF's configuration surface [Source 1].

## How It Works in YAAF

YAAF's [Telemetry System](../subsystems/telemetry-system.md) uses a collection of predefined constants and helper functions to manage attributes [Source 1].

Key constants define the names for telemetry emitters:
*   `YAAF_SERVICE_NAME`: "yaaf"
*   `YAAF_TRACER_NAME`: "com.yaaf.tracing"
*   `YAAF_METER_NAME`: "com.yaaf.metrics"
*   `YAAF_LOGGER_NAME`: "com.yaaf.logs"

A core concept is the `YAAFSpanType`, a special attribute that categorizes the specific operation being traced. Predefined span types include [Source 1]:
*   `agent.run`: A single invocation of an agent's `run()` method.
*   `llm.request`: A single call to a large language model.
*   `tool.call`: A tool invocation attempt, before permission checks.
*   `tool.execution`: The execution of the tool's function within its sandbox.
*   `tool.blocked`: A tool call that was denied by a policy or hook.
*   `[[[[[[[[Memory]]]]]]]].extract`: An operation to extract information for agent Memory.
*   `memory.retrieve`: An operation to retrieve information from agent memory.
*   `compaction`: A [Context Compaction](./context-compaction.md) strategy execution.

The framework uses two main helper functions to construct the final attribute set for a span [Source 1]:
1.  `getBaseAttributes()`: This function generates the common set of attributes that are attached to every span created by YAAF.
2.  `buildSpanAttributes()`: This function combines the output of `getBaseAttributes()` with a specific `YAAFSpanType` and any custom attributes provided by the developer at the time of span creation.

## Configuration

The set of base attributes can be modified via environment variables to control telemetry cardinality. One such variable is `YAAF_OTEL_INCLUDE_AGENT_NAME`, which defaults to `true`. Setting this variable to `false` will prevent the agent's name from being included as a base attribute on all spans [Source 1].

## Sources

[Source 1]: src/telemetry/attributes.ts