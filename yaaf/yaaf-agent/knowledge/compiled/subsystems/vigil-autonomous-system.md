---
summary: The autonomous execution engine of YAAF providing tick-driven loops and cron-based task scheduling.
primary_files:
  - src/vigil.ts
  - src/utils/cron.ts
title: Vigil Autonomous System
entity_type: subsystem
exports:
  - Vigil
  - vigil
  - ScheduledTask
  - VigilConfig
  - VigilEvents
stub: false
compiled_at: 2026-04-16T14:40:47.635Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/vigil.ts
confidence: 1
---

## Purpose
The Vigil subsystem provides an "always-on" autonomous execution environment for YAAF agents. Unlike standard agents that operate primarily in a request-response pattern, Vigil enables agents to run continuously, initiate actions proactively through periodic "ticks," and execute tasks based on persistent cron schedules. It is designed for production-grade reliability, ensuring that scheduled tasks survive process restarts through file-based persistence.

## Architecture
Vigil extends the base `Agent` class and integrates several specialized components to manage autonomous behavior:

1.  **Autonomous Loop**: A tick-driven proactive execution model. The agent wakes at a configurable interval and receives a system-generated prompt (the "tick prompt") signaling it to evaluate its current state and decide on next steps.
2.  **Cron Scheduler**: A task management system that uses standard cron expressions. It supports both one-shot and recurring tasks.
3.  **Brief Output Channel**: A structured pathway for the agent to communicate results or status updates without requiring a direct user interaction or blocking on input.
4.  **Append-only Session Journal**: A persistence layer that captures every tick, cron execution, and brief in daily log files. This serves both as a debugging tool and a source of long-term memory for the agent.

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────┐
│                     Vigil                               │
│                                                         │
│  ┌──────────────┐   ┌────────────┐   ┌──────────────┐  │
│  │  Agent loop  │   │  Scheduler │   │   Journal    │  │
│  │  (tick/cron) │   │  (cron.ts) │   │  (daily log) │  │
│  └──────┬───────┘   └──────┬─────┘   └──────┬───────┘  │
│         └─────────────────►│◄────────────────┘          │
│                            ▼                            │
│              AgentRunner (inherited from Agent)         │
└─────────────────────────────────────────────────────────┘
```

## Key APIs

### Vigil Class
The primary class for creating autonomous agents. It inherits from `Agent` and adds methods for lifecycle management and task scheduling.

*   `start()`: Begins the autonomous loop and activates the cron scheduler.
*   `stop()`: Halts the autonomous loop and stops task processing.
*   `schedule(cron: string, prompt: string)`: Schedules a recurring task using a 5-field cron expression.
*   `scheduleOnce(cron: string, prompt: string)`: Schedules a one-shot task to run at a specific time.

### vigil() Factory
A convenience function for instantiating a `Vigil` agent with simplified configuration, such as specifying tick intervals in minutes.

```ts
const agent = vigil({
  systemPrompt: 'You are a proactive DevOps assistant.',
  tools: [checkBuildTool, alertTool],
  tickEveryMinutes: 5,
});
await agent.start();
```

### Events
Vigil emits several events via its event emitter interface:
*   `tick`: Emitted when the agent processes a proactive wake-up.
*   `cron:fire`: Emitted when a scheduled task is dispatched.
*   `brief`: Emitted when the agent produces structured output.
*   `error`: Emitted for failures in ticks, cron tasks, or persistence.

## Configuration
Vigil is configured via the `VigilConfig` object, which extends the standard `AgentConfig`.

| Property | Type | Description |
| :--- | :--- | :--- |
| `tickInterval` | `number` | Milliseconds between autonomous ticks. Default: 60,000 (1 minute). |
| `tickPrompt` | `function` | A function returning the prompt injected on each wake-up. |
| `recurringMaxAgeMs` | `number` | Time before recurring tasks expire. Default: 7 days. |
| `storageDir` | `string` | Directory for task persistence and journals. Default: `./.vigil`. |
| `onBrief` | `function` | Interceptor for agent output, useful for routing to UIs or webhooks. |

## Extension Points

### Task Persistence
Vigil stores `ScheduledTask` objects on disk within the `storageDir`. This allows the subsystem to resume its schedule after a crash or restart. Developers can interact with these tasks through the `schedule` and `scheduleOnce` methods.

### Brief Channel
The `onBrief` callback and the `brief` event provide a hook for developers to capture autonomous agent communications. This is the primary mechanism for an autonomous agent to "speak" to the outside world when it is not responding to a specific user message.

```ts
const agent = new Vigil({
  // ... config
  onBrief: (message) => {
    // Route agent's autonomous thoughts to a Slack channel or database
    console.log(`Agent Brief: ${message}`);
  }
});
```