# Observability — OpenTelemetry

YAAF ships a full OpenTelemetry integration mirroring the main repo's `instrumentation.ts` and `sessionTracing.ts`. Every agent turn, LLM call, and tool execution is automatically instrumented with zero configuration overhead when disabled.

---

## Span Hierarchy

Every `Agent.run()` call creates a root span. LLM calls and tool calls are children, with tool execution as a grandchild of the tool call span:

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

Spans propagate via `AsyncLocalStorage` — no manual parent passing needed.

---

## Activation

Tracing is **off by default** — zero overhead until you set an exporter.

```bash
# Development — pretty-print to stdout
OTEL_TRACES_EXPORTER=console
OTEL_METRICS_EXPORTER=console
OTEL_LOGS_EXPORTER=console

# Production — Jaeger, Grafana Tempo, or any OTLP collector
OTEL_TRACES_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf   # or http/json / grpc
```

Call `initYAAFTelemetry()` once at process startup — it reads the env vars and registers global providers:

```typescript
import { initYAAFTelemetry } from 'yaaf';

const meter = await initYAAFTelemetry();

// meter is ready immediately for custom counters/histograms
const requests = meter.createCounter('my_agent.requests');
requests.add(1, { agent: 'my-agent', status: 'ok' });
```

---

## Custom Instrumentation

```typescript
import {
  executeInSpan,
  getCurrentRunSpan,
  getCurrentToolSpan,
} from 'yaaf';

// Wrap arbitrary work in a named span, parented to the current agent turn
const data = await executeInSpan('my_service.fetch', async (span) => {
  span.setAttribute('http.url', url);
  return fetch(url).then(r => r.json());
});

// Annotate the current agent.run span directly
getCurrentRunSpan()?.setAttribute('business.customer_id', customerId);

// Annotate the current tool.call span
getCurrentToolSpan()?.setAttribute('tool.rows_returned', rows.length);
```

---

## Custom Metrics

```typescript
import { getYAAFMeter } from 'yaaf';

const meter = getYAAFMeter(); // undefined if initYAAFTelemetry() not called yet

const llmCalls   = meter?.createCounter('my_agent.llm_calls');
const latency    = meter?.createHistogram('my_agent.turn_latency_ms');
const toolErrors = meter?.createCounter('my_agent.tool_errors');

// Record in your hooks
const hooks = {
  afterLLM: async (ctx, result) => {
    llmCalls?.add(1, { model: ctx.model });
    latency?.record(result.durationMs, { agent: 'my-agent' });
    return { action: 'continue' };
  },
};
```

---

## Structured Logs via OTLP

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

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `OTEL_TRACES_EXPORTER` | — | `console`, `otlp`, or `none` |
| `OTEL_METRICS_EXPORTER` | — | `console`, `otlp`, or `none` |
| `OTEL_LOGS_EXPORTER` | — | `console`, `otlp`, or `none` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | Base URL for OTLP collector |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | `grpc`, `http/json`, `http/protobuf` |
| `OTEL_EXPORTER_OTLP_HEADERS` | — | `key=value,key2=value2` auth headers |
| `YAAF_OTEL_TRACES_EXPORTER` | — | Override `OTEL_TRACES_EXPORTER` per-signal |
| `YAAF_OTEL_METRICS_EXPORTER` | — | Override `OTEL_METRICS_EXPORTER` per-signal |
| `YAAF_OTEL_LOGS_EXPORTER` | — | Override `OTEL_LOGS_EXPORTER` per-signal |
| `YAAF_OTEL_EXPORTER_OTLP_ENDPOINT` | — | Override endpoint for YAAF only |
| `YAAF_OTEL_SHUTDOWN_TIMEOUT_MS` | `2000` | Max ms to wait for flush on shutdown |
| `YAAF_OTEL_FLUSH_TIMEOUT_MS` | `5000` | Max ms for `flushYAAFTelemetry()` |

`YAAF_OTEL_*` overrides let you run YAAF's own telemetry pipeline alongside a host application's OTEL configuration without interference.

---

## Force Flush

Call before process exit or in test teardown to ensure all spans are exported:

```typescript
import { flushYAAFTelemetry } from 'yaaf';

process.on('SIGINT', async () => {
  await flushYAAFTelemetry();
  process.exit(0);
});
```

---

## Peer Dependencies

The OTel packages are optional peer dependencies — install only what you need:

```bash
# Minimum (traces only — console or OTLP http/protobuf)
npm install @opentelemetry/api @opentelemetry/sdk-trace-base \
            @opentelemetry/resources @opentelemetry/semantic-conventions

# Full stack (traces + metrics + logs)
npm install @opentelemetry/api @opentelemetry/api-logs \
            @opentelemetry/sdk-trace-base @opentelemetry/sdk-metrics \
            @opentelemetry/sdk-logs @opentelemetry/resources \
            @opentelemetry/semantic-conventions

# Exporters loaded on demand — install only what your protocol needs:
npm install @opentelemetry/exporter-trace-otlp-proto     # OTLP http/protobuf (default)
npm install @opentelemetry/exporter-trace-otlp-http      # OTLP http/json
npm install @opentelemetry/exporter-trace-otlp-grpc      # OTLP grpc
# (same pattern for exporter-metrics-otlp-* and exporter-logs-otlp-*)
```
