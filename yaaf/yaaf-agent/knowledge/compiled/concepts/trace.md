---
title: Trace
entity_type: concept
summary: A collection of spans that represents a single transaction or request as it flows through a system, as defined by OpenTelemetry.
related_subsystems:
 - Observability
search_terms:
 - OpenTelemetry integration
 - YAAF observability
 - how to trace agent runs
 - distributed tracing in YAAF
 - span hierarchy
 - agent performance monitoring
 - OTEL configuration
 - instrumenting LLM calls
 - tool execution tracing
 - yaaf.agent.run span
 - AsyncLocalStorage propagation
 - custom instrumentation
 - what is a span
stub: false
compiled_at: 2026-04-24T18:04:45.338Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
compiled_from_quality: documentation
confidence: 0.9
---

## What It Is

A Trace is a collection of operations, called [Span](../apis/span.md)s, that represents a single transaction as it moves through YAAF and other services. In the context of YAAF, a single trace typically corresponds to one complete invocation of an `Agent.run()` call, from the initial user message to the final result [Source 1].

YAAF uses the [OpenTelemetry](./open-telemetry.md) standard to implement tracing. This provides detailed, structured [Observability](./observability.md) into an agent's execution flow, including each [LLM](./llm.md) call, tool invocation, and custom instrumented code. The primary purpose is to enable debugging, performance analysis, and monitoring of agent behavior in development and production environments [Source 1].

## How It Works in YAAF

YAAF's tracing is built around a consistent Span hierarchy for every agent execution. [when](../apis/when.md) `Agent.run()` is called, it creates a root span named `yaaf.agent.run`. Subsequent operations within that run, such as LLM requests and [Tool Calls](./tool-calls.md), are created as child spans. This creates a causal chain that is visualized in tracing backends [Source 1].

The standard span hierarchy is as follows [Source 1]:

```
yaaf.agent.run
│  Attributes: agent.name, run.user_message_length, run.iteration
│
├── yaaf.llm.request
│     Attributes: llm.model, llm.message_count, llm.tool_count,
│                 llm.input_tokens, llm.output_tokens,
│                 llm.cache_read_tokens, llm.cache_write_tokens,
│                 llm.duration_ms, llm.finish_reason, llm.has_tool_calls
│
├── yaaf.tool.call
│   │  Attributes: tool.name, tool.duration_ms, tool.blocked?,
│   │              tool.block_reason?
│   │
│   └── yaaf.tool.execution
│         Attributes: tool.execution_ms, tool.error?
│
├── yaaf.llm.request   (next iteration)
└── ...
```

Span context is propagated automatically throughout the asynchronous execution of an [Agent Turn](./agent-turn.md) using `AsyncLocalStorage`. This means developers do not need to manually pass parent span information when creating new spans or instrumenting their own code [Source 1].

Developers can add custom instrumentation to their applications. The `executeInSpan` function wraps an arbitrary block of code in a new span, which is automatically parented to the current active span. It is also possible to retrieve the current run or tool span to add custom attributes [Source 1].

```typescript
import {
  executeInSpan,
  getCurrentRunSpan,
  getCurrentToolSpan,
} from 'yaaf';

// Wrap arbitrary work in a named span
const data = await executeInSpan('my_service.fetch', async (span) => {
  span.setAttribute('http.url', url);
  return fetch(url).then(r => r.json());
});

// Annotate the current agent.run span directly
getCurrentRunSpan()?.setAttribute('business.customer_id', customerId);

// Annotate the current tool.call span
getCurrentToolSpan()?.setAttribute('tool.rows_returned', rows.length);
```

## Configuration

Tracing is disabled by default to ensure zero performance overhead when not in use. To enable it, a developer must configure an exporter via environment variables and call `initYAAFTelemetry()` once at process startup [Source 1].

The primary environment variable is `OTEL_TRACES_EXPORTER`, which can be set to `console` for development or `otlp` for production systems that send data to a collector like Jaeger or Grafana Tempo [Source 1].

```bash
# Development: Print traces to the console
OTEL_TRACES_EXPORTER=console

# Production: Send traces to an OTLP collector
OTEL_TRACES_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

The following environment variables control YAAF's telemetry behavior [Source 1]:

| Variable | Default | Purpose |
|---|---|---|
| `OTEL_TRACES_EXPORTER` | — | `console`, `otlp`, or `none` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | Base URL for OTLP collector |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | `grpc`, `http/json`, `http/protobuf` |
| `OTEL_EXPORTER_OTLP_HEADERS` | — | `key=value,key2=value2` auth headers |
| `YAAF_OTEL_TRACES_EXPORTER` | — | Override `OTEL_TRACES_EXPORTER` for YAAF only |
| `YAAF_OTEL_EXPORTER_OTLP_ENDPOINT` | — | Override endpoint for YAAF only |
| `YAAF_OTEL_SHUTDOWN_TIMEOUT_MS` | `2000` | Max ms to wait for flush on shutdown |
| `YAAF_OTEL_FLUSH_TIMEOUT_MS` | `5000` | Max ms for `flushYAAFTelemetry()` |

The `YAAF_OTEL_*` variables allow YAAF's telemetry to be configured independently from a host application's main OpenTelemetry setup, preventing interference [Source 1].

## Sources
[Source 1] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md