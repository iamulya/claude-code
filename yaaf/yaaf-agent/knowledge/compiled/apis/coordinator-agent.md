---
summary: An agent implementation that manages worker agents, delegates tasks, and synthesizes final responses.
export_name: CoordinatorAgent
source_file: src/agents/coordinator.ts
category: class
title: CoordinatorAgent
entity_type: api
stub: false
compiled_at: 2026-04-16T14:13:09.721Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/coordinator.ts
confidence: 0.9
---

## Overview
The `CoordinatorAgent` is a specialized agent implementation designed for the coordinator-worker multi-agent pattern. It acts as a central orchestrator that receives high-level user requests, decomposes them into sub-tasks, and delegates those tasks to specialized worker agents. Once workers report their results, the coordinator synthesizes the information to provide a final response to the user.

This implementation is based on battle-tested coordinator prompt engineering patterns. It provides structured communication between the coordinator and workers using a standardized notification format, allowing for complex multi-step reasoning and parallel task execution.

## Signature / Constructor
The `CoordinatorAgent` is typically configured with a language model and a set of worker definitions.

```typescript
export type TaskStatus = 'completed' | 'failed' | 'killed'

export type TaskNotification = {
  taskId: string
  status: TaskStatus
  summary: string
  result?: string
  usage?: {
    totalTokens: number
    toolUses: number
    durationMs: number
  }
}
```

## Methods & Properties
- `run(input: string): Promise<string>`: The primary entry point for the agent. It processes the user input, manages the delegation loop, and returns the synthesized final result.
- `on(event: 'worker:completed' | 'worker:failed', listener: (notification: TaskNotification) => void)`: Subscribes to lifecycle events emitted by worker agents during the coordination process.

## Events
The `CoordinatorAgent` emits events to provide visibility into the progress of delegated tasks:

- **worker:completed**: Emitted when a worker agent successfully finishes a task.
  - Payload: `TaskNotification`
- **worker:failed**: Emitted when a worker agent encounters an error or fails to complete a task.
  - Payload: `TaskNotification`

## Examples
The following example demonstrates how to initialize a coordinator with two specialized workers and handle completion events.

```ts
import { createCoordinator } from 'yaaf';

const coordinator = createCoordinator({
  model,
  workers: [
    { 
      id: 'researcher', 
      tools: [searchTool, readTool], 
      description: 'Research agent specialized in gathering information.' 
    },
    { 
      id: 'implementer', 
      tools: [editTool, writeTool], 
      description: 'Implementation agent specialized in code modifications.' 
    },
  ],
});

// Listen for worker progress
coordinator.on('worker:completed', (notif) => {
  console.log(`Worker ${notif.taskId} finished: ${notif.summary}`);
});

// Execute a complex task
const result = await coordinator.run('Fix the auth bug in login.ts');
```

## See Also
- `buildCoordinatorPrompt`: A utility function used by the agent to generate system prompts containing worker capabilities and concurrency rules.
- `buildWorkerResult`: A utility for formatting worker outputs into a structure the coordinator can interpret.