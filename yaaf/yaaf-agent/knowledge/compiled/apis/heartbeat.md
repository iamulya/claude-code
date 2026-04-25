---
summary: A class enabling proactive scheduling, recurring tasks, and standing orders for YAAF agents.
export_name: Heartbeat
source_file: src/automation/heartbeat.ts
category: class
title: Heartbeat
entity_type: api
search_terms:
 - scheduled tasks for agents
 - recurring agent jobs
 - cron jobs for LLM
 - proactive agent behavior
 - standing orders
 - persistent agent instructions
 - how to make agent run on a schedule
 - agent automation
 - time-based triggers
 - scheduled prompts
 - agent background tasks
 - OpenClaw heartbeat
stub: false
compiled_at: 2026-04-24T17:11:36.459Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/automation/heartbeat.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `Heartbeat` class provides a mechanism for agents to perform actions proactively based on a schedule. It enables recurring tasks, such as sending a daily briefing, and the concept of "standing orders"—persistent instructions that are regularly checked and applied to tasks [Source 1].

This functionality is inspired by cron jobs and similar systems in other agent frameworks like OpenClaw. It is used [when](./when.md) an agent needs to initiate contact with a user or perform background tasks without being prompted for each execution [Source 1].

## Constructor

The `Heartbeat` class is instantiated with a configuration object that defines the agent to run, how to handle outputs and errors, and the checking interval [Source 1].

```typescript
import { Heartbeat, HeartbeatConfig } from 'yaaf';

// AgentRunner must have a `run` method
const myAgentRunner = {
  async run(input: string): Promise<string> {
    // ... agent logic
    return `Output for: ${input}`;
  }
};

const config: HeartbeatConfig = {
  agent: myAgentRunner,
  onOutput: async (text, task) => {
    console.log(`Task ${task.id} produced: ${text}`);
  },
  onError: (error, task) => {
    console.error(`Task ${task.id} failed:`, error);
  },
  checkIntervalMs: 60000, // Check every minute
};

const heartbeat = new Heartbeat(config);
```

### `HeartbeatConfig`

The constructor accepts a single configuration object with the following properties:

| Property          | Type                                                          | Description                                                                                             |
| ----------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `agent`           | `{ run(input: string, signal?: AbortSignal): Promise<string> }` | **Required.** The agent instance to invoke for scheduled tasks. It must have an async `run` method.     |
| `onOutput`        | `(text: string, task: ScheduledTask) => Promise<void>`        | **Required.** A callback function invoked with the agent's output after a successful scheduled run.     |
| `onError`         | `(error: Error, task: ScheduledTask) => void`                 | **Optional.** A callback function invoked when a scheduled task encounters an error.                    |
| `checkIntervalMs` | `number`                                                      | **Optional.** The interval in milliseconds at which to check for tasks ready to run. Defaults to 60000. |

[Source 1]

## Methods & Properties

While the source material is a signature-only extract, the provided examples and types imply the existence of the following public methods [Source 1].

### `addTask`

Adds a new scheduled task to the heartbeat.

**Signature**
```typescript
addTask(task: ScheduledTask): void;
```

**Parameters**
The `task` object conforms to the `ScheduledTask` type:

| Property        | Type      | Description                                                                                                                            |
| --------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | `string`  | A unique identifier for the task.                                                                                                      |
| `schedule`      | `string`  | A [Cron Expression](../concepts/cron-expression.md) defining when the task should run (e.g., `'0 8 * * *'` for 8:00 AM daily).                                           |
| `prompt`        | `string`  | The prompt to send to the agent when the task executes.                                                                                |
| `active`        | `boolean` | Whether the task is currently active and should be run on schedule.                                                                    |
| `onlyIfRelevant`| `boolean` | **Optional.** If true, only sends output if the agent deems it relevant.                                                               |
| `timeoutMs`     | `number`  | **Optional.** The maximum time in milliseconds to wait for the agent to respond before aborting the task.                               |
| `lastRun`       | `number`  | The timestamp of the last execution. Managed internally.                                                                               |
| `lastResult`    | `string`  | The result from the last execution. Managed internally.                                                                                |

[Source 1]

### `addStandingOrder`

Adds a new standing order. Standing orders are instructions that are prepended to the prompts of scheduled tasks.

**Signature**
```typescript
addStandingOrder(order: StandingOrder): void;
```

**Parameters**
The `order` object conforms to the `StandingOrder` type:

| Property      | Type      | Description                                                                                             |
| ------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `id`          | `string`  | A unique identifier for the standing order.                                                             |
| `instruction` | `string`  | The instruction text that gets prepended to scheduled prompts.                                          |
| `active`      | `boolean` | Whether the order is currently active.                                                                  |
| `schedule`    | `string`  | **Optional.** If set, this order runs independently on its own schedule instead of modifying other tasks. |
| `createdAt`   | `number`  | The timestamp when the order was created.                                                               |

[Source 1]

### `start`

Starts the heartbeat, beginning the interval checks for scheduled tasks.

**Signature**
```typescript
start(): void;
```

## Examples

The following example demonstrates creating a `Heartbeat` instance, adding a daily scheduled task, adding a standing order to modify its behavior, and starting the process.

```typescript
// Assume myAgentRunner and a gateway for sending messages are defined
const heartbeat = new Heartbeat({
  agent: myAgentRunner,
  onOutput: async (text) => {
    // Example: send the output to a user via a gateway
    // await gateway.send({ text, channelName: 'telegram', recipientId: 'user123' });
    console.log('Agent Output:', text);
  },
});

// Schedule a morning briefing to run at 8am every day
heartbeat.addTask({
  id: 'morning-brief',
  schedule: '0 8 * * *',
  prompt: 'Generate my morning briefing. Check calendar, weather, and tasks.',
  active: true,
});

// Add a standing order to always check email before any briefing
heartbeat.addStandingOrder({
  id: 'email-check',
  instruction: 'Before any briefing, check my email for urgent items.',
  active: true,
  createdAt: Date.now(),
});

// Start the heartbeat scheduler
heartbeat.start();
```
[Source 1]

## Sources

[Source 1]: src/automation/heartbeat.ts