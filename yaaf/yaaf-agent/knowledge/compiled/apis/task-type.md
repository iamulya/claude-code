---
summary: Defines the possible types of tasks managed by the TaskManager, such as 'agent', 'bash', 'teammate', 'workflow', 'monitor', and 'custom'.
export_name: TaskType
source_file: src/agents/taskManager.ts
category: type
title: TaskType
entity_type: api
search_terms:
 - task type enum
 - agent task categories
 - what kind of tasks can yaaf run
 - bash task type
 - workflow task type
 - teammate task type
 - custom task type
 - monitor task type
 - TaskState type field
 - background work types
 - task lifecycle management
 - task id prefix
stub: false
compiled_at: 2026-04-24T17:43:42.488Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/taskManager.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`TaskType` is a TypeScript string literal type that categorizes the different kinds of background work managed by the `TaskManager` [Source 1]. Every task tracked by the system is assigned one of these types, which is stored in the `type` property of its `[[[[[[[[TaskState]]]]]]]]` object [Source 1].

The `TaskType` is used to identify the nature of a task. For example, it distinguishes between a task running a shell command (`bash`) and one executing an agent run (`agent`). The `TaskManager`'s design rationale notes that task IDs are often prefixed with a letter corresponding to their type (e.g., `a` for agent, `b` for bash) [Source 1].

## Signature

The `TaskType` is defined as a union of string literals [Source 1]:

```typescript
export type TaskType = "agent" | "bash" | "teammate" | "workflow" | "monitor" | "custom";
```

### Values

- **`agent`**: A task representing a full agent run.
- **`bash`**: A task executing a shell command.
- **`teammate`**: A task involving another agent in a multi-[Agent Collaboration](../subsystems/agent-collaboration.md).
- **`workflow`**: A task that orchestrates a series of other tasks or steps.
- **`monitor`**: A task for monitoring a system or process.
- **`custom`**: A placeholder for any other user-defined task type.

## Examples

`TaskType` is used [when](./when.md) creating a new task with the `TaskManager` and is a required field in the `TaskState` object.

### Creating a Task

Here, `'agent'` is passed as the `TaskType` to the `create` method of a `TaskManager` instance.

```typescript
import { TaskManager, TaskType } from 'yaaf';

const tm = new TaskManager();

// Create a task of type 'agent'
const task = tm.create('agent', 'Research the YAAF framework');

console.log(task.type); // Outputs: 'agent'
```

### Defining a TaskState Object

The `type` property of a `TaskState` object must be one of the values from `TaskType`.

```typescript
import { TaskState, TaskType } from 'yaaf';

const bashTaskState: TaskState = {
  id: 'b1a2b3c4',
  type: 'bash', // This must be a valid TaskType
  status: 'pending',
  description: 'List files in current directory',
  startTime: Date.now(),
  notified: false,
};
```

## See Also

- `TaskManager`: The class that creates and manages the lifecycle of tasks.
- `TaskState`: The interface describing the state of a single task, which includes the `TaskType`.

## Sources

[Source 1] `src/agents/taskManager.ts`