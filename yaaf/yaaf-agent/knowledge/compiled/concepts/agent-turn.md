---
title: Agent Turn
entity_type: concept
summary: A single cycle of an agent's operation, typically involving an LLM call, tool execution, and decision-making.
related_subsystems:
 - Observability
search_terms:
 - agent execution cycle
 - single agent step
 - LLM call and tool use loop
 - what is a turn in an agent
 - agent iteration
 - tracing agent execution
 - OpenTelemetry span for agent
 - yaaf.agent.run span
 - agent loop
 - request-response cycle for agent
 - turn-based agent
 - agent thought process
stub: false
compiled_at: 2026-04-24T17:52:04.129Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
compiled_from_quality: documentation
confidence: 0.85
---

## What It Is

An **Agent Turn** is the fundamental unit of work in a YAAF agent's execution loop. It represents a single iteration of the agent's reasoning process. A complete agent task, initiated by a call to `Agent.run()`, is composed of one or more sequential turns. Each turn typically involves the agent assessing its state, making a decision (often via an [LLM](./llm.md) call), and taking an action (such as executing a tool) to move closer to its goal. The sequence of turns continues until the agent's objective is met or a stop condition is triggered [Source 1].

## How It Works in YAAF

In YAAF, the concept of an Agent Turn is most concretely represented in the framework's [OpenTelemetry](./open-telemetry.md) integration for [Observability](./observability.md). While the agent's core logic executes this loop, the telemetry layer provides a structured view of each turn's components [Source 1].

[when](../apis/when.md) an agent is run with tracing enabled, a single `Agent.run()` call creates a root OpenTelemetry [Span](../apis/span.md) named `yaaf.agent.run`. This root span encompasses the entire lifecycle of the agent's task. Each Agent Turn within that task appears as a distinct set of child spans under this root span [Source 1].

A typical turn is instrumented with the following span hierarchy:

1.  **LLM Request (`yaaf.llm.request`):** The agent calls an LLM to decide on the next action. This is captured as a child span of the main `yaaf.agent.run` span.
2.  **Tool Call (`yaaf.tool.call`):** If the LLM decides to use a tool, this action is captured in a `yaaf.tool.call` span.
3.  **[Tool Execution](./tool-execution.md) (`yaaf.tool.execution`):** The actual execution of the tool's code is captured in a `yaaf.tool.execution` span, which is a grandchild of the main run span and a direct child of the `yaaf.tool.call` span.

This pattern of `yaaf.llm.request` followed by `yaaf.tool.call` repeats for each iteration or turn until the agent's work is complete, indicated by a `finish_reason` of `stop` [Source 1]. This structured tracing allows developers to precisely analyze the agent's behavior, performance, and decision-making process on a turn-by-turn basis.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md