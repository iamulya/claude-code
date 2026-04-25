---
summary: The primary agent in Coordinator Mode responsible for delegating tasks, synthesizing results, and interacting with the user.
tags:
 - multi-agent
 - orchestration
 - agent-role
title: CoordinatorAgent
entity_type: concept
related_subsystems:
 - agents
see_also:
 - WorkerAgent
 - CoordinatorPromptBuilder
 - TaskNotification
search_terms:
 - multi-agent systems
 - coordinator-worker pattern
 - task delegation agent
 - how to orchestrate agents
 - YAAF coordinator mode
 - agent that manages other agents
 - synthesizing agent results
 - user-facing agent
 - delegating tasks to workers
 - multi-agent architecture
 - hierarchical agent systems
 - agent manager
stub: false
compiled_at: 2026-04-24T17:54:04.848Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/coordinator.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

A **CoordinatorAgent** is the central agent in YAAF's "[Coordinator Mode](../subsystems/coordinator-mode.md)," a first-class multi-agent pattern for solving complex problems [Source 1]. Its primary role is to act as an orchestrator. It breaks down a user's request, delegates sub-tasks to specialized `[[[[[[[[WorkerAgent]]]]]]]]`s, synthesizes the results from those workers, and communicates the final output back to the user [Source 1].

This pattern allows a system to leverage multiple agents, each with distinct capabilities or [Tools](../subsystems/tools.md), to accomplish a goal that would be difficult for a single, monolithic agent. The `CoordinatorAgent` is inspired by battle-tested [Prompt Engineering](./prompt-engineering.md) for multi-agent coordination [Source 1].

## How It Works in YAAF

The `CoordinatorAgent` is the user-facing component of the Coordinator Mode pattern, which also includes `WorkerAgent`s, the `[[[[[[[[CoordinatorPromptBuilder]]]]]]]]`, and the `Task[[[[[[[[[[Notification]]]]]]]]]]` data structure [Source 1].

The process begins with the `CoordinatorPromptBuilder`, which generates a [System Prompt](./system-prompt.md) for the `CoordinatorAgent`. This prompt provides the agent with crucial context, including a list of available `WorkerAgent`s, their specific capabilities (via descriptions and tools), rules for concurrency, and guidance on how to synthesize results effectively [Source 1].

[when](../apis/when.md) a `WorkerAgent` finishes its assigned task, it sends a structured `[[[[[[[[TaskNotification]]]]]]]]` payload back to the coordinator. This Notification contains the task's ID, its final status (`completed`, `failed`, or `killed`), a summary of the outcome, and optional details like the full result and resource usage metrics [Source 1]. The `buildWorkerResult` function can be used to format this notification into a user message that is then injected into the `CoordinatorAgent`'s context, informing its next decision [Source 1].

The `CoordinatorAgent` processes these notifications, often via an event listener like `on('worker:completed')`, to track progress and decide on the next action. This could involve dispatching another task to a worker or, once all necessary information is gathered, synthesizing a final response for the user [Source 1].

## Configuration

A `CoordinatorAgent` is configured by defining its model and the set of `WorkerAgent`s it can delegate tasks to. Each worker is defined by a unique ID, a description of its capabilities, and the specific tools it has access to [Source 1].

The following example demonstrates how to create a coordinator with two workers: a `researcher` and an `implementer`.

```typescript
const coordinator = createCoordinator({
  model,
  workers: [
    { id: 'researcher', tools: [searchTool, readTool], description: 'Research agent' },
    { id: 'implementer', tools: [editTool, writeTool], description: 'Implementation agent' },
  ],
});

coordinator.on('worker:completed', (notif) => {
  console.log(`Worker ${notif.taskId} finished: ${notif.summary}`);
});

const result = await coordinator.run('Fix the auth bug in login.ts');
```
[Source 1]

## See Also

*   WorkerAgent: The specialized agent that receives and executes tasks from the `CoordinatorAgent`.
*   CoordinatorPromptBuilder: The utility responsible for creating the system prompt that instructs the `CoordinatorAgent`.
*   TaskNotification: The structured data format used by `WorkerAgent`s to report results back to the `CoordinatorAgent`.

## Sources

[Source 1] src/agents/coordinator.ts