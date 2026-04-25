---
title: LLM Call
entity_type: concept
summary: A discrete, instrumented interaction with a Large Language Model, representing a single request-response cycle within an agent's execution.
related_subsystems:
 - Observability
 - Agent Runtime
search_terms:
 - what is an llm request
 - llm interaction
 - model invocation
 - agent turn
 - trace llm calls
 - opentelemetry llm span
 - yaaf.llm.request
 - monitoring model usage
 - llm input output tokens
 - llm finish reason
 - how to measure llm latency
 - model call attributes
 - llm cache tokens
stub: false
compiled_at: 2026-04-24T17:58:03.799Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md
compiled_from_quality: documentation
confidence: 0.85
---

## What It Is

An [LLM](./llm.md) Call is a fundamental concept in YAAF representing a single, discrete interaction with a Large Language Model. It encapsulates one request-response cycle, where the agent sends a prompt (including messages, system instructions, and available [Tools](../subsystems/tools.md)) and receives a completion from the model provider.

Within the lifecycle of a YAAF agent, an LLM Call is a primary unit of work that drives the agent's reasoning process. An agent's turn, initiated by a `Agent.run()` call, may consist of one or more LLM Calls, interspersed with tool executions, until a final answer is produced or a stopping condition is met [Source 1]. YAAF treats each LLM Call as an important, observable event, enabling detailed performance monitoring, debugging, and cost analysis through its [Telemetry System](../subsystems/telemetry-system.md) [Source 1].

## How It Works in YAAF

In YAAF, every LLM Call is automatically instrumented with an [OpenTelemetry](./open-telemetry.md) [Span](../apis/span.md) [when](../apis/when.md) tracing is enabled. This provides a detailed, structured record of the interaction without requiring any manual setup from the developer [Source 1].

Each LLM Call generates a span named `yaaf.llm.request`. This span is created as a child of the overarching `yaaf.agent.run` span, clearly showing its place within the sequence of operations for a given [Agent Turn](./agent-turn.md) [Source 1].

The `yaaf.llm.request` span is automatically annotated with a rich set of attributes that provide insight into the call's performance and behavior [Source 1]:

*   `llm.model`: The specific model identifier used for the call (e.g., `gpt-4-turbo`).
*   `llm.message_count`: The number of messages sent to the model in the prompt.
*   `llm.tool_count`: The number of tools made available to the model.
*   `llm.input_tokens`: The number of tokens in the request sent to the model.
*   `llm.output_tokens`: The number of tokens in the response received from the model.
*   `llm.cache_read_tokens`: The number of tokens served from a cache, if applicable.
*   `llm.cache_write_tokens`: The number of tokens written to a cache, if applicable.
*   `llm.duration_ms`: The total duration of the LLM Call in milliseconds.
*   `llm.finish_reason`: The reason the model stopped generating tokens (e.g., `stop`, `tool_calls`).
*   `llm.has_tool_calls`: A boolean indicating whether the model's response included a request to call one or more tools.

Additionally, developers can programmatically react to the completion of an LLM Call using hooks, such as the `afterLLM` hook, to implement custom logic or metrics [Source 1].

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/telemetry.md