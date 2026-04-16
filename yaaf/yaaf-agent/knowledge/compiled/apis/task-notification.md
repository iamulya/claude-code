---
summary: A structured payload used by worker agents to report task results back to the coordinator.
export_name: TaskNotification
source_file: src/agents/coordinator.ts
category: type
title: TaskNotification
entity_type: api
stub: false
compiled_at: 2026-04-16T14:13:15.553Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/coordinator.ts
confidence: 1
---

## Overview
`TaskNotification` is a TypeScript type that defines the communication contract between a worker agent and a coordinator agent. It is a core component of the framework's "Coordinator Mode," a multi-agent pattern where a central coordinator delegates work to specialized worker agents. 

When a worker agent finishes a task, it uses this structured format to report its status, a summary of its actions, and optional execution metrics back to the coordinator. This allows the coordinator to synthesize results or decide on subsequent steps.

## Signature / Constructor

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

| Property | Type | Description |
| :--- | :--- | :--- |
| `taskId` | `string` | The unique identifier for the specific task being reported. |
| `status` | `TaskStatus` | The final state of the task: `completed`, `failed`, or `killed`. |
| `summary` | `string` | A concise, human-readable (or coordinator-readable) description of what the worker accomplished or where it encountered issues. |
| `result` | `string` (optional) | The detailed output or raw data produced by the worker. |
| `usage` | `object` (optional) | Metadata regarding the resources consumed during the task. |
| `usage.totalTokens` | `number` | The total number of LLM tokens used by the worker for this task. |
| `usage.toolUses` | `number` | The number of times the worker invoked tools. |
| `usage.durationMs` | `number` | The total execution time of the task in milliseconds. |

## Examples

### Handling a Task Notification
In a coordinator-worker setup, the coordinator listens for these notifications to track progress.

```typescript
coordinator.on('worker:completed', (notif: TaskNotification) => {
  console.log(`Worker ${notif.taskId} finished with status: ${notif.status}`);
  console.log(`Summary: ${notif.summary}`);
  
  if (notif.usage) {
    console.log(`Tokens used: ${notif.usage.totalTokens}`);
  }
});
```

### Constructing a Notification
While typically handled internally by the `WorkerAgent`, a notification follows this structure:

```typescript
const report: TaskNotification = {
  taskId: "research-task-42",
  status: "completed",
  summary: "Successfully retrieved documentation for the requested API.",
  result: "The API supports GET and POST on the /v1/data endpoint...",
  usage: {
    totalTokens: 850,
    toolUses: 1,
    durationMs: 1200
  }
};
```

## Sources
- `src/agents/coordinator.ts`