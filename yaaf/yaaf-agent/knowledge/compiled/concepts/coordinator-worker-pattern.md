---
summary: A multi-agent orchestration pattern where a central coordinator delegates tasks to specialized workers and synthesizes their results.
title: Coordinator-Worker Pattern
entity_type: concept
related_subsystems:
  - Agents
stub: false
compiled_at: 2026-04-16T14:13:06.057Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/coordinator.ts
confidence: 1
---

## What It Is
The Coordinator-Worker Pattern is a first-class multi-agent orchestration strategy in YAAF designed for complex task decomposition and execution. It addresses the limitations of single-agent systems by introducing a hierarchical structure where a central authority manages specialized sub-agents. 

This pattern solves the problem of managing complex, multi-step workflows by allowing a primary agent to focus on high-level planning and synthesis while delegating specific technical or research tasks to workers equipped with specialized tools.

## How It Works in YAAF
The pattern is implemented through several core components defined in `src/agents/coordinator.ts`:

1.  **CoordinatorAgent**: The central agent that communicates with the user. It is responsible for delegating tasks to workers, monitoring their progress, and synthesizing their individual outputs into a final response.
2.  **WorkerAgent**: Specialized agents that perform discrete tasks. They are designed to auto-report their results in a structured format.
3.  **TaskNotification**: A structured payload used for worker-to-coordinator communication. It ensures the coordinator receives consistent data regarding task outcomes. The notification includes:
    *   `taskId`: A unique identifier for the delegated task.
    *   `status`: The state of the task (`completed`, `failed`, or `killed`).
    *   `summary`: A textual summary of the work performed.
    *   `result`: (Optional) The detailed output or data produced by the worker.
    *   `usage`: Metadata including `totalTokens`, `toolUses`, and `durationMs`.
4.  **CoordinatorPromptBuilder**: A utility that generates the system prompt for the coordinator. This is a distilled adaptation of complex coordinator prompt engineering (inspired by battle-tested patterns in related implementations) that defines worker capabilities, concurrency rules, and synthesis guidance.

The framework also provides `buildWorkerResult`, which formats the `TaskNotification` into a summary suitable for injection back into the coordinator's context as a user message.

## Configuration
Developers configure the pattern by defining a coordinator and providing an array of worker definitions. Each worker definition requires an `id`, a set of `tools`, and a `description` that informs the coordinator when to utilize that specific worker.

```ts
const coordinator = createCoordinator({
  model,
  workers: [
    { 
      id: 'researcher', 
      tools: [searchTool, readTool], 
      description: 'Research agent responsible for gathering information.' 
    },
    { 
      id: 'implementer', 
      tools: [editTool, writeTool], 
      description: 'Implementation agent responsible for code changes.' 
    },
  ],
});

// Optional: Listen for worker lifecycle events
coordinator.on('worker:completed', (notif) => {
  console.log(`Worker ${notif.taskId} finished: ${notif.summary}`);
});

// Start the orchestration
const result = await coordinator.run('Fix the auth bug in login.ts');
```

## Sources
* `src/agents/coordinator.ts`