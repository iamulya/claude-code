---
summary: A mechanism for agents to schedule one-shot or recurring tasks using standard cron expressions, persisted across restarts.
title: Cron Scheduling
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:40:58.102Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/vigil.ts
confidence: 1
---

---
title: Cron Scheduling
entity_type: concept
summary: A mechanism for agents to schedule one-shot or recurring tasks using standard cron expressions, persisted across restarts.
related_subsystems:
  - Vigil

## What It Is
Cron Scheduling is a core feature of the Vigil autonomous execution engine in YAAF. It allows agents to perform work at specific times or on recurring intervals using standard 5-field cron expressions. Unlike the tick-driven autonomous loop, which wakes the agent at a fixed frequency, Cron Scheduling enables precise, time-based task execution.

This mechanism solves the problem of time-dependency in autonomous agents, allowing them to handle background maintenance, periodic reporting, or delayed actions without requiring continuous user input or manual polling.

## How It Works in YAAF
Cron Scheduling is implemented as part of the Vigil subsystem. The scheduler manages a collection of tasks that are persisted to disk, ensuring that scheduled work survives application restarts.

### Task Structure
Scheduled work is defined by the `ScheduledTask` type, which includes:
- **ID**: A unique identifier for the task.
- **Cron Expression**: A standard 5-field string representing the schedule in local time.
- **Prompt**: The specific instruction or context injected into the agent when the task fires.
- **Persistence State**: Metadata including creation time, last fire time, and whether the task is recurring or permanent.

### Execution Lifecycle
1.  **Registration**: Tasks are added to the scheduler via the `schedule` (recurring) or `scheduleOnce` (one-shot) methods.
2.  **Persistence**: The task is written to the configured `storageDir` (defaulting to `./.vigil`).
3.  **Monitoring**: The Vigil engine monitors the system clock against the `nextCronRunMs` calculated for each task.
4.  **Firing**: When a task's cron expression matches the current time, the engine emits a `cron:fire` event and dispatches the task's prompt to the agent.
5.  **Cleanup**: One-shot tasks are removed after firing. Recurring tasks are updated with their `lastFiredAt` timestamp. Recurring tasks may be subject to auto-expiry based on the `recurringMaxAgeMs` setting unless marked as `permanent`.

## Configuration
Cron Scheduling is configured through the `VigilConfig` object when initializing a Vigil agent.

```typescript
export type ScheduledTask = {
  id: string
  cron: string
  prompt: string
  createdAt: number
  lastFiredAt?: number
  recurring: boolean
  permanent?: boolean
}

const agent = new Vigil({
  systemPrompt: 'You are a proactive assistant.',
  storageDir: './data/agent-tasks', // Custom persistence directory
  recurringMaxAgeMs: 86400000,      // Expire recurring tasks after 24 hours
});
```

### Scheduling Tasks
Developers can schedule tasks programmatically before or after the agent has started.

```ts
// Schedule a recurring task: Check PRs every hour
agent.schedule('0 * * * *', 'Check for new PR reviews and notify the team.');

// Schedule a one-shot task: Run 5 minutes from now
const inFive = new Date(Date.now() + 5 * 60_000);
agent.scheduleOnce(
  `${inFive.getMinutes()} ${inFive.getHours()} * * *`,
  'Initial orientation run — summarise open PRs.',
);

await agent.start();
```

### Event Handling
The framework provides hooks to react to scheduled task execution via the `cron:fire` event.

```ts
agent.on('cron:fire', ({ task, response }) => {
  console.log(`Task ${task.id} fired. Agent response: ${response}`);
});
```

## See Also
- Vigil Subsystem
- Autonomous Loop
- Session Journal