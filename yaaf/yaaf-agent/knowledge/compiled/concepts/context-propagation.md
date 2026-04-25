---
summary: The mechanism by which tracing context (like span IDs) is automatically passed across asynchronous operations in YAAF, often using AsyncLocalStorage.
title: Context Propagation
entity_type: concept
related_subsystems:
 - telemetry
search_terms:
 - asynchronous context passing
 - how does YAAF tracing work
 - AsyncLocalStorage in YAAF
 - passing span IDs
 - automatic parent span
 - telemetry context
 - avoid manual span passing
 - how to trace async calls
 - YAAF OpenTelemetry
 - agent lifecycle tracing
 - ALS context
 - implicit context
stub: false
compiled_at: 2026-04-24T17:53:52.811Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/telemetry/tracing.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Context Propagation is the mechanism for carrying request-scoped or execution-scoped data across asynchronous boundaries without needing to pass it as an explicit argument through every function call. In an asynchronous environment like Node.js, a single logical operation (like an [Agent Turn](./agent-turn.md)) may be broken up into many non-contiguous tasks on the event loop. Context propagation ensures that all these tasks can access a shared context, such as the ID of the parent [Trace](./trace.md) or [Span](../apis/span.md).

This pattern solves a critical problem in [Observability](./observability.md) and telemetry. Without it, linking a low-level event (like a tool's execution) back to the high-level request that triggered it (the `Agent.run()` call) is difficult and requires manually passing context objects through every layer of the application, which is error-prone and clutters API surfaces [Source 1].

## How It Works in YAAF

YAAF's telemetry subsystem implements context propagation using Node.js's built-in `AsyncLocalStorage` API [Source 1]. This API allows for creating a storage context that persists across asynchronous operations initiated within its scope.

The process in YAAF's tracing layer is as follows [Source 1]:

1.  **Initialization**: [when](../apis/when.md) a high-level operation begins, such as an agent run, a function like `startAgentRunSpan` is called. This creates a new [OpenTelemetry](./open-telemetry.md) span.
2.  **Storage**: This new span is stored in an `AsyncLocalStorage` instance. This action establishes the context for all subsequent asynchronous work scheduled from within this scope.
3.  **Propagation**: Any function, even one in a different module that is called and `await`ed, will have access to the same `AsyncLocalStorage` store.
4.  **Nesting**: When a nested operation begins, such as an [LLM](./llm.md) request (`startLLMRequestSpan`) or a tool call (`startToolCallSpan`), it can read the active span from the `AsyncLocalStorage` store. It uses this retrieved span as the parent for its own new span, thus automatically creating a correctly nested span hierarchy.

This automatic parent-child linking enables YAAF to build a complete trace for an agent's execution, with a hierarchy like `agent.run` → `llm.request` / `tool.call` → `tool.execution`, without developers needing to pass span objects manually [Source 1]. The `executeInSpan` helper function further simplifies this by wrapping an arbitrary asynchronous function in a new span that automatically attaches to the current context [Source 1].

## Configuration

The context propagation mechanism itself, being based on `AsyncLocalStorage`, is a core part of the framework's telemetry design and is not directly configured. However, it is only active when the tracing system that relies on it is enabled.

Tracing is disabled by default. To enable it, and by extension the propagation of tracing context, a developer must [Source 1]:

1.  Set an environment variable to specify a trace exporter. YAAF recognizes `YAAF_OTEL_TRACES_EXPORTER` or the standard OpenTelemetry variable `OTEL_TRACES_EXPORTER`. Valid values include `console` or `otlp`.
2.  Call the `initYAAFTelemetry()` function at process startup to register the necessary OpenTelemetry providers.

If tracing is not enabled, the context propagation logic for spans becomes a no-op with zero performance overhead [Source 1].

## Sources

[Source 1]: src/telemetry/tracing.ts