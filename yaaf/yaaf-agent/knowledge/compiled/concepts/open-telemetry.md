---
title: OpenTelemetry
entity_type: concept
summary: An open-source observability framework for generating, collecting, and exporting telemetry data (traces, metrics, logs).
search_terms:
 - YAAF observability
 - agent tracing
 - LLM performance monitoring
 - how to enable telemetry
 - OTEL integration
 - instrumenting agent calls
 - custom metrics for agents
 - structured logging in YAAF
 - Jaeger integration
 - Grafana Tempo with YAAF
 - OTLP exporter configuration
 - what is initYAAFTelemetry
 - span hierarchy for agents
stub: false
compiled_at: 2026-04-24T18:00:17.146Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/telemetry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is
OpenTelemetry (OTel) is an open-source [Observability](./observability.md) framework for generating, collecting, and exporting telemetry data, including Traces, Metrics, and logs. YAAF provides a full integration with OpenTelemetry, allowing developers to monitor and debug agent behavior with detailed performance data [Source 1].

The integration automatically instruments key operations within the framework, such as agent turns, [LLM](./llm.md) calls, and tool executions. This instrumentation is designed to have zero performance overhead [when](../apis/when.md) disabled and is activated purely through standard OpenTelemetry environment variables [Source 1, Source 2].

## How It Works in YAAF
YAAF's [OpenTelemetry Integration](./open-telemetry-integration.md) is initialized by calling a single function at application startup. Once enabled, it automatically creates structured Traces for agent activity and provides APIs for custom instrumentation.

### Activation
To enable telemetry, a developer must call `initYAAFTelemetry()` once at the start of their process. This function reads environment variables to configure and register the necessary global providers for [Trace](./trace.md)s, Metrics, and logs [Source 1, Source 2].

```typescript
import { initYAAFTelemetry } from 'yaaf';

// Call once at process startup
await initYAAFTelemetry();
```

### Automatic Instrumentation and [Span](../apis/span.md) Hierarchy
Every call to `Agent.run()` creates a root trace span. Subsequent operations within that run, such as LLM requests and [Tool Calls](./tool-calls.md), are created as child spans. This creates a detailed, hierarchical view of the agent's execution flow. Span context is propagated automatically using `AsyncLocalStorage`, eliminating the need for manual context passing [Source 1].

The typical span hierarchy is as follows [Source 1]:

```
yaaf.agent.run
│  agent.name, run.user_message_length, run.iteration
│
├── yaaf.llm.request
│     llm.model, llm.message_count, llm.tool_count
│     llm.input_tokens, llm.output_tokens
│     llm.cache_read_tokens, llm.cache_write_tokens
│     llm.duration_ms, llm.finish_reason, llm.has_tool_calls
│
├── yaaf.tool.call
│   │  tool.name, tool.duration_ms
│   │  tool.blocked?, tool.block_reason?
│   │
│   └── yaaf.tool.execution
│         tool.execution_ms, tool.error?
│
├── yaaf.llm.request   (next iteration)
├── yaaf.tool.call
│   └── yaaf.tool.execution
└── ...   (until finish_reason: stop)
```

### Custom Instrumentation
YAAF exposes utility functions to extend the built-in telemetry with custom spans, attributes, and [Metric](./metric.md)s.

**Custom Spans and Attributes**
Developers can create new spans or add attributes to existing, automatically-created spans [Source 1].

```typescript
import {
  executeInSpan,
  getCurrentRunSpan,
  getCurrentToolSpan,
} from 'yaaf';

// Wrap arbitrary work in a new span, parented to the current agent turn
const data = await executeInSpan('my_service.fetch', async (span) => {
  span.setAttribute('http.url', url);
  return fetch(url).then(r => r.json());
});

// Annotate the current agent.run span directly
getCurrentRunSpan()?.setAttribute('business.customer_id', customerId);

// Annotate the current tool.call span
getCurrentToolSpan()?.setAttribute('tool.rows_returned', rows.length);
```

**Custom Metrics**
After initialization, a `Meter` instance can be retrieved to create custom counters, histograms, and other metric instruments [Source 1, Source 2].

```typescript
import { getYAAFMeter } from 'yaaf';

const meter = getYAAFMeter(); // undefined if initYAAFTelemetry() not called yet

const llmCalls   = meter?.createCounter('my_agent.llm_calls');
const latency    = meter?.createHistogram('my_agent.turn_latency_ms');
const toolErrors = meter?.createCounter('my_agent.tool_errors');

// Example of recording metrics in agent hooks
const hooks = {
  afterLLM: async (ctx, result) => {
    llmCalls?.add(1, { model: ctx.model });
    latency?.record(result.durationMs, { agent: 'my-agent' });
    return { action: 'continue' };
  },
};
```

