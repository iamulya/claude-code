---
summary: A factory function for creating Vigil autonomous agents with simplified configuration.
export_name: vigil
source_file: src/vigil.ts
category: function
title: vigil()
entity_type: api
stub: false
compiled_at: 2026-04-16T14:40:54.869Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/vigil.ts
confidence: 0.95
---

## Overview
The `vigil()` function is a factory utility used to instantiate a `Vigil` agent, which operates in an "Autonomous Agent Mode." Unlike standard agents that typically respond to direct user prompts, agents created via `vigil()` run continuously using a tick-driven proactive loop and a cron-based task scheduler.

This function simplifies the configuration of the autonomous loop by allowing developers to specify intervals in minutes rather than milliseconds. It returns an instance of the `Vigil` class, which extends the base `Agent` functionality with persistence, scheduling, and automated wake-up cycles.

## Signature / Constructor

```typescript
export function vigil(
  config: Omit<VigilConfig, 'tickInterval'> & {
    tickEveryMinutes?: number;
  }
): Vigil;
```

### Parameters
The configuration object accepts all properties of `AgentConfig` plus the following specialized fields:

| Property | Type | Description |
| :--- | :--- | :--- |
| `tickEveryMinutes` | `number` | The interval in minutes between autonomous wake-ups. |
| `tickPrompt` | `(timestamp: string, count: number) => string` | A function that generates the prompt injected into the agent on each wake-up. |
| `recurringMaxAgeMs` | `number` | Maximum age for recurring tasks before auto-expiry (default: 7 days). |
| `storageDir` | `string` | Directory for persisting scheduled tasks and the session journal (default: `./.vigil`). |
| `onBrief` | `(message: string) => void` | Interceptor for structured agent output (also emitted as an event). |

## Methods & Properties
The `Vigil` instance returned by this function includes the following primary methods:

| Method | Signature | Description |
| :--- | :--- | :--- |
| `start` | `() => Promise<void>` | Starts the autonomous loop and the cron scheduler. |
| `stop` | `() => void` | Stops the autonomous loop and clears active timers. |
| `schedule` | `(cron: string, prompt: string) => void` | Schedules a recurring task using a 5-field cron expression. |
| `scheduleOnce` | `(cron: string, prompt: string) => void` | Schedules a one-shot task that executes once at the specified cron time. |

## Events
The agent instance emits events defined in the `VigilEvents` type:

- `tick`: Emitted when the agent completes a proactive wake-up cycle. Includes the tick `count` and the agent's `response`.
- `cron:fire`: Emitted when a scheduled task is triggered. Includes the `task` details and the agent's `response`.
- `brief`: Emitted when the agent produces structured output via the brief channel.
- `error`: Emitted when a tick, cron task, or persistence operation fails.
- `start`: Emitted when the autonomous loop begins.
- `stop`: Emitted when the agent is shut down.

## Examples

### Basic Autonomous Agent
This example creates an agent that wakes up every 5 minutes to check for work.

```typescript
import { vigil } from 'yaaf';

const agent = vigil({
  systemPrompt: 'You are a proactive DevOps assistant.',
  tools: [checkBuildTool, alertTool],
  tickEveryMinutes: 5,
});

agent.on('tick', ({ count, response }) => {
  console.log(`Tick #${count} completed: ${response}`);
});

await agent.start();
```

### Scheduled Tasks
This example demonstrates how to use the scheduler for specific recurring or one-time tasks.

```typescript
const agent = vigil({
  systemPrompt: 'You monitor GitHub PRs and notify on new reviews.',
  tools: [githubTool, notifyTool],
});

// Check PRs every hour using standard cron syntax
agent.schedule('0 * * * *', 'Check for new PR reviews and notify the team.');

// Run a one-shot wake-up 5 minutes from now
const inFive = new Date(Date.now() + 5 * 60_000);
agent.scheduleOnce(
  `${inFive.getMinutes()} ${inFive.getHours()} * * *`,
  'Initial orientation run — summarise open PRs.',
);

await agent.start();
```