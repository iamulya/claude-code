---
title: Telemetry System
entity_type: subsystem
summary: YAAF's integration with OpenTelemetry for automatic and custom tracing, metrics, and structured logging.
primary_files:
 - src/telemetry/telemetry.ts
 - src/telemetry/tracing.ts
 - src/telemetry/attributes.ts
exports:
 - initYAAFTelemetry
 - flushYAAFTelemetry
 - getYAAFMeter
 - getYAAFOTelLogger
 - executeInSpan
 - isTracingEnabled
 - startAgentRunSpan
 - startLLMRequestSpan
 - startToolCallSpan
search_terms:
 - OpenTelemetry integration
 - YAAF observability
 - how to trace agent runs
 - custom metrics for agents
 - structured logging in YAAF
 - OTLP exporter setup
 - agent performance monitoring
 - instrumenting LLM calls
 - instrumenting tool calls
 - AsyncLocalStorage tracing
 - YAAF_OTEL environment variables
 - Jaeger integration
 - Grafana Tempo integration
 - console exporter
stub: false
compiled_at: 2026-04-24T18:20:29.683Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/attributes.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/telemetry.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The Telemetry System provides comprehensive [Observability](../concepts/observability.md) for YAAF agents by integrating with the [OpenTelemetry](../concepts/open-telemetry.md) (OTel) standard [Source 1]. It is designed to be a zero-overhead, opt-in system that automatically instruments key agent lifecycle events, including agent turns, [LLM](../concepts/llm.md) calls, and tool executions. The system offers capabilities for distributed tracing, custom metrics, and structured logging, allowing developers to monitor, debug, and analyze agent performance in both development and production environments [Source 1, Source 4].

## Architecture

The Telemetry System is built upon the OpenTelemetry libraries and is activated by calling `initYAAFTelemetry()` once at process startup [Source 1, Source 3]. [when](../apis/when.md) disabled, the system imposes no performance overhead [Source 1, Source 4].

Its core architectural features include:

*   **[Context Propagation](../concepts/context-propagation.md)**: The system uses `AsyncLocalStorage` to automatically propagate tracing context. This eliminates the need for developers to manually pass parent [Span](../apis/span.md) information through their code [Source 1, Source 4].
*   **Span Hierarchy**: Agent operations are Traced with a structured hierarchy. A root span, `yaaf.agent.run`, is created for each call to `Agent.run()`. Child spans such as `yaaf.llm.request` and `yaaf.tool.call` are nested within it. [Tool Execution](../concepts/tool-execution.md) itself is captured in a `yaaf.tool.execution` span, which is a grandchild of the agent run span [Source 1]. Other instrumented operations include `memory.extract`, `memory.retrieve`, and `compaction` [Source 2].
*   **Componentization**: The system is organized into logical modules. `telemetry.ts` handles the initialization of OTel providers and configuration from environment variables [Source 3]. `tracing.ts` provides the API for creating and managing spans for agent lifecycle events [Source 4]. `attributes.ts` defines common attribute keys and constants, such as the service name (`yaaf`) and the names for the Tracer (`com.yaaf.tracing`), meter (`com.yaaf.metrics`), and logger (`com.yaaf.logs`) [Source 2].
*   **Peer Dependencies**: The OpenTelemetry packages are optional peer dependencies. Users only need to install the packages required for their specific use case (e.g., [Trace](../concepts/trace.md)s only, or the full stack of traces, metrics, and logs) and the desired exporters [Source 1].

## Key APIs

The public API of the Telemetry System provides functions for initialization, data flushing, and custom instrumentation.

