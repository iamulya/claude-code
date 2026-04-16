---
summary: A design pattern where agents maintain persistent, high-priority instructions that are automatically evaluated or prepended during recurring automated tasks.
title: Standing Orders
entity_type: concept
related_subsystems:
  - automation/heartbeat
stub: false
compiled_at: 2026-04-16T14:16:00.733Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/automation/heartbeat.ts
confidence: 0.95
---

## What It Is
Standing Orders are a mechanism within YAAF's automation layer that allow developers to define persistent, high-priority instructions for an agent. Unlike standard prompts which are transient and specific to a single interaction, Standing Orders represent ongoing constraints, context, or requirements that the agent must adhere to during its proactive operations.

Inspired by OpenClaw's heartbeat system and traditional cron jobs, Standing Orders solve the problem of maintaining consistent agent behavior across multiple automated tasks without requiring the developer to manually repeat the same instructions in every individual task definition.

## How It Works in YAAF
Standing Orders are managed by the `Heartbeat` subsystem, located in `automation/heartbeat`. They are defined by the `StandingOrder` type and are integrated into the agent's execution flow in two primary ways:

1.  **Prompt Prepending**: The primary function of a Standing Order is to provide instructions that are automatically prepended to the prompts of `ScheduledTask` objects. This ensures that the agent's "standing" requirements (e.g., "always check email before briefings") are considered before the specific task prompt is processed.
2.  **Independent Execution**: If a `StandingOrder` is configured with its own `schedule` (using a cron expression), it can function as an independent recurring task, running on its own timeline regardless of other scheduled tasks.

The `Heartbeat` class evaluates these orders based on a configurable `checkIntervalMs` (which defaults to 60,000ms). During each interval, the system determines which tasks and orders are due for execution based on their cron schedules.

## Configuration
Developers register Standing Orders through a `Heartbeat` instance using the `addStandingOrder` method. 

### The StandingOrder Type
The structure of a Standing Order is defined by the following fields:

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | A unique identifier for the order. |
| `instruction` | `string` | The actual text instruction to be prepended or executed. |
| `active` | `boolean` | Whether the order is currently enabled. |
| `schedule` | `string` (optional) | A cron expression (e.g., `'0 8 * * *'`) for independent execution. |
| `createdAt` | `number` | A timestamp indicating when the order was created. |

### Example Implementation
The following example demonstrates how to configure a `Heartbeat` instance with a Standing Order that influences a scheduled morning briefing.

```typescript
const heartbeat = new Heartbeat({
  agent: myAgentRunner,
  onOutput: async (text, task) => {
    await gateway.send({ text, channelName: 'telegram', recipientId: 'user123' });
  },
});

// Standing order: always check email before briefings
heartbeat.addStandingOrder({
  id: 'email-check',
  instruction: 'Before any briefing, check my email for urgent items.',
  active: true,
  createdAt: Date.now()
});

// Morning briefing task at 8am
heartbeat.addTask({
  id: 'morning-brief',
  schedule: '0 8 * * *',
  prompt: 'Generate my morning briefing. Check calendar, weather, and tasks.',
  active: true
});

heartbeat.start();
```

## Sources
- `src/automation/heartbeat.ts`