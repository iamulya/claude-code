---
summary: The framework capability allowing agents to initiate actions or communications based on time-based triggers rather than reactive user input.
title: Proactive Scheduling
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:16:03.905Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/automation/heartbeat.ts
confidence: 0.9
---

---
title: Proactive Scheduling
entity_type: concept
summary: The framework capability allowing agents to initiate actions or communications based on time-based triggers rather than reactive user input.
related_subsystems:
  - automation

## What It Is
Proactive Scheduling is a core capability in YAAF that enables agents to transition from purely reactive entities to autonomous actors capable of time-based execution. While standard LLM agents typically wait for a user prompt to trigger a response, Proactive Scheduling allows the framework to initiate agent runs based on predefined schedules, recurring tasks, or persistent instructions known as "Standing Orders."

This concept solves the need for automated workflows such as morning briefings, periodic system health checks, or scheduled data synthesis without requiring manual human intervention. It is inspired by traditional cron jobs and the heartbeat systems found in frameworks like OpenClaw.

## How It Works in YAAF
Proactive Scheduling is primarily implemented through the `Heartbeat` system located in the `automation/heartbeat` module. The system functions by maintaining a registry of tasks and orders, evaluating their execution conditions at a regular interval.

### Core Components
The mechanism relies on three primary structures:

1.  **Heartbeat**: The central orchestrator that manages the execution loop. It requires an agent instance and an `onOutput` handler to route the agent's generated responses to the appropriate destination (e.g., a messaging gateway).
2.  **ScheduledTask**: A specific instruction paired with a cron expression (e.g., `0 8 * * *`). When the schedule matches the current time, the `Heartbeat` sends the task's prompt to the agent.
3.  **Standing Order**: Persistent instructions that can either be prepended to every scheduled task's prompt to provide consistent context or run independently on their own schedules.

### Execution Logic
The `Heartbeat` system operates on a configurable `checkIntervalMs` (defaulting to 60,000ms). During each interval, the system:
*   Evaluates all active `ScheduledTask` and `StandingOrder` entries.
*   Determines if a task is due for execution using cron logic.
*   Invokes the agent's `run` method with the associated prompt and any relevant standing orders.
*   Processes the output through the `onOutput` callback, which can optionally filter results using the `onlyIfRelevant` flag to ensure the agent only communicates when it has meaningful information.

## Configuration
Developers configure Proactive Scheduling by instantiating a `Heartbeat` with a `HeartbeatConfig` object. This configuration defines how the agent is invoked and how its outputs and errors are handled.

```typescript
const heartbeat = new Heartbeat({
  agent: myAgentRunner,
  onOutput: async (text, task) => {
    // Logic to route agent output to a specific channel
    await gateway.send({ text, recipientId: 'user123' });
  },
  checkIntervalMs: 60000, // Check schedules every minute
});

// Adding a recurring task
heartbeat.addTask({
  id: 'morning-brief',
  schedule: '0 8 * * *', // Daily at 8am
  prompt: 'Generate my morning briefing. Check calendar, weather, and tasks.',
  active: true,
  onlyIfRelevant: true
});

// Adding a standing order to influence all tasks
heartbeat.addStandingOrder({
  id: 'style-guide',
  instruction: 'Always keep briefings concise and use bullet points.',
  active: true
});

heartbeat.start();
```

### Sources
* `src/automation/heartbeat.ts`