*   `initYAAFTelemetry()`: Initializes the OpenTelemetry stack for YAAF. It reads environment variables, registers the necessary global providers, and returns a `Meter` instance for creating custom metrics. This function should be called once at process startup [Source 1, Source 3].
*   `flushYAAFTelemetry()`: Force-flushes all pending telemetry data. This is useful before process exit or in test teardowns to ensure all data is exported [Source 1, Source 3].
*   `executeInSpan<T>(spanName, fn, attrs?)`: Wraps an asynchronous function `fn` in a new OpenTelemetry span. It automatically handles span creation, exception recording, and completion [Source 1, 'Source 4].
*   `getYAAFMeter()`: Returns the initialized YAAF `Meter` instance, which can be used to create custom counters and histograms. It returns `undefined` if `initYAAFTelemetry()` has not been called [Source 1, Source 3].
*   `getYAAFOTelLogger()`: Returns a structured OTLP log emitter. It returns `undefined` if telemetry is not initialized or if no logs exporter is configured [Source 1, Source 3].
*   `getCurrentRunSpan()` / `getCurrentToolSpan()`: Functions to retrieve the currently active agent run or tool call span from the context, allowing for direct annotation with custom attributes [Source 1].
*   `isTracingEnabled()`: A function that returns `true` if a traces exporter is configured and a tracer provider has been registered, indicating that tracing is active [Source 4].

## Configuration

The Telemetry System is configured primarily through environment variables. It is disabled by default and becomes active when an exporter is specified [Source 1]. The system honors standard `OTEL_*` environment variables and also provides `YAAF_OTEL_*` prefixed versions that take precedence. These overrides allow YAAF's telemetry to be configured independently from a host application's own OpenTelemetry setup [Source 1, Source 3].

Supported exporter types for traces, metrics, and logs include `console`, `otlp`, and `none` (or an empty value) to disable the signal [Source 3].

| Variable                           | Default         | Purpose                                                              |
| ---------------------------------- | --------------- | -------------------------------------------------------------------- |
| `OTEL_TRACES_EXPORTER`             | —               | Sets the trace exporter: `console`, `otlp`, or `none`                |
| `OTEL_METRICS_EXPORTER`            | —               | Sets the metrics exporter: `console`, `otlp`, or `none`              |
| `OTEL_LOGS_EXPORTER`               | —               | Sets the logs exporter: `console`, `otlp`, or `none`                 |
| `OTEL_EXPORTER_OTLP_ENDPOINT`      | —               | Base URL for the OTLP collector (e.g., Jaeger, Grafana Tempo)        |
| `OTEL_EXPORTER_OTLP_PROTOCOL`      | `http/protobuf` | OTLP protocol: `grpc`, `http/json`, or `http/protobuf`               |
| `OTEL_EXPORTER_OTLP_HEADERS`       | —               | Comma-separated key-value pairs for OTLP headers (e.g., for auth)    |
| `YAAF_OTEL_TRACES_EXPORTER`        | —               | Overrides `OTEL_TRACES_EXPORTER` for YAAF's telemetry pipeline       |
| `YAAF_OTEL_METRICS_EXPORTER`       | —               | Overrides `OTEL_METRICS_EXPORTER` for YAAF's telemetry pipeline      |
| `YAAF_OTEL_LOGS_EXPORTER`          | —               | Overrides `OTEL_LOGS_EXPORTER` for YAAF's telemetry pipeline         |
| `YAAF_OTEL_EXPORTER_OTLP_ENDPOINT` | —               | Overrides the OTLP endpoint specifically for YAAF                    |
| `YAAF_OTEL_SHUTDOWN_TIMEOUT_MS`    | `2000`          | Maximum milliseconds to wait for telemetry flush on process shutdown |
| `YAAF_OTEL_FLUSH_TIMEOUT_MS`       | `5000`          | Maximum milliseconds for an explicit `flushYAAFTelemetry()` call     |

[Source 1, Source 3]

## Extension Points

Developers can extend the built-in observability by creating custom spans, metrics, and logs.

*   **Custom Spans**: The `executeInSpan` function allows developers to wrap any arbitrary block of code in a new span, which will be automatically parented to the current agent operation span [Source 1].

    ```typescript
    import { executeInSpan } from 'yaaf';

    const data = await executeInSpan('my_service.fetch', async (span) => {
      span.setAttribute('http.url', url);
      return fetch(url).then(r => r.json());
    });
    ```

*   **Span Annotation**: Existing automatic spans can be annotated with custom business-specific attributes using functions like `getCurrentRunSpan()` [Source 1].

    ```typescript
    import { getCurrentRunSpan } from 'yaaf';
    getCurrentRunSpan()?.setAttribute('business.customer_id', customerId);
    ```

*   **Custom Metrics**: After initialization, the `getYAAFMeter()` function provides a `Meter` instance that can be used to create and record custom metrics like counters and histograms. This is often done within [Agent Hooks](../concepts/agent-hooks.md) [Source 1].

    ```typescript
    import { getYAAFMeter } from 'yaaf';

    const meter = getYAAFMeter();
    const toolErrors = meter?.createCounter('my_agent.tool_errors');

    // In a tool or hook:
    toolErrors?.add(1, { tool_name: 'calculator' });
    ```

*   **Structured Logging**: The `getYAAFOTelLogger()` function provides a logger that can emit structured logs to an OTLP endpoint, associating them with the current trace context [Source 1].

    ```typescript
    import { getYAAFOTelLogger } from 'yaaf';
    import { SeverityNumber } from '@opentelemetry/api-logs';

    const otelLog = getYAAFOTelLogger();
    otelLog?.emit({
      severityNumber: SeverityNumber.INFO,
      body: 'Agent session started',
      attributes: { 'session.id': sessionId },
    });
    ```

## Sources

*   [Source 1]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md`
*   [Source 2]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/attributes.ts`
*   [Source 3]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/telemetry.ts`
*   [Source 4]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts`