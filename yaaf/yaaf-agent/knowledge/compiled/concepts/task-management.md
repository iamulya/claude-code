---
title: Task Management
entity_type: concept
summary: The pattern for tracking, managing, and canceling background work such as agent runs, shell commands, and workflows.
stub: false
compiled_at: 2026-04-16T14:15:06.860Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/taskManager.ts
confidence: 0.95
---

---
title: "Task Management"
entity_type: "concept"
summary: "The pattern for tracking, managing, and canceling background work such as agent runs, shell commands, and workflows."
related_subsystems:
  - "agents"
  - "state"

## What It Is
Task Management in YAAF is the centralized pattern for tracking and controlling asynchronous background operations. It provides a unified interface for managing the lifecycle of various activities, including agent executions, shell commands (bash), and complex workflows. 

The primary purpose of Task Management is to ensure that long-running operations are observable by the system and the user, can be programmatically canceled, and maintain accurate timing data even when paused. By centralizing these operations, YAAF allows any component in the system to monitor the status of work being performed across different subsystems.

## How It Works in YAAF
Task Management is implemented via the `TaskManager` class and a standardized `TaskState` structure. Tasks are stored in a central state store (`AppState.tasks`), making them globally accessible for UI rendering or system monitoring.

### Task Identification and Types
Every task is assigned a unique ID, which typically includes a type prefix to identify the nature of the work:
*   `a`: Agent runs
*   `b`: Bash/shell commands
*   `t`: Teammate interactions
*   `w`: Workflows

The framework supports several built-in task types: `agent`, `bash`, `teammate`, `workflow`, `monitor`, and `custom`.

### Lifecycle and Status
Tasks progress through a defined set of lifecycle states:
1.  **pending**: The task is created but has not yet started.
2.  **running**: The task is currently executing.
3.  **completed**: The task finished successfully.
4.  **failed**: The task encountered an error.
5.  **killed**: The task was explicitly terminated by the system or user.

States such as `completed`, `failed`, and `killed` are considered "terminal" states. To prevent memory leaks and state bloat, terminal tasks are automatically evicted from the state store after a specific display timeout.

### Cancellation and Timing
Each task can be associated with an `AbortController`. This allows the `TaskManager` to trigger a cancellation signal that the underlying operation (such as a shell command or an LLM request) can listen for and respect.

The framework also tracks duration using `startTime` and `endTime`. It supports sophisticated timing that accounts for pauses via `totalPausedMs`, ensuring that elapsed time calculations reflect actual active work time.

## Configuration
Developers interact with Task Management by instantiating a `TaskManager` and using its transition methods to move tasks through their lifecycle.

### Task State Structure
The `TaskState` object defines the schema for all tracked work:

```typescript
export type TaskState = {
  id: string
  type: TaskType
  status: TaskStatus
  description: string
  startTime: number
  endTime?: number
  totalPausedMs?: number
  notified: boolean
  abortController?: AbortController
  error?: string
  metadata?: Record<string, unknown>
}
```

### Usage Example
The following example demonstrates creating, running, and completing a task:

```typescript
const tm = new TaskManager();

// Create a task for an agent operation
const task = tm.create('agent', 'Research user query');

// Transition to running state
tm.transition(task.id, 'running');

// Retrieve elapsed time (accounting for pauses)
const elapsed = tm.getElapsedMs(task.id);

// Transition to a terminal state
tm.transition(task.id, 'completed');

// Clean up terminal tasks from the state store
tm.evictTerminal();
```

## Sources
* `src/agents/taskManager.ts`