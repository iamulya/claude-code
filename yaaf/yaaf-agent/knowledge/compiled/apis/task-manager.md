---
title: TaskManager
entity_type: api
summary: A class for managing the lifecycle, creation, and cleanup of background tasks within the framework.
export_name: TaskManager
source_file: src/agents/taskManager.ts
category: class
stub: false
compiled_at: 2026-04-16T14:09:33.986Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/multi-agent.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/taskManager.ts
confidence: 1
---

## Overview
The `TaskManager` is a state machine designed to track and manage background work, such as agent runs, shell commands, and complex workflows. It provides a centralized mechanism for monitoring task progress, handling cancellations via `AbortController`, and tracking execution duration including pause support.

Tasks managed by this class are typically stored in a central state store, allowing various components of the framework to observe their status. The manager also handles the eviction of terminal tasks (those that have completed, failed, or been killed) after a specific timeout to maintain system performance.

## Signature / Constructor

### Constructor
```typescript
constructor(options?: { dir: string });
```

### Supporting Types

#### TaskType
Defines the category of the task, which often determines the ID prefix (e.g., `a` for agent, `b` for bash).
```typescript
type TaskType =
  | 'agent'
  | 'bash'
  | 'teammate'
  | 'workflow'
  | 'monitor'
  | 'custom';
```

#### TaskStatus
Represents the current stage of the task lifecycle.
```typescript
type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'killed';
```

#### TaskState
The internal representation of a task's state.
```typescript
type TaskState = {
  id: string;
  type: TaskType;
  status: TaskStatus;
  description: string;
  startTime: number;
  endTime?: number;
  totalPausedMs?: number;
  notified: boolean;
  abortController?: AbortController;
  error?: string;
  metadata?: Record<string, unknown>;
};
```

## Methods & Properties

### create()
Creates a new task and adds it to the tracking system.
*   **Signatures**: 
    *   `create(type: TaskType, description: string): TaskState`
    *   `create(options: { type: string, description: string, assignee?: string, priority?: string }): Promise<TaskState>`
*   **Note**: Source materials show conflicting signatures for this method. The source code extract suggests positional arguments for type and description, while the multi-agent guide suggests an options object that returns a Promise.

### transition()
Moves a task from one state to another.
*   **Signature**: `transition(id: string, status: TaskStatus, metadata?: Record<string, unknown>): Promise<void>`
*   **Usage**: Used to update tasks to `running`, `completed`, `failed`, etc.

### getElapsedMs()
Calculates the total time a task has been active.
*   **Signature**: `getElapsedMs(id: string): number`
*   **Details**: Accounts for `totalPausedMs` to provide an accurate measurement of active execution time.

### evictTerminal()
Removes tasks that have reached a terminal state (`completed`, `failed`, or `killed`) from the active state store.
*   **Signature**: `evictTerminal(): void`

### findByStatus()
Queries the manager for all tasks currently in a specific state.
*   **Signature**: `findByStatus(status: TaskStatus): Promise<TaskState[]>`

### findByAssignee()
Queries the manager for tasks assigned to a specific agent identifier.
*   **Signature**: `findByAssignee(assignee: string): Promise<TaskState[]>`

## Examples

### Basic Task Lifecycle
This example demonstrates creating a task, transitioning it through states, and checking elapsed time.
```typescript
import { TaskManager } from 'yaaf';

const tm = new TaskManager();

// Create a task
const task = tm.create('agent', 'Research user query');

// Start the task
await tm.transition(task.id, 'running');

// Check progress
console.log(`Elapsed: ${tm.getElapsedMs(task.id)}ms`);

// Complete the task
await tm.transition(task.id, 'completed', {
  result: 'Research findings...'
});

// Cleanup terminal tasks
tm.evictTerminal();
```

### Querying Tasks
The `TaskManager` allows filtering tasks by status or assignee for coordination.
```typescript
const tasks = new TaskManager({
  dir: './.tasks',
});

// Find all pending tasks
const pendingTasks = await tasks.findByStatus('pending');

// Find tasks for a specific agent
const researcherTasks = await tasks.findByAssignee('researcher-1');
```

## See Also
*   `AgentOrchestrator` (for high-level agent coordination)
*   `Mailbox` (for inter-agent communication)