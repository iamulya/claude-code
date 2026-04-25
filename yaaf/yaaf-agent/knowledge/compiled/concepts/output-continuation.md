---
summary: A mechanism where YAAF injects a synthetic continuation message into the context when an LLM's output token limit is hit, prompting the model to continue its response.
title: Output Continuation
entity_type: concept
related_subsystems:
 - subsystems/context-management
see_also:
 - concepts/context-management
 - concepts/context-overflow
 - concepts/token-budget
 - apis/yaaf-doctor
search_terms:
 - LLM output truncated
 - model response cut off
 - how to continue LLM generation
 - max_tokens limit reached
 - finish reason length
 - incomplete model response
 - synthetic continuation message
 - automatic response continuation
 - handle token limit
 - context:output-continuation event
 - long response generation
stub: false
compiled_at: 2026-04-25T00:22:18.972Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
compiled_from_quality: documentation
confidence: 0.9
---

## What It Is

Output Continuation is a recovery mechanism in YAAF that automatically handles situations where a Large Language Model (LLM) stops generating a response because it has reached its maximum output token limit. When an LLM's output is truncated mid-generation, this feature allows the agent to seamlessly prompt the model to continue its response in a subsequent [LLM Call](./llm-call.md), ensuring a complete and coherent output without manual intervention. This is crucial for tasks that require long-form generation which might exceed the `max_tokens` parameter of a single API call.

## How It Works in YAAF

When an agent makes a call to an LLM, the provider's response includes a "finish reason." If this reason indicates that the generation was stopped due to the output token limit (e.g., `length` or `max_tokens`), YAAF's [Context Management](../subsystems/context-management.md) subsystem detects this condition.

Upon detection, the framework automatically injects a synthetic continuation message into the agent's context [Source 1]. This message is designed to prompt the LLM to resume its generation from the exact point it was cut off. The agent then proceeds with another turn, effectively continuing the thought process.

To support [Observability](./observability.md), the framework emits a `context:output-continuation` event whenever this mechanism is triggered [Source 1]. This event can be monitored by diagnostic tools like [YaafDoctor](../apis/yaaf-doctor.md) to provide insight into the agent's runtime behavior and to flag if an agent is frequently hitting token limits, which might indicate a need for prompt optimization or changes to the [Token Budget](./token-budget.md) [Source 1].

## See Also

*   [Context Management](../subsystems/context-management.md)
*   [Context Overflow](./context-overflow.md)
*   [Token Budget](./token-budget.md)
*   [YaafDoctor](../apis/yaaf-doctor.md)

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md