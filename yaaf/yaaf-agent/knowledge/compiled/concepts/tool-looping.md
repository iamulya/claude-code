---
summary: A problematic pattern where an agent repeatedly calls the same tool with identical inputs or outputs, leading to unproductive cycles.
title: Tool Looping
entity_type: concept
related_subsystems:
 - Tool System
see_also:
 - concept:Tool Loop Detection
 - concept:Max Iterations
 - concept:Circuit Breaker Pattern
 - api:YaafDoctor
search_terms:
 - agent stuck in a loop
 - repetitive tool calls
 - how to prevent infinite loops
 - detecting agent cycles
 - tool call cycle
 - identical tool output loop
 - agent keeps calling same function
 - unproductive agent behavior
 - YAAF loop detection
 - tool:loop-detected event
 - debugging repeating tools
 - agent progress stalled
stub: false
compiled_at: 2026-04-25T00:25:49.165Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
compiled_from_quality: documentation
confidence: 0.9
---

## What It Is

Tool Looping is an undesirable agent behavior pattern where an agent becomes stuck in a repetitive cycle of invoking the same tool. This often occurs when the agent calls a tool with identical inputs or receives identical outputs across multiple turns, leading it to believe it must repeat the action. This state is unproductive, as the agent makes no progress towards its goal while consuming resources such as API tokens, compute time, and incurring costs from tool execution.

## How It Works in YAAF

The YAAF framework includes mechanisms to identify this pattern at runtime. The core of this feature is the detection of a tool being called repeatedly with an identical output [Source 1].

When the framework detects such a loop, it emits a `tool:loop-detected` event. This event signals that the agent may be stuck and allows other parts of the system to react. The primary consumer of this event is the [YaafDoctor](../apis/yaaf-doctor.md), a built-in diagnostic agent. When [YaafDoctor](../apis/yaaf-doctor.md) is attached to a running agent in its `watch` mode, it subscribes to the `tool:loop-detected` event, along with other error and warning events. This allows the Doctor to diagnose the looping behavior and alert the developer, helping to identify and resolve the root cause of the unproductive cycle [Source 1].

## See Also

*   [Tool Loop Detection](./tool-loop-detection.md): The specific mechanism for identifying tool loops.
*   [Max Iterations](./max-iterations.md): A hard limit on agent turns that serves as a final backstop against infinite loops.
*   [Circuit Breaker Pattern](./circuit-breaker-pattern.md): A general resilience pattern for preventing repeated failures, which can be related to looping behavior.
*   [YaafDoctor](../apis/yaaf-doctor.md): The built-in diagnostic tool that consumes `tool:loop-detected` events to help developers.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md