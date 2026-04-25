---
title: TaskState
entity_type: api
summary: The type definition for the state object representing a single task managed by the TaskManager.
export_name: TaskState
source_file: src/agents/taskManager.ts
category: type
search_terms:
 - task lifecycle
 - agent task status
 - background job state
 - TaskManager task object
 - track agent work
 - task status pending running completed
 - asynchronous task tracking
 - task metadata
 - job state management
 - task properties
 - what is a task in yaaf
 - task cancellation
 - task timing
stub: false
compiled_at: 2026-04-24T17:43:46.139Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/taskManager.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

`TaskState` is a TypeScript type that defines the structure of a task object within YAAF's task management system. It represents a single unit of background work, such as an agent run, a shell command, or a multi-step [workflow](../concepts/workflow.md) [Source 2].

Each `TaskState` object tracks the complete lifecycle of a task, from its creation (`pending`) through execution (`running`) to a terminal state (`completed`, `failed`, or `killed`). It contains essential information including a unique ID, description, timing data, an optional `AbortController` for cancellation, and a flexible metadata property for custom data [Source 2].

These state objects are typically created and managed by the `TaskManager` class, which uses them to monitor and control asynchronous operations within an agent or agent swarm [Source 1, Source 2].

## Signature

The `TaskState` type and its related enumerations are defined as follows [Source 2]:

```typescript
export type TaskType = "agent" | "bash" | "teammate" | "workflow" | "monitor" | "custom";

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "killed";

export type TaskState = {
  /** Unique task ID (e.g., "a3x7k9m2") */
  id: string;
  /** Task type */
  type: TaskType;
  /** Current lifecycle status */
  status: TaskStatus;
  /** Human-readable description */
  description: string;
  /** When the task was created (Unix timestamp) */
  startTime: number;
  /** When the task reached a terminal state */
  endTime?: number;
  /** Total time spent paused (for accurate elapsed time) */
  totalPausedMs?: number;
  /** Whether the leader/UI has been notified of completion */
  notified: boolean;
  /** Abort controller for cancellation */
  abortController?: AbortController;
  /** Optional error message on failure */
  error?: string;
  /** Custom metadata bag */
  metadata?: Record<string, unknown>;
};
```

### Properties

*   **`id`**: A unique string identifier for the task.
*   **`type`**: A string literal indicating the category of the task.
*   **`status`**: A string literal representing the current stage of the task in its lifecycle.
*   **`description`**: A human-readable string explaining the purpose of the task.
*   **`startTime`**: A number representing the Unix timestamp [when](./when.md) the task was created.
*   **`endTime`**: An optional number representing the Unix timestamp when the task concluded.
*   **`totalPausedMs`**: An optional number tracking the cumulative time the task has been paused.
*   **`notified`**: A boolean flag indicating if a [Notification](./notification.md) has been sent for the task's completion.
*   **`abortController`**: An optional `AbortController` instance that can be used to cancel the running task.
*   **`error`**: An optional string containing an error message if the task's status is `failed`.
*   **`metadata`**: An optional record for storing arbitrary custom data related to the task.

## Examples

### Basic TaskState Object

A `TaskState` object for a pending agent task might look like this:

```typescript
import { TaskState } from 'yaaf';

const pendingTask: TaskState = {
  id: 'a3x7k9m2',
  type: 'agent',
  status: 'pending',
  description: 'Research quantum computing advances in 2024',
  startTime: Date.now(),
  notified: false,
  abortController: new AbortController(),
  metadata: {
    assignee: 'researcher-1',
    priority: 'high',
  },
};
```

### Task Lifecycle with TaskManager

The `TaskManager` class creates and returns `TaskState` objects to represent the work it manages.

```typescript
import { TaskManager, type TaskState } from 'yaaf';

// This is a conceptual example of TaskManager usage.
// The actual TaskManager class may have a different API.
const tasks = new TaskManager({ dir: './.tasks' });

async function run() {
  // TaskManager.create would return a TaskState object
  const task: TaskState = await tasks.create({
    type: 'research',
    description: 'Research quantum computing advances in 2024',
    metadata: {
      assignee: 'researcher-1',
      priority: 'high',
    }
  });

  console.log(`Task ${task.id} created with status: ${task.status}`); // status: 'pending'

  // Transitioning the state updates the TaskState object
  await tasks.transition(task.id, 'in_progress'); // Note: Source 1 uses 'in_progress', Source 2 uses 'running'

  // A final state might include a result in metadata
  await tasks.transition(task.id, 'completed', {
    result: 'Research findings...',
  });
}
```
*Note: The task states shown in the `TaskManager` example (`in_progress`, `completed`) are based on documentation from a multi-agent context [Source 1]. The definitive `TaskStatus` type defines the states as `pending`, `running`, `completed`, `failed`, and `killed` [Source 2].*

## See Also

*   **TaskManager**: The class responsible for creating, managing, and transitioning `TaskState` objects.

## Sources

*   [Source 1]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md`
*   [Source 2]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/taskManager.ts`