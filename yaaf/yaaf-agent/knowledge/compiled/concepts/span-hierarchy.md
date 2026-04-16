---
title: Span Hierarchy
entity_type: concept
summary: The structured organization of OpenTelemetry spans in YAAF that represents the lifecycle of an agent run, including LLM requests and tool executions.
related_subsystems:
  - Observability
stub: false
compiled_at: 2026-04-16T14:11:32.215Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/telemetry.md
confidence: 0.95
---

## What It Is
The Span Hierarchy is the structural model YAAF uses to organize observability data during an agent's execution. By leveraging OpenTelemetry (OTel), YAAF creates a nested tree of "spans" that represent the duration and metadata of specific operations. This hierarchy allows developers to trace the causal relationship between an agent's high-level goal, its iterative LLM reasoning steps, and the specific tools it invokes.

This system solves the problem of "black box" agent execution by providing a granular, time-sequenced view of how an agent arrived at a specific conclusion or where a failure occurred in a multi-step process.

## How It Works in YAAF
Every call to `Agent.run()` initiates a root span. As the agent iterates through its execution loop, child spans are created for each major action. YAAF manages span propagation automatically using `AsyncLocalStorage`, meaning spans are correctly parented without requiring developers to manually pass context objects through their code.

The hierarchy follows a specific nesting pattern:

1.  **yaaf.agent.run (Root)**: Represents the entire lifecycle of a single user request.
    *   **Attributes**: `agent.name`, `run.user_message_length`, `run.iteration`.
2.  **yaaf.llm.request (Child)**: Created for every interaction with a Language Model.
    *   **Attributes**: `llm.model`, `llm.message_count`, `llm.tool_count`, `llm.input_tokens`, `llm.output_tokens`, `llm.cache_read_tokens`, `llm.cache_write_tokens`, `llm.duration_ms`, `llm.finish_reason`, `llm.has_tool_calls`.
3.  **yaaf.tool.call (Child)**: Created when the agent decides to use a tool.
    *   **Attributes**: `tool.name`, `tool.duration_ms`, `tool.blocked?`, `tool.block_reason?`.
4.  **yaaf.tool.execution (Grandchild)**: Nested under the tool call, representing the actual logic execution of the tool.
    *   **Attributes**: `tool.execution_ms`, `tool.error?`.

This cycle repeats (LLM request followed by tool calls) for every iteration of the agent's loop until a finish reason (such as `stop`) is reached.

## Configuration
Tracing is disabled by default to ensure zero overhead. It is activated by calling `initYAAFTelemetry()` at process startup and configuring standard OpenTelemetry environment variables.

```typescript
import { initYAAFTelemetry } from 'yaaf';

// Initialize telemetry once at startup
await initYAAFTelemetry();
```

### Environment Variables
The behavior of the span exporter is controlled via environment variables. YAAF supports standard OTel variables and `YAAF_OTEL_*` overrides to prevent interference with host application telemetry.

| Variable | Purpose |
|---|---|
| `OTEL_TRACES_EXPORTER` | Set to `console`, `otlp`, or `none`. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | The base URL for the OTLP collector. |
| `YAAF_OTEL_TRACES_EXPORTER` | Override for YAAF-specific traces. |

### Custom Instrumentation
Developers can extend the hierarchy by wrapping arbitrary work in custom spans or by annotating the current active spans.

```typescript
import {
  executeInSpan,
  getCurrentRunSpan,
  getCurrentToolSpan,
} from 'yaaf';

// Wrap work in a named span parented to the current agent turn
const data = await executeInSpan('my_service.fetch', async (span) => {
  span.setAttribute('http.url', url);
  return fetch(url).then(r => r.json());
});

// Annotate the current agent.run span directly
getCurrentRunSpan()?.setAttribute('business.customer_id', customerId);

// Annotate the current tool.call span
getCurrentToolSpan()?.setAttribute('tool.rows_returned', rows.length);
```