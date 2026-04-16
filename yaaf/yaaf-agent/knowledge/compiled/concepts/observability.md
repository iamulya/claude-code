---
title: Observability
entity_type: concept
summary: The framework's approach to monitoring agent behavior through traces, metrics, and logs using OpenTelemetry standards.
stub: false
compiled_at: 2026-04-16T14:37:04.830Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/telemetry/telemetry.ts
confidence: 0.9
---

---
title: "Observability"
entity_type: "concept"
summary: "The framework's approach to monitoring agent behavior through traces, metrics, and logs using OpenTelemetry standards."
related_subsystems:
  - "telemetry"

## What It Is
Observability in YAAF is the framework's mechanism for monitoring and debugging the behavior of LLM-powered agents. It is built on the OpenTelemetry (OTEL) standard, providing a provider-agnostic way to collect traces, metrics, and logs. 

The primary goal of observability in YAAF is to provide production-grade visibility into agent execution without forcing a specific vendor lock-in. It allows developers to track agent reasoning steps, monitor performance, and capture structured logs that can be exported to various backends like Jaeger, Prometheus, or standard OTLP collectors.

## How It Works in YAAF
YAAF implements observability through a dedicated telemetry module that initializes OpenTelemetry providers. The framework manages three primary signals:

1.  **Traces**: Track the flow of execution across agent components and tool calls.
2.  **Metrics**: Quantitative data such as request counts, latency, and token usage.
3.  **Logs**: Structured records of internal framework events and agent activities.

### Initialization
The telemetry stack is initialized using the `initYAAFTelemetry()` function. This function should be called once at process startup. It reads configuration from environment variables, registers global providers, and sets up flush handlers for process exit events (via `beforeExit` and `exit`).

### Key Components
*   **Meter**: Accessible via `getYAAFMeter()`, this allows developers to create custom counters and histograms for agent-specific metrics.
*   **Logger**: Accessible via `getYAAFOTelLogger()`, this provides a structured OTLP log emitter for framework and agent logs.
*   **Flush Mechanism**: The `flushYAAFTelemetry()` function forces an immediate export of all pending telemetry data, which is critical for short-lived processes or clean shutdowns.

### Coexistence
To support integration into host applications that may already use OpenTelemetry, YAAF supports a `YAAF_OTEL_` prefix for its environment variables. This allows the framework's telemetry configuration to exist independently of the host application's global OTEL settings.

## Configuration
Observability is configured primarily through environment variables. YAAF honors standard `OTEL_*` variables but prioritizes `YAAF_OTEL_*` overrides.

### Environment Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| `YAAF_OTEL_TRACES_EXPORTER` | — | Override `OTEL_TRACES_EXPORTER` |
| `YAAF_OTEL_METRICS_EXPORTER` | — | Override `OTEL_METRICS_EXPORTER` |
| `YAAF_OTEL_LOGS_EXPORTER` | — | Override `OTEL_LOGS_EXPORTER` |
| `YAAF_OTEL_EXPORTER_OTLP_ENDPOINT` | — | Override `OTEL_EXPORTER_OTLP_ENDPOINT` |
| `YAAF_OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | `grpc`, `http/json`, or `http/protobuf` |
| `YAAF_OTEL_SHUTDOWN_TIMEOUT_MS` | `2000` | Max ms to wait for flush on shutdown |

### Exporter Types
*   `console`: Pretty-prints telemetry to stdout (recommended for development).
*   `otlp`: Sends data via OpenTelemetry Line Protocol.
*   `none` or empty: Disables the specific signal.

### Code Examples

**Basic Initialization**
```ts
import { initYAAFTelemetry } from 'yaaf/telemetry';

// Reads OTEL_* or YAAF_OTEL_* env vars and registers providers
await initYAAFTelemetry();
```

**Custom Metrics**
```ts
import { getYAAFMeter } from 'yaaf/telemetry';

const meter = getYAAFMeter();
if (meter) {
  const counter = meter.createCounter('agent.tool_usage');
  counter.add(1, { tool: 'web_search' });
}
```

**Production Configuration (OTLP)**
```ts
// Example environment setup for Jaeger via OTLP
process.env.OTEL_TRACES_EXPORTER = 'otlp';
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';

import { initYAAFTelemetry } from 'yaaf/telemetry';
await initYAAFTelemetry();
```

## Sources
* `src/telemetry/telemetry.ts`