---
title: Agent Tracing
entity_type: concept
summary: The design pattern for observing agent execution using OpenTelemetry spans, context propagation via AsyncLocalStorage, and lifecycle-linked span hierarchies.
related_subsystems:
  - telemetry
stub: false
compiled_at: 2026-04-16T14:37:30.021Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/telemetry/tracing.ts
confidence: 0.95
---

## What It Is
Agent Tracing is the observability layer in YAAF designed to provide visibility into the execution lifecycle of LLM-powered agents. It utilizes the OpenTelemetry (OTEL) standard to record significant events as spans, allowing developers to monitor performance, debug complex agentic workflows, and analyze the sequence of model interactions and tool invocations.

The tracing system is designed to be zero-overhead when disabled and opt-in for production environments. It solves the problem of "black box" agent execution by creating a structured hierarchy of operations that can be exported to external collectors like Jaeger or Tempo.

## How It Works in YAAF
YAAF implements tracing through a specialized API that mirrors the framework's execution lifecycle.

### Span Hierarchy
Tracing in YAAF follows a strict parent-child relationship to represent the nested nature of agent operations:
1.  **Agent Run (`agent.run`)**: The top-level span representing a single turn or execution cycle of an agent.
2.  **LLM Request (`llm.request`)**: A child span of the agent run, representing a call to `ChatModel.complete()`.
3.  **Tool Call (`tool.call`)**: A child span of the agent run, representing the framework's preparation to invoke a tool.
4.