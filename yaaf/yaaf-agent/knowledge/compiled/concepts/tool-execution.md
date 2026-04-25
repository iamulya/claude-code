---
title: Tool Execution
entity_type: concept
summary: The process of invoking an external tool or function by an agent to perform a specific task, which is instrumented as a distinct step in the agent's lifecycle.
related_subsystems:
 - Observability
 - Agent Runtime
search_terms:
 - how agents use tools
 - agent function calling
 - running external functions
 - tool invocation
 - YAAF tool call
 - instrumenting tool calls
 - OpenTelemetry for tools
 - yaaf.tool.execution span
 - monitoring tool performance
 - debugging tool errors
 - agent tool use
 - external API calls from agent
 - tool call vs tool execution
stub: false
compiled_at: 2026-04-24T18:04:08.858Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
compiled_from_quality: documentation
confidence: 0.85
---

## What It Is

Tool Execution is the phase in an agent's operational loop where it invokes the underlying code of a registered tool. This occurs after a Language Model ([LLM](./llm.md)) has determined that a tool should be used and has generated the necessary arguments. It represents the agent's direct interaction with external systems, APIs, or local functions to gather information or perform actions that the LLM cannot do on its own.

In YAAF, Tool Execution is treated as a specific, measurable event, distinct from the LLM's decision to call a tool. This separation is crucial for [Observability](./observability.md), allowing developers to isolate and debug issues related to the tool's implementation, such as performance bottlenecks or runtime errors, separately from the agent's reasoning process.

## How It Works in YAAF

YAAF's architecture provides detailed observability into tool execution through its [OpenTelemetry](./open-telemetry.md) integration [Source 1]. Every tool execution is automatically instrumented as part of a structured [Trace](./trace.md), or [Span](../apis/span.md) hierarchy, that represents the agent's turn.

The typical span hierarchy is as follows [Source 1]:
1.  `yaaf.agent.run`: A root span is created for the entire agent interaction.
2.  `yaaf.tool.call`: [when](../apis/when.md) the agent decides to use a tool, a child span is created. This span represents the entire tool-related operation, including the decision and the execution. It may have attributes like `tool.name` and `tool.duration_ms`.
3.  `yaaf.tool.execution`: Nested inside the `yaaf.tool.call` span is the `yaaf.tool.execution` span. This grandchild span specifically measures the duration and outcome of the actual function invocation.

This nested structure allows for precise monitoring. The `yaaf.tool.execution` span captures key metrics such as:
*   `tool.execution_ms`: The wall-clock time spent executing the tool's code.
*   `tool.error?`: An attribute indicating if the execution resulted in an error.

By isolating the execution in its own span, developers can differentiate the time the agent spends thinking about using a tool from the time the tool itself takes to run [Source 1].

## Configuration

The logic of a tool is defined in its implementation, but the observability of its execution is configured via YAAF's [Telemetry System](../subsystems/telemetry-system.md). Tracing for tool executions is disabled by default to ensure zero performance overhead [Source 1].

To enable tracing, a developer must configure an OpenTelemetry exporter using environment variables. For example, setting `OTEL_TRACES_EXPORTER=console` will print trace data, including tool execution spans, to the standard output. For production environments, an OTLP exporter can be configured to send data to collectors like Jaeger or Grafana Tempo [Source 1]. No code changes are required to instrument tool executions; the functionality is built into the framework and activated through this external configuration.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md