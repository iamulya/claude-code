---
summary: The subsystem responsible for proactive agent behaviors, including cron-based scheduling and persistent standing orders.
primary_files:
  - src/automation/heartbeat.ts
title: Automation System
entity_type: subsystem
exports:
  - Heartbeat
  - ScheduledTask
  - StandingOrder
  - HeartbeatConfig
stub: false
compiled_at: 2026-04-16T14:15:45.163Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/automation/heartbeat.ts
confidence: 0.95
---

## Purpose
The Automation System enables YAAF agents to perform proactive behaviors rather than operating solely in a reactive, request-response mode. It allows developers to schedule recurring tasks, maintain persistent instructions (standing orders), and trigger agent actions based on time-based events. This subsystem is inspired by the heartbeat mechanisms found in frameworks like OpenClaw and traditional cron utilities.

## Architecture
The subsystem is centered around the `Heartbeat` class, which manages the lifecycle of scheduled activities and persistent instructions.

### Core Components
- **Heartbeat Engine**: The central controller that evaluates schedules at a defined interval (defaulting to 60,000ms) and invokes the agent runner when tasks are due.
- **Scheduled Tasks**: Discrete units of work defined by a cron expression. Each task contains a specific prompt that is sent to the agent when the schedule triggers.
- **Standing Orders**: Persistent instructions that can either be prepended to scheduled prompts to provide constant context or run independently on their own schedules.

## Key APIs
The primary interface for the Automation System is the `Heartbeat` class and its associated type definitions.

### Heartbeat Class
The `Heartbeat` class is initialized with a configuration object and provides methods to manage the automation lifecycle.

- `addTask(task: ScheduledTask)`: Registers a new cron-based task.
- `addStandingOrder(order: StandingOrder)`: Registers a persistent instruction.
- `start()`: Begins the execution loop that monitors schedules.

### Data Structures
```typescript
export type ScheduledTask = {
  id: string
  schedule: string // Cron expression
  prompt: string
  active: boolean
  onlyIfRelevant?: boolean
  timeoutMs?: number
  lastRun?: number
  lastResult?: string
}

export type StandingOrder = {
  id: string
  instruction: string
  active: boolean
  schedule?: string
  createdAt: number
}
```

## Configuration
The system is configured via the `HeartbeatConfig` object, which defines how the heartbeat interacts with the rest of the agent framework.

| Property | Description |
| :--- | :--- |
| `agent` | An object implementing a `run` method to process prompts. |
| `onOutput` | An async callback triggered when the agent generates a response to a task. |
| `onError` | An optional callback for handling execution errors. |
| `checkIntervalMs` | How often the system checks for due tasks (default: 60000). |

### Example Implementation
```typescript
const heartbeat = new Heartbeat({
  agent: myAgentRunner,
  onOutput: async (text, task) => {
    await gateway.send({ text, recipientId: 'user123' });
  },
});

// Register a daily task
heartbeat.addTask({
  id: 'morning-brief',
  schedule: '0 8 * * *',
  prompt: 'Generate my morning briefing.',
  active: true
});

heartbeat.start();
```

## Sources
- `src/automation/heartbeat.ts`