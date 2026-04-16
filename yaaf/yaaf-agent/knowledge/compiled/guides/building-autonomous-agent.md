---
summary: How to configure and run a Vigil agent for proactive tasks and scheduled work.
title: Building an Autonomous Agent
entity_type: guide
stub: false
compiled_at: 2026-04-16T14:41:06.114Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/vigil.ts
confidence: 1
---

---
title: Building an Autonomous Agent
entity_type: guide
summary: How to configure and run a Vigil agent for proactive tasks and scheduled work.
difficulty: intermediate

## Overview
In YAAF, an autonomous agent is implemented via the **Vigil** subsystem. Unlike standard agents that operate in a request-response pattern, a Vigil agent is "always-on." It utilizes a tick-driven proactive loop and a cron-based scheduler to perform tasks without immediate user intervention.

This guide covers how to initialize a Vigil agent, configure its autonomous heartbeat, schedule persistent tasks, and handle its output channels.

## Prerequisites
* A YAAF project environment.
* Access to the `Vigil` class from the YAAF library.
* A configured LLM provider and necessary tools.

## Step-by-Step

### 1. Initialize the Vigil Agent
To create an autonomous agent, instantiate the `Vigil` class. You must provide a `systemPrompt` and a `tickInterval` (in milliseconds) to define how often the agent "wakes up" to evaluate its environment.

```typescript
import { Vigil } from 'yaaf';

const agent = new Vigil({
  systemPrompt: 'You are a proactive assistant. Check for new work and monitor system health.',
  tools: myTools,
  tickInterval: 60_000, // Wake up every 60 seconds
  storageDir: './.agent-data' // Directory for logs and scheduled tasks
});
```

### 2. Handle Agent Events
Vigil communicates its autonomous actions through an event emitter. You should subscribe to these events to route the agent's findings to your application or UI.

```typescript
// Triggered every time the autonomous loop runs
agent.on('tick', ({ count }) => {
  console.log(`Autonomous tick #${count} processed.`);
});

// Triggered when the agent produces a "brief" (structured output)
agent.on('brief', ({ message, timestamp }) => {
  console.log(`[${timestamp.toISOString()}] Agent Brief: ${message}`);
});

// Triggered when a scheduled cron task executes
agent.on('cron:fire', ({ task }) => {
  console.log(`Executing scheduled task: ${task.id}`);
});
```

### 3. Schedule Tasks
Vigil supports both recurring and one-shot tasks using standard 5-field cron expressions. These tasks are persisted to disk and will survive application restarts.

#### Recurring Tasks
Use the `schedule` method for tasks that should repeat.

```typescript
// Check GitHub PRs every hour
agent.schedule('0 * * * *', 'Check for new PR reviews and notify the team.');
```

#### One-shot Tasks
Use `scheduleOnce` for tasks that should run only once at a specific time.

```typescript
const targetTime = new Date(Date.now() + 30 * 60_000); // 30 minutes from now
const cronStr = `${targetTime.getMinutes()} ${targetTime.getHours()} * * *`;

agent.scheduleOnce(cronStr, 'Perform a one-time system cleanup.');
```

### 4. Start the Autonomous Loop
The agent will not begin its proactive loop or process scheduled tasks until the `start()` method is called.

```typescript
await agent.start();
console.log('Agent is now running autonomously.');

// To stop the agent later:
// agent.stop();
```

## Configuration Reference

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `tickInterval` | `number` | `60000` | Milliseconds between autonomous probes. Set to `0` for cron-only mode. |
| `tickPrompt` | `function` | (Internal) | A function returning the prompt injected on each wake-up. |
| `storageDir` | `string` | `./.vigil` | Directory for persisting tasks and the session journal. |
| `recurringMaxAgeMs` | `number` | `7 days` | Duration before recurring tasks expire. Set to `0` to disable. |
| `onBrief` | `function` | `undefined` | Interceptor for routing agent messages to external systems. |

## Common Mistakes

1.  **Forgetting to call `.start()`**: The Vigil agent is initialized in a dormant state. It will not execute ticks or cron tasks until `await agent.start()` is invoked.
2.  **Invalid Cron Expressions**: Vigil uses standard 5-field cron syntax. Ensure your expressions are valid, or the agent will fail to schedule the task.
3.  **Storage Permissions**: If `storageDir` is not writable, the agent will fail to persist tasks or write to the session journal, potentially leading to data loss on restart.
4.  **Blocking the Event Loop**: Since Vigil runs continuously, ensure that event handlers (like `on('tick', ...)` or `onBrief`) do not perform heavy synchronous work that could block the agent's execution.

## Next Steps
* Learn about the **Session Journal** to understand how the agent maintains long-term memory of its autonomous actions.
* Explore **Tool Definition** to give your autonomous agent the ability to interact with external APIs.
* Configure **Brief Output Channels** to integrate agent notifications with Slack, Discord, or webhooks.