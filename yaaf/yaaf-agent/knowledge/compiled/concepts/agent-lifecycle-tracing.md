---
summary: The structured approach to instrumenting key phases of an agent's execution, including runs, LLM requests, and tool calls, using tracing spans.
title: Agent Lifecycle Tracing
entity_type: concept
related_subsystems:
 - telemetry
search_terms:
 - OpenTelemetry in YAAF
 - how to trace agent execution
 - instrumenting LLM calls
 - YAAF telemetry
 - agent performance monitoring
 - distributed tracing for agents
 - span hierarchy
 - AsyncLocalStorage tracing
 - YAAF_OTEL_TRACES_EXPORTER
 - Jaeger integration
 - Tempo integration
 - debugging agent runs
 - executeInSpan helper
stub: false
compiled_at: 2026-04-24T17:51:29.307Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Agent Lifecycle Tracing is YAAF's opt-in, structured approach to instrumenting the key phases of an agent's execution using [OpenTelemetry](./open-telemetry.md) [Span](../apis/span.md)s [Source 1]. It provides a detailed, hierarchical view of an agent's operations, such as the overall agent run, individual [LLM](./llm.md) requests, and tool invocations. This mechanism is designed to be a zero-overhead layer [when](../apis/when.md) disabled, ensuring no performance impact in production environments where tracing is not active [Source 1]. The primary purpose of this system is to enable developers to observe, debug, and monitor the performance of complex agent behaviors.

## How It Works in YAAF

YAAF's tracing is built on the OpenTelemetry standard and uses a specific hierarchy to model agent execution. The root Span is `agent.run`, which represents a single turn or invocation of an agent. This parent span has child spans for each major operation within that turn, such as `llm.request` or `tool.call`. A `tool.call` span can, in turn, have its own child span, `tool.execution`, which instruments the actual execution of the tool's function [Source 1].

The framework uses Node.js's `AsyncLocalStorage` to propagate tracing context automatically. This avoids the need for developers to manually pass span objects through their application code, as child spans can automatically link to the correct parent span active in the current asynchronous context [Source 1].

The core implementation includes several functions that correspond to lifecycle events [Source 1]:
*   `startAgentRunSpan()` / `endAgentRunSpan()`: Manages the top-level span for an `Agent.run()` call.
*   `startLLMRequestSpan()` / `endLLMRequestSpan()`: Instruments a single call to an LLM.
*   `startToolCallSpan()` / `endToolCallSpan()`: Wraps the invocation of a tool.
*   `startToolExecutionSpan()` / `endToolExecutionSpan()`: A child span that specifically traces the sandboxed execution of the tool's code.

For custom instrumentation, YAAF provides an `executeInSpan` helper function. This allows developers to wrap any asynchronous operation in a new span that automatically attaches to the current run context [Source 1].

```typescript
const result = await executeInSpan('yaaf.my_op', async (span) => {
  span.setAttribute('my.attr', 42);
  return doWork();
});
```

To manage [Memory](./memory.md) and prevent leaks in long-running processes, the tracing system uses a combination of `WeakRef` and strong references to avoid the garbage collector from prematurely collecting active spans. It also includes a background cleanup interval to handle orphaned spans that may result from crashes or aborted operations [Source 1].

## Configuration

Agent Lifecycle Tracing is disabled by default [Source 1]. To enable it, a developer must set an environment variable and call an initialization function.

1.  **Set Environment Variable**: Tracing is activated by setting either the YAAF-specific `YAAF_OTEL_TRACES_EXPORTER` variable or the standard OpenTelemetry `OTEL_TRACES_EXPORTER` variable. Supported values include `console` for human-readable output to the console, or `otlp` to send traces to an OTLP-compatible collector like Jaeger or Tempo [Source 1].

2.  **Initialize Telemetry**: Setting the environment variable alone is not sufficient. The `initYAAFTelemetry()` function must be called at process startup. If this function is not called, the tracing system remains a no-op regardless of the environment variable's value [Source 1].

The `isTracingEnabled()` function can be used to programmatically check if the tracing system is active [Source 1].

## Sources

[Source 1]: src/telemetry/tracing.ts