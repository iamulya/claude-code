---
title: Agent Subsystem
entity_type: subsystem
summary: The core subsystem responsible for agent execution, task management, and workflow coordination.
primary_files:
  - src/agents/taskManager.ts
exports:
  - TaskManager
  - TaskType
  - TaskStatus
  - TaskState
stub: false
compiled_at: 2026-04-16T14:15:14.513Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/taskManager.ts
confidence: 0.9
---

## Purpose
The Agent Subsystem provides the infrastructure for managing asynchronous background operations within the YAAF framework. It is designed to track various forms of background work, including LLM agent runs, shell command executions, teammate interactions, and multi-step workflows. 

The subsystem ensures that every unit of work has a traceable lifecycle, supports cancellation via standard signals, and provides timing data for performance monitoring.

## Architecture
The subsystem is centered around the `TaskManager` class, which acts as the coordinator for all background activities. 

### Task Identity and Types
Every task is assigned a unique ID, typically generated with a type-specific prefix to identify its origin:
*   `a`: Agent runs
*   `b`: Bash/Shell commands
*   `t`: Teammate interactions
*   `w`: Workflows

The framework supports several built-in `TaskType` values: `agent`, `bash`, `teammate`, `workflow`, `monitor`, and `custom`.

### Lifecycle Management
Tasks follow a defined state machine represented by the `TaskStatus` type:
1.  **pending**: The task is created but not yet executing.
2.  **running**: The task is currently active.
3.  **completed**: The task finished successfully.
4.  **failed**: The task encountered an error.
5.  **killed**: The task was manually terminated.

### Task State
The `TaskState` object maintains the metadata for each operation, including:
*   **Timing**: `startTime`, `endTime`, and `totalPausedMs` for accurate duration tracking.
*   **Control**: An `AbortController` instance used to signal cancellation to the underlying process.
*   **Observability**: A human-readable description and a metadata bag for arbitrary key-value pairs.

## Integration Points
The Agent Subsystem interacts with the broader application state through the following mechanisms:
*   **Central State Store**: Tasks are stored in `AppState.tasks`, allowing any component (such as a CLI or Web UI) to observe task progress in real-time.
*   **Notification System**: The `notified` flag in the task state tracks whether the system has alerted the user or leader of a task's completion.
*   **Cleanup**: The system implements an eviction policy where terminal tasks (completed, failed, or killed) are removed from the active state after a display timeout.

## Key APIs
The `TaskManager` provides the primary interface for task interaction:

*   `create(type: TaskType, description: string)`: Initializes a new task and returns its `TaskState`.
*   `transition(id: string, status: TaskStatus)`: Updates the lifecycle state of a specific task.
*   `getElapsedMs(id: string)`: Calculates the total time the task has been active, accounting for any pauses.
*   `evictTerminal()`: Purges tasks that have reached a terminal state from the internal registry.

### Example Usage
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

// After TERMINAL_DISPLAY_MS, evict
tm.evictTerminal();
```

## Extension Points
The subsystem allows for extension through the `custom` task type, enabling developers to use the `TaskManager` infrastructure for domain-specific background processes not covered by the default types. Metadata can be attached to `TaskState` to store additional context required by these custom implementations.