---
summary: Factory function to create and configure a CoordinatorAgent instance for multi-agent orchestration.
export_name: createCoordinator
source_file: src/agents/coordinator.ts
category: function
title: createCoordinator
entity_type: api
search_terms:
 - multi-agent systems
 - orchestration agent
 - coordinator-worker pattern
 - how to delegate tasks to agents
 - manage multiple agents
 - agent supervisor
 - hierarchical agents
 - YAAF coordinator mode
 - task delegation
 - synthesize agent results
 - master agent
 - worker agent
stub: false
compiled_at: 2026-04-24T16:59:12.084Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/coordinator.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `createCoordinator` function is a factory for creating and configuring a `CoordinatorAgent`. This agent is the central component of YAAF's "[Coordinator Mode](../subsystems/coordinator-mode.md)," a built-in pattern for managing multi-agent workflows [Source 1].

This function simplifies the setup of a coordinator-worker architecture. The resulting `CoordinatorAgent` is responsible for receiving a high-level task, delegating sub-tasks to a pool of specialized worker agents, synthesizing their results, and communicating the final outcome to the user [Source 1]. It is inspired by battle-tested [Prompt Engineering](../concepts/prompt-engineering.md) patterns for effective agent orchestration [Source 1].

Use `createCoordinator` [when](./when.md) a complex problem can be broken down into smaller, distinct tasks that can be handled by different agents with specific [Tools](../subsystems/tools.md) or capabilities.

## Signature / Constructor

The function takes a single configuration object and returns an instance of a `CoordinatorAgent`. While the exact signature is not explicitly exported, it can be inferred from its usage [Source 1].

```typescript
import type { Tool } from "../tools/tool.js";

// The LLM model instance to be used by the coordinator.
type LLM = any; 

interface WorkerConfig {
  id: string;
  tools: Tool[];
  description: string;
}

interface CoordinatorConfig {
  model: LLM;
  workers: WorkerConfig[];
}

// The returned agent instance, which is an event emitter.
interface CoordinatorAgent {
  run(prompt: string): Promise<any>;
  on(event: 'worker:completed', listener: (notification: TaskNotification) => void): this;
  // other methods and event types may exist
}

export function createCoordinator(config: CoordinatorConfig): CoordinatorAgent;
```

**Configuration:**

*   `config`: An object containing the coordinator's configuration.
    *   `model`: The language model instance the coordinator will use for reasoning and synthesis.
    *   `workers`: An array of `WorkerConfig` objects, where each object defines a worker agent available for delegation.
        *   `id`: A unique identifier for the worker.
        *   `tools`: An array of tools the worker agent is equipped with.
        *   `description`: A natural language description of the worker's capabilities, used by the coordinator to decide which worker to delegate tasks to.

## Methods & Properties

The `CoordinatorAgent` instance returned by `createCoordinator` has the following methods, based on example usage [Source 1].

### run()

Executes a high-level task by orchestrating the worker agents.

```typescript
run(prompt: string): Promise<any>
```

*   **Parameters:**
    *   `prompt`: A string describing the overall goal or task for the coordinator to achieve.
*   **Returns:** A `Promise` that resolves with the final result synthesized by the coordinator.

### on()

Registers an event listener for events emitted by the coordinator.

```typescript
on(event: string, listener: (...args: any[]) => void): this
```

*   **Parameters:**
    *   `event`: The name of the event to listen for (e.g., `'worker:completed'`).
    *   `listener`: The callback function to execute when the event is emitted.
*   **Returns:** The `CoordinatorAgent` instance, allowing for method chaining.

## Events

The `CoordinatorAgent` emits events to provide insight into its orchestration process.

### worker:completed

This event is emitted whenever a worker agent completes a delegated task.

*   **Payload:** `TaskNotification` - A structured object containing the results and metadata from the worker's execution.

```typescript
export type TaskStatus = "completed" | "failed" | "killed";

export type TaskNotification = {
  taskId: string;
  status: TaskStatus;
  summary: string;
  result?: string;
  usage?: {
    totalTokens: number;
    toolUses: number;
    durationMs: number;
  };
};
```

## Examples

The following example demonstrates how to create a coordinator with two workers—a `researcher` and an `implementer`—and use it to run a task [Source 1].

```typescript
// Assume model, searchTool, readTool, editTool, and writeTool are defined elsewhere.

const coordinator = createCoordinator({
  model,
  workers: [
    { id: 'researcher', tools: [searchTool, readTool], description: 'Research agent for finding information.' },
    { id: 'implementer', tools: [editTool, writeTool], description: 'Implementation agent for writing and modifying code.' },
  ],
});

coordinator.on('worker:completed', (notification) => {
  console.log(`Worker task ${notification.taskId} finished with status ${notification.status}.`);
  console.log(`Summary: ${notification.summary}`);
});

const finalResult = await coordinator.run('Research the cause of the auth bug in login.ts and then fix it.');

console.log('Final result:', finalResult);
```

## Sources

[Source 1]: src/agents/coordinator.ts