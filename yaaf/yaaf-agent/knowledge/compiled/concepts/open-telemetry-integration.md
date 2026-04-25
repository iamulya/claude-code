---
summary: Describes how YAAF integrates with the OpenTelemetry standard for distributed tracing and observability.
title: OpenTelemetry Integration
entity_type: concept
related_subsystems:
 - telemetry
search_terms:
 - distributed tracing
 - observability in YAAF
 - how to enable tracing
 - YAAF telemetry
 - OTel integration
 - Jaeger integration
 - Tempo integration
 - instrumenting agent execution
 - YAAF_OTEL_TRACES_EXPORTER
 - OTEL_TRACES_EXPORTER
 - agent performance monitoring
 - AsyncLocalStorage tracing
 - zero-overhead tracing
 - instrumenting LLM calls
 - monitoring tool usage
stub: false
compiled_at: 2026-04-24T18:00:03.546Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

YAAF's [OpenTelemetry](./open-telemetry.md) Integration is an opt-in [Observability](./observability.md) layer that provides distributed tracing for agent execution based on the OpenTelemetry (OTel) standard [Source 1]. It instruments significant lifecycle events, such as [LLM](./llm.md) requests and [Tool Calls](./tool-calls.md), to generate detailed performance and debugging data. The integration is designed to have zero performance overhead [when](../apis/when.md) disabled, making it suitable for production environments [Source 1].

## How It Works in YAAF

The integration provides a tracing layer that creates a structured hierarchy of [Span](../apis/span.md)s for each agent run. A typical [Trace](./trace.md) begins with a root `agent.run` Span, which serves as the parent for subsequent operations like `llm.request` and `tool.call`. The `tool.call` span can, in turn, have its own child span for the actual `tool.execution` [Source 1].

Key implementation details include [Source 1]:
*   **Automatic [Context Propagation](./context-propagation.md)**: YAAF uses Node.js's `AsyncLocalStorage` to propagate the active span context through asynchronous operations. This eliminates the need for developers to manually pass span objects down the call stack.
*   **[Memory](./memory.md) Management**: The system employs a `WeakRef` and strong-reference pattern to prevent active spans from being prematurely garbage-collected. It also includes a background cleanup mechanism to handle orphaned spans that may result from application crashes or aborted operations.
*   **Core API**: The `telemetry/tracing` module exposes functions to manually instrument the key phases of an agent's lifecycle:
    *   `startAgentRunSpan()` / `endAgentRunSpan()`
    *   `startLLMRequestSpan()` / `endLLMRequestSpan()`
    *   `startToolCallSpan()` / `endToolCallSpan()`
    *   `startToolExecutionSpan()` / `endToolExecutionSpan()`
*   **Custom Spans**: A helper function, `executeInSpan()`, is available to wrap any arbitrary asynchronous operation in a new span. This function automatically manages the span's lifecycle, including recording exceptions and ensuring it is closed upon completion.

```typescript
// Example of using executeInSpan to instrument a custom operation
const result = await executeInSpan('yaaf.my_op', async (span) => {
  span.setAttribute('my.attr', 42);
  return doWork();
});
```

## Configuration

Tracing is disabled by default in YAAF [Source 1]. To enable it, two steps are required:

1.  **Initialize Telemetry**: The `initYAAFTelemetry()` function must be called at application startup. This registers the necessary OpenTelemetry `TracerProvider`. If this function is not called, all tracing operations will be no-ops, regardless of environment variable settings [Source 1].

2.  **Set Environment Variable**: An environment variable must be set to configure the trace exporter. YAAF checks for `YAAF_OTEL_TRACES_EXPORTER` first, falling back to the standard `OTEL_TRACES_EXPORTER` if the former is not set. Common values include [Source 1]:
    *   `console`: Exports traces to the console for simple debugging.
    *   `otlp`: Exports traces using the OTLP protocol to a compatible collector, such as Jaeger or Grafana Tempo.

A non-empty value other than `"none"` for the environment variable will enable tracing, provided the [Telemetry System](../subsystems/telemetry-system.md) has been initialized [Source 1].

## Sources

[Source 1]: src/telemetry/tracing.ts