---
summary: A class for managing and executing scheduled tasks and standing orders for proactive agent interaction.
export_name: Heartbeat
source_file: src/automation/heartbeat.ts
category: class
title: Heartbeat
entity_type: api
stub: false
compiled_at: 2026-04-16T14:15:54.751Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/automation/heartbeat.ts
confidence: 0.98
---

## Overview
The `Heartbeat` class enables agents to perform proactive operations rather than just responding to user input. It facilitates the scheduling of recurring tasks (similar to cron jobs) and the maintenance of "standing orders"—persistent instructions that the agent evaluates or incorporates into its scheduled runs.

This system is designed for use cases such as morning briefings, periodic status checks, or automated outreach. It is inspired by the heartbeat systems found in OpenClaw, traditional cron utilities, and the concept of standing orders in operational environments.

## Signature / Constructor

### Constructor
The `Heartbeat` class is initialized with a configuration object that defines how the agent is invoked and how its output is handled.

```typescript
constructor(config: HeartbeatConfig)
```

### HeartbeatConfig
| Property | Type | Description |
| :--- | :--- | :--- |
| `agent` | `{ run(input: string, signal?: AbortSignal): Promise<string> }` | The agent instance or runner to invoke for scheduled tasks. |
| `onOutput` | `(text: string, task: ScheduledTask) => Promise<void>` | Callback executed when an agent successfully returns output from a task. |
| `onError` | `(error: Error, task: ScheduledTask) => void` | (Optional) Callback executed when a scheduled task fails. |
| `checkIntervalMs` | `number` | (Optional) How often the heartbeat evaluates schedules, in milliseconds. Defaults to `60000` (1 minute). |

## Methods & Properties

### Methods
*   **`addTask(task: ScheduledTask): void`**: Registers a new recurring task with the heartbeat manager.
*   **`addStandingOrder(order: StandingOrder): void`**: Registers a persistent instruction that can be prepended to scheduled prompts or run independently.
*   **`start(): void`**: Begins the heartbeat execution loop based on the configured `checkIntervalMs`.
*   **`stop(): void`**: (Inferred) Stops the heartbeat execution loop.

### Supporting Types

#### ScheduledTask
Represents a specific task to be executed on a cron-based schedule.
*   `id`: Unique task identifier.
*   `schedule`: Cron expression (e.g., `'0 8 * * *'` for daily at 8am).
*   `prompt`: The specific prompt to send to the agent.
*   `active`: Boolean indicating if the task should currently run.
*   `onlyIfRelevant`: (Optional) If true, only sends output if the agent deems the result relevant.
*   `timeoutMs`: (Optional) Maximum time to wait for agent execution before aborting.
*   `lastRun`: (Optional) Timestamp of the last execution.
*   `lastResult`: (Optional) The result string from the last execution.

#### StandingOrder
Represents persistent instructions that modify agent behavior during scheduled tasks.
*   `id`: Unique order identifier.
*   `instruction`: The instruction text to be prepended to scheduled prompts.
*   `active`: Boolean indicating if the order is active.
*   `schedule`: (Optional) If provided, the standing order runs independently on this schedule.
*   `createdAt`: Timestamp of when the order was created.

## Examples

### Basic Scheduling and Standing Orders
This example demonstrates setting up a morning briefing task that is influenced by a persistent standing order to check email.

```typescript
const heartbeat = new Heartbeat({
  agent: myAgentRunner,
  onOutput: async (text, task) => {
    await gateway.send({ 
      text, 
      channelName: 'telegram', 
      recipientId: 'user123' 
    });
  },
});

// Morning briefing at 8am daily
heartbeat.addTask({
  id: 'morning-brief',
  schedule: '0 8 * * *',
  prompt: 'Generate my morning briefing. Check calendar, weather, and tasks.',
  active: true
});

// Standing order: always check email before briefings
heartbeat.addStandingOrder({
  id: 'email-check',
  instruction: 'Before any briefing, check my email for urgent items.',
  active: true,
  createdAt: Date.now()
});

heartbeat.start();
```