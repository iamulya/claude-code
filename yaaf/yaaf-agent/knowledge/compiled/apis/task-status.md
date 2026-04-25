---
summary: Defines the lifecycle statuses a task can have, such as 'pending', 'running', 'completed', 'failed', or 'killed'.
export_name: TaskStatus
source_file: src/agents/taskManager.ts
category: type
title: TaskStatus
entity_type: api
search_terms:
 - task lifecycle
 - agent task state
 - pending task status
 - running task status
 - completed task status
 - failed task status
 - killed task status
 - task state machine
 - how to check if a task is done
 - task notification status
 - background job state
 - task manager states
 - task cancellation
stub: false
compiled_at: 2026-04-24T17:43:37.454Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/coordinator.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/taskManager.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`TaskStatus` is a string literal type that represents the various stages in the lifecycle of a task managed by the `TaskManager` [Source 2]. It defines the state machine for background work, such as agent runs or shell commands, tracking a task from its creation to its final resolution [Source 2].

The typical lifecycle of a task is: `pending` → `running` → `completed` | `failed` | `killed` [Source 2]. The statuses `completed`, `failed`, and `killed` are considered terminal states. This type is fundamental to components that observe or report on task progress, such as the `[[[[[[[[TaskState]]]]]]]]` object and the `[[[[[[[[TaskNotification]]]]]]]]` payload used in coordinator-worker patterns [Source 1, Source 2].

## Signature

The canonical definition from `src/agents/taskManager.ts` includes all possible lifecycle states [Source 2]:

```typescript
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "killed";
```

- **`pending`**: The task has been created but has not yet started execution.
- **`running`**: The task is actively in progress.
- **`completed`**: The task finished successfully. This is a terminal state.
- **`failed`**: The task terminated due to an error. This is a terminal state.
- **`killed`**: The task was explicitly stopped or cancelled before completion. This is a terminal state.

Note: Some parts of the framework, like `TaskNotification` in `src/agents/coordinator.ts`, may only use a subset of these statuses, specifically the terminal states (`"completed" | "failed" | "killed"`) [Source 1]. The definition in `taskManager.ts` represents the complete set of possible statuses for a task's lifecycle [Source 2].

## Examples

### Basic Usage

Declaring a variable that holds a task's current status.

```typescript
import type { TaskStatus } from 'yaaf';

let currentStatus: TaskStatus = 'pending';

function startTask() {
  currentStatus = 'running';
  // ... task logic
}

function finishTask() {
  currentStatus = 'completed';
}
```

### Usage in TaskState

`TaskStatus` is a required property of the `TaskState` object, which is used by the `TaskManager` to track all information about a task.

```typescript
import type { TaskState, TaskStatus } from 'yaaf';

const myAgentTask: TaskState = {
  id: 'a3x7k9m2',
  type: 'agent',
  status: 'running', // The current status
  description: 'Research user query',
  startTime: Date.now(),
  notified: false,
};

function updateTaskStatus(task: TaskState, newStatus: TaskStatus) {
  task.status = newStatus;
  if (newStatus === 'failed' || newStatus === 'completed' || newStatus === 'killed') {
    task.endTime = Date.now();
  }
}

updateTaskStatus(myAgentTask, 'completed');
```

### Usage in TaskNotification

In coordinator-worker patterns, workers send a `TaskNotification` to the coordinator, which includes a terminal `TaskStatus`.

```typescript
import type { TaskNotification, TaskStatus } from 'yaaf';

function createCompletionNotice(taskId: string): TaskNotification {
  const status: TaskStatus = 'completed'; // Must be a terminal status

  return {
    taskId: taskId,
    status: status,
    summary: 'The research task completed successfully with new findings.',
    result: 'The key finding is...',
  };
}
```

## Sources

[Source 1]: src/agents/coordinator.ts
[Source 2]: src/agents/taskManager.ts