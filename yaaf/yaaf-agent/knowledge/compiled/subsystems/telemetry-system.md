---
primary_files:
  - src/telemetry/telemetry.ts
  - src/telemetry/tracing.ts
  - src/telemetry/attributes.ts
title: Telemetry System
entity_type: subsystem
summary: A production-grade observability suite providing OpenTelemetry-native tracing, metrics, and logging for agent lifecycles.
exports:
  - initYAAFTelemetry
  - flushYAAFTelemetry
  - executeInSpan
  - getYAAFMeter
  - getYAAFOTelLogger
stub: false
compiled_at: 2026-04-16T14:11:29.240Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/telemetry.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/telemetry/telemetry.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/telemetry/tracing.ts
confidence: 1
---

## Purpose
The Telemetry System provides deep observability into the execution of LLM-powered agents. It is designed to solve the complexity of tracking asynchronous, multi-turn agentic workflows by automatically instrumenting agent turns, LLM requests, and tool executions. 

The system is built on [OpenTelemetry](https://opentelemetry.io/) standards, ensuring compatibility with industry-standard backends like Jaeger, Grafana Tempo, and Honeycomb. It operates with a "zero-overhead" philosophy, where all instrumentation remains dormant and incurs no performance penalty until explicitly activated via configuration.

## Architecture
The subsystem is structured around three primary OpenTelemetry signals: Traces, Metrics, and Logs.

### Span Hierarchy
YAAF organizes telemetry data into a hierarchical structure that mirrors the logical execution of an agent. Every `Agent.run()` call initiates a root span, with subsequent operations nested as children:

```text
yaaf.agent.run
│  (Attributes: agent.name, run.user_message_length, run.iteration)
│
├── yaaf.llm.request
│     (Attributes: llm.model, llm.input_tokens, llm.output_tokens, llm.duration_ms)
│
├── yaaf.tool.call
│   │  (Attributes: tool.name, tool.duration_ms, tool.blocked)
│   │
│   └── yaaf.tool.execution
│         (Attributes: tool.execution_ms, tool.error)
│
└── yaaf.llm.request (next iteration)
```

### Context Propagation
The system utilizes `AsyncLocalStorage` (ALS) to propagate trace context. This allows child spans (such as those created during tool execution) to automatically link to the parent agent run without requiring developers to manually pass span objects through the call stack.

### Lifecycle Management
To prevent memory leaks and handle orphaned spans in the event of crashes or aborted runs, the system employs a `WeakRef` and strong-reference pattern combined with a background cleanup interval.

## Key APIs

### `initYAAFTelemetry()`
Initializes the OpenTelemetry stack. It reads environment variables, registers global providers, and sets up automatic flush handlers for process exit. It returns a `Meter` instance for creating custom metrics.

### `flushYAAFTelemetry()`
Force-flushes all pending spans, metrics, and logs to the configured exporter. This is typically called during process shutdown or at the end of a test suite.

### `executeInSpan<T>(name, fn, attrs)`
A helper function that wraps arbitrary code in a new span. It automatically attaches the span to the current active context and records any exceptions that occur during execution.

### `getYAAFMeter()` and `getYAAFOTelLogger()`
Accessors for the initialized OpenTelemetry providers. These return `undefined` if telemetry has not been initialized or if the specific signal (metrics or logs) is disabled.

## Configuration
Telemetry is configured primarily through environment variables. YAAF supports standard OpenTelemetry variables but also provides `YAAF_OTEL_*` overrides to allow the framework's telemetry to coexist with a host application's own OTel configuration.

| Variable | Purpose |
|---|---|
| `OTEL_TRACES_EXPORTER` | Set to `console`, `otlp`, or `none`. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | The URL of the OTLP collector (e.g., `http://localhost:4318`). |
| `YAAF_OTEL_TRACES_EXPORTER` | Overrides the standard exporter setting specifically for YAAF. |
| `YAAF_OTEL_SHUTDOWN_TIMEOUT_MS` | Maximum time to wait for data flush during shutdown (default: 2000ms). |

## Extension Points

### Custom Instrumentation
Developers can extend the default telemetry by manually annotating spans or creating custom metrics within agent hooks or tool logic:

```typescript
import { executeInSpan, getCurrentRunSpan } from 'yaaf';

// Annotate the current agent run with business logic metadata
getCurrentRunSpan()?.setAttribute('business.customer_id', 'cust_123');

// Wrap a custom service call in a span
const data = await executeInSpan('external_api.fetch', async (span) => {
  return fetch(url).then(r => r.json());
});
```

### Custom Metrics
Using the `Meter` provided by `initYAAFTelemetry()`, developers can track domain-specific counters and histograms:

```typescript
import { getYAAFMeter } from 'yaaf';

const meter = getYAAFMeter();
const toolErrors = meter?.createCounter('my_agent.tool_errors');

// In a tool or hook:
toolErrors?.add(1, { tool: 'database_query', error_type: 'timeout' });
```

## Peer Dependencies
To keep the core framework lightweight, OpenTelemetry packages are treated as optional peer dependencies. Users must install the specific exporters and SDK components required for their environment (e.g., `@opentelemetry/exporter-trace-otlp-proto` for OTLP support).