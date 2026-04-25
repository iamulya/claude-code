---
title: Proactive Scheduling
summary: The ability for YAAF agents to initiate actions, run tasks, or communicate with users on a predefined, recurring schedule.
entity_type: concept
related_subsystems:
 - subsystems/automation-system
see_also:
 - apis/heartbeat
 - apis/scheduled-task
 - concepts/cron-expression
 - subsystems/automation-system
search_terms:
 - scheduled agent tasks
 - recurring agent actions
 - cron jobs for agents
 - how to make agent run on a schedule
 - proactive agent behavior
 - standing orders
 - automated agent tasks
 - time-based triggers for agents
 - agent automation
 - periodic tasks
 - scheduled prompts
 - YAAF cron
stub: false
compiled_at: 2026-04-25T00:23:16.753Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/automation/heartbeat.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Proactive Scheduling is a core concept in YAAF that enables an agent to move beyond a purely reactive model and initiate actions based on time. Instead of only responding to direct user input, an agent can be configured to perform tasks on a recurring schedule, similar to a traditional cron job [Source 1]. This allows for use cases such as sending daily briefings, running periodic maintenance tasks, or regularly checking external data sources.

The mechanism also supports "standing orders," which are persistent instructions that can be prepended to scheduled task prompts, ensuring consistent behavior for automated actions [Source 1]. This capability is managed by the [Automation System](../subsystems/automation-system.md) and is inspired by systems like cron and the "heartbeat" systems found in other automation frameworks [Source 1].

## How It Works in YAAF

The primary implementation of Proactive Scheduling is the [Heartbeat](../apis/heartbeat.md) class. A `Heartbeat` instance orchestrates the scheduling and execution of tasks for a specific agent [Source 1].

The process involves several key components:

1.  **Heartbeat Instance**: A developer creates a `Heartbeat` instance, providing it with an agent runner and callbacks to handle the agent's output (`onOutput`) and any errors (`onError`) [Source 1].
2.  **Scheduled Tasks**: Tasks are defined as [ScheduledTask](../apis/scheduled-task.md) objects and added to the `Heartbeat` instance. Each task has a unique ID, a schedule defined by a [Cron Expression](./cron-expression.md), and a prompt to be executed by the agent [Source 1].
3.  **Tick Interval**: The `Heartbeat` service runs on a regular interval (defaulting to 60,000 ms) to check if any tasks are due. This is configured via the `checkIntervalMs` property [Source 1].
4.  **Execution**: When the `Heartbeat` tick determines a task's [Cron Expression](./cron-expression.md) matches the current time, it invokes the configured agent's `run` method with the task's prompt. The agent's output is then passed to the `onOutput` callback [Source 1].
5.  **Standing Orders**: Developers can also add `StandingOrder` objects. These contain instructions that are automatically prepended to the prompts of scheduled tasks, allowing for consistent, high-level directives to be applied to all automated actions [Source 1].
6.  **Concurrency Control**: To prevent a long-running task from being triggered again before it completes, each [ScheduledTask](../apis/scheduled-task.md) has an internal `_running` flag that acts as an execution lock [Source 1].
7.  **Task Management**: Tasks can be configured with a `timeoutMs` to prevent them from running indefinitely. They can also be set to `onlyIfRelevant`, which allows the agent to decide whether its output is significant enough to be sent to the `onOutput` handler [Source 1].

## Configuration

Proactive Scheduling is configured by instantiating and setting up the [Heartbeat](../apis/heartbeat.md) class. This involves defining the agent to run, the schedule for tasks, and the actions to take with the results.

The following example demonstrates how to schedule a daily morning briefing and apply a standing order to always check for urgent emails first.

```typescript
// Example of configuring Proactive Scheduling
import { Heartbeat } from 'yaaf-agent';

// Assume myAgentRunner and gateway are defined elsewhere
const myAgentRunner = {
  async run(input: string, signal?: AbortSignal): Promise<string> {
    // Agent execution logic...
    return `Briefing based on: ${input}`;
  }
};
const gateway = {
  async send({ text, channelName, recipientId }) {
    console.log(`Sending to ${channelName}:${recipientId}: ${text}`);
  }
};

// 1. Create a Heartbeat instance
const heartbeat = new Heartbeat({
  agent: myAgentRunner,
  onOutput: async (text, task) => {
    console.log(`Task ${task.id} completed.`);
    await gateway.send({ text, channelName: 'telegram', recipientId: 'user123' });
  },
  onError: (error, task) => {
    console.error(`Task ${task.id} failed:`, error);
  },
  checkIntervalMs: 60000, // Check every minute
});

// 2. Add a scheduled task to run at 8am every day
heartbeat.addTask({
  id: 'morning-brief',
  schedule: '0 8 * * *', // Cron expression for 8:00 AM
  prompt: 'Generate my morning briefing. Check calendar, weather, and tasks.',
  active: true,
  timeoutMs: 120000, // 2-minute timeout
});

// 3. Add a standing order to apply to scheduled tasks
heartbeat.addStandingOrder({
  id: 'email-check',
  instruction: 'Before any briefing, check my email for urgent items.',
  active: true,
});

// 4. Start the scheduling service
heartbeat.start();

console.log('Heartbeat service started for proactive scheduling.');
```
[Source 1]

## See Also

*   [Heartbeat](../apis/heartbeat.md): The primary API for implementing Proactive Scheduling.
*   [ScheduledTask](../apis/scheduled-task.md): The API object representing a single scheduled action.
*   [Cron Expression](./cron-expression.md): The concept used to define recurring schedules.
*   [Automation System](../subsystems/automation-system.md): The subsystem responsible for proactive agent behaviors.

## Sources

[Source 1]: src/automation/heartbeat.ts