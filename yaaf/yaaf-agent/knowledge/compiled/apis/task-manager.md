---
title: TaskManager
entity_type: api
summary: A class for creating, tracking, and managing the lifecycle of background tasks within the YAAF framework.
export_name: TaskManager
source_file: src/agents/taskManager.ts
category: class
search_terms:
 - background task management
 - track agent work
 - task lifecycle
 - asynchronous job tracking
 - manage agent state
 - task state machine
 - cancel background work
 - AbortController for tasks
 - task queue
 - job status
 - long-running operations
 - how to manage tasks
 - task status updates
stub: false
compiled_at: 2026-04-24T17:43:18.498Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/taskManager.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `TaskManager` class provides a state machine for managing the lifecycle of background tasks, such as agent runs, shell commands, or complex workflows [Source 1, Source 2]. It is designed to track the state of work, handle cancellation, and provide visibility into ongoing processes [Source 2].

Each task managed by `TaskManager` has a unique ID, a defined lifecycle, an `AbortController` for cancellation, and duration tracking. Tasks are typically stored in a central state store, allowing different components of an application to observe their status. Completed, failed, or killed tasks are eventually evicted to maintain a clean state [Source 2].

There appear to be different implementations or configurations of `TaskManager` described in the source material. One version is file-based and persistent, intended for multi-agent scenarios [Source 1]. Another appears to be an in-[Memory](../concepts/memory.md) manager for tracking tasks within a single agent's context [Source 2]. These versions present slightly different APIs and state models.

## Signature / Constructor

The class is exported as `TaskManager`.

```typescript
export class TaskManager {
  // ...
}
```

The available sources show conflicting constructor signatures, suggesting different implementations for different use cases.

**In-Memory Constructor**

This version, intended for tracking transient background work, does not require any arguments [Source 2].

```typescript
const tm = new TaskManager();
```

**Persistent Constructor**

This version, used in [Multi-Agent Orchestration](../concepts/multi-agent-orchestration.md), takes a configuration object to specify a directory for persisting task state [Source 1].

```typescript
const tasks = new TaskManager({
  dir: './.tasks',
});
```

### Task Data Structures

The `TaskManager` relies on the following types to define a task's state and properties [Source 2].

**[TaskState](./task-state.md)**

This interface defines the structure of a single task object.

```typescript
export type TaskState = {
  /** Unique task ID (e.g., "a3x7k9m2") */
  id: string;
  /** Task type */
  type: [[[[[[[[TaskType]]]]]]]];
  /** Current lifecycle status */
  status: [[[[[[[[TaskStatus]]]]]]]];
  /** Human-readable description */
  description: string;
  /** When the task was created */
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

**TaskType**

An enumeration of possible task types [Source 2].

```typescript
export type TaskType = "agent" | "bash" | "teammate" | "workflow" | "monitor" | "custom";
```

**TaskStatus**

The lifecycle states a task can be in. The sources describe two slightly different state machines.

*From Source 2:*
```typescript
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "killed";
```
The lifecycle is described as: `pending` → `running` → `completed` | `failed` | `killed`.

*From Source 1:*
The lifecycle is described as: `pending` → `in_progress` → `completed` | `failed`, with an additional transition `pending` → `cancelled`. Note the use of `in_progress` instead of `running`.

## Methods & Properties

The following methods are demonstrated in the source material. Note that method signatures may vary between the in-memory and persistent implementations.

### create

Creates a new task. The sources show two different signatures for this method.

*Signature 1 (In-Memory):* Takes a type and description as arguments [Source 2].
```typescript
create(type: TaskType, description: string): TaskState;
```

*Signature 2 (Persistent):* Takes a configuration object [Source 1].
```typescript
create(options: {
  type: string;
  description: string;
  assignee: string;
  priority: 'high' | 'medium' | 'low';
}): Promise<Task>; // Return type is inferred
```

### transition

Updates the status of an existing task. It can also be used to add data upon completion [Source 1].

```typescript
transition(taskId: string, newStatus: TaskStatus, payload?: { result: unknown }): Promise<void>;
```

### findByStatus

Queries for all tasks that are currently in a specific state [Source 1].

```typescript
findByStatus(status: string): Promise<Task[]>; // Return type is inferred
```

### findByAssignee

Queries for all tasks assigned to a specific agent or worker [Source 1].

```typescript
findByAssignee(assigneeId: string): Promise<Task[]>; // Return type is inferred
```

### getElapsedMs

Returns the elapsed time in milliseconds for a running task [Source 2].

```typescript
getElapsedMs(taskId: string): number;
```

### evictTerminal

Removes tasks that have reached a terminal state (e.g., `completed`, `failed`, `killed`) from the manager to keep the state clean [Source 2].

```typescript
evictTerminal(): void;
```

## Examples

### Persistent Task Management (Multi-Agent)

This example demonstrates the file-based `TaskManager` for creating, updating, and querying persistent tasks shared between agents [Source 1].

```typescript
import { TaskManager, type TaskState } from 'yaaf';

const tasks = new TaskManager({
  dir: './.tasks',
});

// Create a task
const task = await tasks.create({
  type: 'research',
  description: 'Research quantum computing advances in 2024',
  assignee: 'researcher-1',
  priority: 'high',
});

// Update task state
await tasks.transition(task.id, 'in_progress');
await tasks.transition(task.id, 'completed', {
  result: 'Research findings...',
});

// Query tasks
const pending = await tasks.findByStatus('pending');
const mine = await tasks.findByAssignee('researcher-1');
```

### In-Memory Task Lifecycle

This example shows the in-memory `TaskManager` for tracking the lifecycle of a transient background job, including timing and cleanup [Source 2].

```typescript
const tm = new TaskManager();

// Create a task
const task = tm.create('agent', 'Research user query');

// Start it
tm.transition(task.id, 'running');

// Track progress
console.log(tm.getElapsedMs(task.id)); // elapsed time

// Complete it
tm.transition(task.id, 'completed');

// After a timeout, evict terminal tasks
tm.evictTerminal();
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/taskManager.ts