**Structured Logs**
The integration also provides a logger for emitting structured logs via the OpenTelemetry Logging SDK, which can be sent to a collector alongside traces and metrics [Source 1].

```typescript
import { getYAAFOTelLogger } from 'yaaf';
import { SeverityNumber } from '@opentelemetry/api-logs';

const otelLog = getYAAFOTelLogger();

otelLog?.emit({
  severityNumber: SeverityNumber.INFO,
  body: 'Agent session started',
  attributes: { 'session.id': sessionId, 'agent.name': agentName },
});
```

### Flushing Telemetry
To ensure all buffered telemetry data is exported before the application exits, YAAF provides a `flushYAAFTelemetry` function. This is useful in shutdown hooks or test teardown routines [Source 1, Source 2].

```typescript
import { flushYAAFTelemetry } from 'yaaf';

process.on('SIGINT', async () => {
  await flushYAAFTelemetry();
  process.exit(0);
});
```

### Dependencies
The OpenTelemetry packages are optional peer dependencies. They only need to be installed if the observability features are used. The specific packages required depend on which telemetry signals (traces, metrics, logs) and exporters are being used [Source 1].

```bash
# Minimum for traces (console or OTLP http/protobuf)
npm install @opentelemetry/api @opentelemetry/sdk-trace-base \
            @opentelemetry/resources @opentelemetry/semantic-conventions

# Full stack (traces, metrics, logs)
npm install @opentelemetry/api @opentelemetry/api-logs \
            @opentelemetry/sdk-trace-base @opentelemetry/sdk-metrics \
            @opentelemetry/sdk-logs @opentelemetry/resources \
            @opentelemetry/semantic-conventions

# Exporters (install only what is needed)
npm install @opentelemetry/exporter-trace-otlp-proto # OTLP http/protobuf
```

## Configuration
Telemetry in YAAF is disabled by default and is configured entirely through environment variables. Setting an exporter for a given signal (e.g., `OTEL_TRACES_EXPORTER`) enables it [Source 1].

Supported exporter types for each signal are [Source 2]:
*   `console`: Prints telemetry to standard output. Suitable for development.
*   `otlp`: Sends data to a collector using the OpenTelemetry Protocol (OTLP).
*   `none` or an empty value: Disables the signal.

**Example Configurations** [Source 1]:

```bash
# Development: pretty-print all signals to the console
OTEL_TRACES_EXPORTER=console
OTEL_METRICS_EXPORTER=console
OTEL_LOGS_EXPORTER=console

# Production: send traces to an OTLP collector like Jaeger or Grafana Tempo
OTEL_TRACES_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

### Environment Variables
YAAF honors all standard `OTEL_*` environment variables. It also provides `YAAF_OTEL_*` prefixed versions that override the standard ones. This allows YAAF's telemetry pipeline to be configured independently from a host application's own OpenTelemetry setup [Source 1, Source 2].

| Variable | Default | Purpose |
|---|---|---|
| `OTEL_TRACES_EXPORTER` | — | `console`, `otlp`, or `none` |
| `OTEL_METRICS_EXPORTER` | — | `console`, `otlp`, or `none` |
| `OTEL_LOGS_EXPORTER` | — | `console`, `otlp`, or `none` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | Base URL for the OTLP collector |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | `grpc`, `http/json`, or `http/protobuf` |
| `OTEL_EXPORTER_OTLP_HEADERS` | — | `key=value,key2=value2` for authentication headers |
| `YAAF_OTEL_TRACES_EXPORTER` | — | Overrides `OTEL_TRACES_EXPORTER` for YAAF |
| `YAAF_OTEL_METRICS_EXPORTER` | — | Overrides `OTEL_METRICS_EXPORTER` for YAAF |
| `YAAF_OTEL_LOGS_EXPORTER` | — | Overrides `OTEL_LOGS_EXPORTER` for YAAF |
| `YAAF_OTEL_EXPORTER_OTLP_ENDPOINT` | — | Overrides the OTLP endpoint for YAAF only |
| `YAAF_OTEL_SHUTDOWN_TIMEOUT_MS` | `2000` | Max milliseconds to wait for flush on shutdown |
| `YAAF_OTEL_FLUSH_TIMEOUT_MS` | `5000` | Max milliseconds for `flushYAAFTelemetry()` to complete |

## Sources
[Source 1] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
[Source 2] /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/telemetry.ts