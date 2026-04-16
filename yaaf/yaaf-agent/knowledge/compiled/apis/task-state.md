---
title: TaskState
entity_type: api
summary: The interface representing the current state, metadata, and lifecycle status of a managed task.
export_name: TaskState
source_file: src/agents/taskManager.ts
category: type
stub: false
compiled_at: 2026-04-16T14:15:09.223Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/taskManager.ts
confidence: 1
---

## Overview
`TaskState` is a core data structure used to track the lifecycle, execution metadata, and current status of background operations within the YAAF framework. It is designed to support various types of work, including agent runs, shell commands (bash), and complex workflows.

Tasks are typically managed by a central manager and stored in the application state, allowing different components to observe their progress. The state includes support for duration tracking with pause intervals and provides an `AbortController` for task cancellation.

## Signature / Constructor

```typescript
export type TaskState = {
  /** Unique task ID (e.g., "a3x7k9m2") */
  id: string
  /** Task type */
  type: TaskType
  /** Current lifecycle status */
  status: TaskStatus
  /** Human-readable description */
  description: string
  /** When the task was created */
  startTime: number
  /** When the task reached a terminal state */
  endTime?: number
  /** Total time spent paused (for accurate elapsed time) */
  totalPausedMs?: number
  /** Whether the leader/UI has been notified of completion */
  notified: boolean
  /** Abort controller for cancellation */
  abortController?: AbortController
  /** Optional error message on failure */
  error?: string
  /** Custom metadata bag */
  metadata?: Record<string, unknown>
}

export type TaskType =
  | 'agent'
  | 'bash'
  | 'teammate'
  | 'workflow'
  | 'monitor'
  | 'custom'

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'killed'
```

## Methods & Properties

### Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | A unique identifier for the task, often using a type-specific prefix (e.g., `b` for bash, `a` for agent). |
| `type` | `TaskType` | Categorizes the task (e.g., `agent`, `bash`, `workflow`). |
| `status` | `TaskStatus` | The current lifecycle phase of the task. |
| `description` | `string` | A human-readable string describing the work being performed. |
| `startTime` | `number` | The timestamp (ms) when the task was initialized. |
| `endTime` | `number` | (Optional) The timestamp (ms) when the task reached a terminal state (`completed`, `failed`, or `killed`). |
| `totalPausedMs` | `number` | (Optional) Cumulative time the task spent in a paused state, used to calculate accurate active duration. |
| `notified` | `boolean` | Indicates if the system has already signaled the task's completion to the user interface or orchestrator. |
| `abortController` | `AbortController` | (Optional) An instance used to trigger cancellation of the underlying operation. |
| `error` | `string` | (Optional) A descriptive message populated if the task status transitions to `failed`. |
| `metadata` | `Record<string, unknown>` | (Optional) A key-value store for arbitrary data associated with the task. |

## Examples

### Basic Task State Object
```typescript
const agentTask: TaskState = {
  id: "a9f2d1x0",
  type: "agent",
  status: "running",
  description: "Analyzing market trends",
  startTime: Date.now(),
  notified: false,
  metadata: {
    model: "gpt-4",
    priority: "high"
  }
};
```

### Failed Task State
```typescript
const failedTask: TaskState = {
  id: "b5k3m8z1",
  type: "bash",
  status: "failed",
  description: "npm install",
  startTime: 1715000000000,
  endTime: 1715000005000,
  notified: true,
  error: "EACCES: permission denied, access '/usr/local/lib/node_modules'"
};
```