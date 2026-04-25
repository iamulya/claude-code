---
summary: A multi-agent pattern in YAAF that orchestrates tasks between a CoordinatorAgent and multiple WorkerAgents.
primary_files:
 - src/agents/coordinator.ts
tags:
 - multi-agent
 - orchestration
 - agent-patterns
title: Coordinator Mode
entity_type: subsystem
exports:
 - TaskStatus
 - TaskNotification
 - buildCoordinatorPrompt
 - buildWorkerResult
search_terms:
 - multi-agent systems
 - agent orchestration
 - coordinator worker pattern
 - how to delegate tasks between agents
 - agent collaboration
 - hierarchical agent architecture
 - task decomposition for LLMs
 - managing multiple agents
 - YAAF multi-agent
 - structured agent communication
 - task notification format
 - agent delegation
stub: false
compiled_at: 2026-04-24T18:11:48.159Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/coordinator.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

Coordinator Mode is a built-in subsystem in YAAF that provides a first-class implementation of the coordinator-worker multi-agent pattern [Source 1]. It is designed to solve complex problems by breaking them down and orchestrating tasks between a central `[[[[[[[[CoordinatorAgent]]]]]]]]` and a set of specialized `[[[[[[[[WorkerAgent]]]]]]]]s`. The coordinator is responsible for delegating sub-tasks, synthesizing results from workers, and managing communication with the end-user, while workers focus on executing specific tasks using their assigned [Tools](./tools.md) [Source 1].

## Architecture

The Coordinator Mode subsystem is built around a few core components that enable its hierarchical, multi-agent structure [Source 1]:

*   **CoordinatorAgent**: This is the central orchestrator. It receives a high-level goal from the user, delegates specific sub-tasks to appropriate workers, and synthesizes their individual results into a final, coherent response.
*   **WorkerAgent**: These are specialized agents designed to perform specific functions. Each worker is configured with a set of tools and a description of its capabilities. They execute tasks assigned by the coordinator and report their results back in a structured format.
*   **[CoordinatorPromptBuilder](../concepts/coordinator-prompt-builder.md)**: A utility responsible for generating a detailed [System Prompt](../concepts/system-prompt.md) for the `CoordinatorAgent`. This prompt is engineered to provide the agent with context about its available workers, their capabilities, rules for concurrency, and guidance on how to synthesize results effectively. The implementation is inspired by battle-tested [Prompt Engineering](../concepts/prompt-engineering.md) patterns [Source 1].
*   **[TaskNotification](../apis/task-notification.md)**: A structured data payload that `WorkerAgents` use to report the outcome of their tasks to the `CoordinatorAgent`. This standardized format ensures reliable communication between agents.

## Integration Points

The Coordinator Mode subsystem integrates with other parts of the YAAF framework primarily through its configuration and event emissions.

*   **[Tool System](./tool-system.md)**: Worker agents are defined by the collection of `Tool` objects they are given access to, directly integrating with the framework's tool-use capabilities [Source 1].
*   **Event System**: The coordinator emits events to signal the status of worker tasks. As shown in the example usage, consumers can listen for events like `'worker:completed'` to monitor the progress of the overall operation [Source 1].

## Key APIs

The public API surface for Coordinator Mode is centered on creating the coordinator and handling the data structures for [Inter-Agent Communication](./inter-agent-communication.md).

*   **`createCoordinator(config)`**: A factory function used to instantiate a new coordinator. The configuration specifies the model to use and defines the set of available workers, including their IDs, tools, and descriptions [Source 1].
*   **`TaskNotification`**: A type defining the structured message sent from a worker to the coordinator. It includes fields such as `taskId`, `status`, `summary`, and optional `result` and `usage` metrics [Source 1].
*   **`TaskStatus`**: A type representing the possible states of a worker task: `"completed"`, `"failed"`, or `"killed"` [Source 1].
*   **`buildCoordinatorPrompt(config)`**: A function that constructs the system prompt for the `CoordinatorAgent` based on its configuration and worker definitions [Source 1].
*   **`buildWorkerResult(...)`**: A utility function to format a worker's output into a message that can be injected into the coordinator's context [Source 1].

## Configuration

Coordinator Mode is configured by calling the `createCoordinator` function with a configuration object. The primary configuration involves defining the pool of `WorkerAgents`.

Each worker in the `workers` array is an object with the following properties [Source 1]:
*   `id`: A unique string identifier for the worker.
*   `tools`: An array of `Tool` instances that this worker is permitted to use.
*   `description`: A natural language description of the worker's capabilities, which the coordinator uses to decide which worker to delegate a task to.

An example configuration is as follows [Source 1]:

```typescript
const coordinator = createCoordinator({
  model,
  workers: [
    { id: 'researcher', tools: [searchTool, readTool], description: 'Research agent' },
    { id: 'implementer', tools: [editTool, writeTool], description: 'Implementation agent' },
  ],
});
```

## Sources

[Source 1]: `src/agents/coordinator.ts`