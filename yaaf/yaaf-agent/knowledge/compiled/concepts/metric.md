---
title: Metric
entity_type: concept
summary: A quantitative measurement of a system's behavior, such as counters, gauges, or histograms, as defined by OpenTelemetry.
related_subsystems:
 - telemetry
search_terms:
 - custom metrics
 - OpenTelemetry metrics
 - how to measure agent performance
 - counters and histograms
 - YAAF observability
 - instrumenting agents
 - getYAAFMeter
 - createCounter
 - createHistogram
 - monitoring LLM calls
 - tracking tool errors
 - agent latency measurement
 - OTEL_METRICS_EXPORTER
stub: false
compiled_at: 2026-04-24T17:58:50.276Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
compiled_from_quality: documentation
confidence: 0.9
---

## What It Is

A Metric is a quantitative measurement of a system's behavior over time, captured as part of YAAF's [Observability](./observability.md) features [Source 1]. Based on the [OpenTelemetry](./open-telemetry.md) standard, metrics are one of the three core signals of observability, alongside traces and logs. They are typically aggregated numerical data, such as counts of events (counters), measurements of value distributions (histograms), or point-in-time values (gauges). In YAAF, metrics are used to monitor agent performance, track resource consumption like token usage, count errors, and measure latencies [Source 1].

## How It Works in YAAF

YAAF's metrics system is an integration with the OpenTelemetry standard. To use it, developers must first enable the [Telemetry System](../subsystems/telemetry-system.md) and then create and record custom metrics [Source 1].

The process begins by calling `initYAAFTelemetry()` once at application startup. This function initializes the global OpenTelemetry providers based on environment variables. After initialization, a `Meter` instance can be obtained by calling `getYAAFMeter()` [Source 1]. If telemetry has not been initialized, this function will return `undefined`.

With the `Meter` instance, developers can create different types of metric instruments. The most common are:
*   **Counters**: Used to count occurrences of an event, such as the number of [LLM](./llm.md) calls or tool errors. The value of a counter only increases.
*   **Histograms**: Used to record a distribution of measurements, such as the latency of an [Agent Turn](./agent-turn.md) in milliseconds.

These metrics are typically recorded within [Agent Hooks](./agent-hooks.md) to capture data at specific points in the agent lifecycle [Source 1].

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
[Source 1]

## Configuration

Metrics, like all telemetry in YAAF, are disabled by default to ensure zero performance overhead [when](../apis/when.md) not in use [Source 1]. To enable metrics, the `OTEL_METRICS_EXPORTER` environment variable must be set.

Common configurations include:
*   `OTEL_METRICS_EXPORTER=console`: For development, prints metrics to the standard output.
*   `OTEL_METRICS_EXPORTER=otlp`: For production, sends metrics to an OpenTelemetry collector like Jaeger or Grafana Tempo.

When using the `otlp` exporter, additional variables must be configured to specify the collector's endpoint and protocol:
*   `OTEL_EXPORTER_OTLP_ENDPOINT`: The base URL for the OTLP collector (e.g., `http://localhost:4318`).
*   `OTEL_EXPORTER_OTLP_PROTOCOL`: The OTLP protocol, such as `http/protobuf` (default), `http/json`, or `grpc`.

YAAF also provides `YAAF_OTEL_*` prefixed environment variables, such as `YAAF_OTEL_METRICS_EXPORTER`, which override the standard `OTEL_*` variables. This allows YAAF's telemetry pipeline to be configured independently from a host application's own OpenTelemetry setup [Source 1].

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md