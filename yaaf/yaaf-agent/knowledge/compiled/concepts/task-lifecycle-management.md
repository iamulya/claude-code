---
title: Task Lifecycle Management
entity_type: concept
summary: The process of defining, tracking, and transitioning tasks through various states within an agent system.
related_subsystems:
 - Multi-Agent Orchestration
search_terms:
 - agent task state
 - managing agent work
 - task state machine
 - YAAF TaskManager
 - how to assign tasks to agents
 - tracking agent progress
 - multi-agent task coordination
 - pending in_progress completed
 - task queue for agents
 - delegating work to agents
 - task status updates
 - failed tasks in agents
stub: false
compiled_at: 2026-04-24T18:03:14.435Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md
compiled_from_quality: documentation
confidence: 0.98
---

## What It Is
Task Lifecycle Management is the formal process for creating, assigning, tracking, and resolving units of work, known as tasks, within a YAAF multi-agent system. In complex agent swarms where a leader agent delegates work to multiple specialist agents, a structured task management system is essential for coordination, progress monitoring, and ensuring that the results of sub-tasks are properly handled [Source 1]. It provides a persistent, queryable record of all work, preventing tasks from being lost and enabling robust error handling and recovery.

## How It Works in YAAF
In YAAF, this concept is implemented through the `TaskManager` class, which acts as a state machine for the entire lifecycle of a task [Source 1]. It provides a persistent, file-based system for managing task state.

The core operations of the `TaskManager` include:
*   **Creation**: New tasks are created with `tasks.create()`, specifying details such as a description, an assignee agent, and a priority level [Source 1].
*   **State Transition**: The state of a task is explicitly changed using `tasks.transition()`. For example, a task can be moved from `pending` to `in_progress`, and finally to `completed` with an associated result payload [Source 1].
*   **Querying**: The system allows for retrieving tasks based on their current status (e.g., `findByStatus('pending')`) or by their assigned agent (`findByAssignee('researcher-1')`) [Source 1].

### Task States
The `TaskManager` enforces a specific set of state transitions for each task. A task begins in the `pending` state and can move through the following lifecycle [Source 1]:

*   `pending` → `in_progress` → `completed`
*   `pending` → `in_progress` → `failed`
*   `pending` → `cancelled`

This structured flow ensures that the status of any given task is always clear and follows a predictable path from creation to resolution.

## Configuration
The `TaskManager` is configured by instantiating it with a directory path where task data will be persisted. This allows task states to survive application restarts [Source 1].

```typescript
import { TaskManager } from 'yaaf';

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
```

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md