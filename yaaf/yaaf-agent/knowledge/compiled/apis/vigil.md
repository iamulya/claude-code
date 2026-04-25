---
title: Vigil
entity_type: api
summary: The main class for creating autonomous, always-on YAAF agents with tick-driven proactive loops and cron scheduling.
export_name: Vigil
source_file: src/vigil.ts
category: class
search_terms:
 - autonomous agent
 - always-on agent
 - cron job agent
 - scheduled tasks for LLM
 - proactive agent loop
 - long-running agent
 - background agent process
 - how to make an agent run continuously
 - tick-driven execution
 - persistent agent tasks
 - YAAF daemon mode
 - agent scheduling
 - Vigil vs Agent
stub: false
compiled_at: 2026-04-24T17:47:55.254Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/vigil.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`Vigil` is a specialized class that extends the base `Agent` to create autonomous, always-on agents. It provides an execution engine for agents that run continuously, rather than only in response to user input. This is suitable for building daemon-like processes, background monitors, and proactive assistants [Source 2]. The YAAF Doctor's daemon mode is an example of a feature built using `Vigil` [Source 1].

The core features of `Vigil` include [Source 2]:

1.  **[Autonomous Loop](../concepts/autonomous-loop.md)**: A "tick-driven" proactive model where the agent wakes up on a configurable interval to decide what to do next.
2.  **[Cron Scheduler](../concepts/cron-scheduler.md)**: A persistent, file-backed scheduler that allows agents to execute tasks based on standard Cron Expressions. Tasks can be one-shot or recurring and survive application restarts.
3.  **Brief Output [Channel](./channel.md)**: A structured pathway for the agent to communicate results or status updates without requiring user interaction.
4.  **[Session Journal](../concepts/session-journal.md)**: An append-only log file, created daily, that records every tick, cron execution, and brief message for debugging and state persistence.

`Vigil` inherits all the capabilities of the `Agent` class and adds these long-running, proactive functionalities [Source 2].

## Signature / Constructor

`Vigil` is a class that extends `Agent`. It is instantiated with a `VigilConfig` object, which itself extends `AgentConfig` [Source 2].

```typescript
import { Agent, type AgentConfig } from "./agent.js";

export class Vigil extends Agent {
  constructor(config: VigilConfig);
  // ... methods
}

export type VigilConfig = AgentConfig & {
  /**
   * Milliseconds between autonomous tick probes.
   * Set to 0 to disable tick-driven mode (cron-only).
   * Default: 60_000 (1 minute)
   */
  tickInterval?: number;

  /**
   * The tick prompt injected into the agent on each wake-up.
   * Receives the current ISO timestamp and tick count.
   * Default: `<tick timestamp="...">You're awake — what needs attention now?</tick>`
   */
  tickPrompt?: (timestamp: string, count: number) => string;

  /**
   * Maximum number of recurring task auto-expiry in ms.
   * Set to 0 to never expire. Default: 7 days.
   */
  recurringMaxAgeMs?: number;

  /**
   * Directory for persisting scheduled tasks and the session journal.
   * Default: `./.vigil` in the current working directory.
   */
  storageDir?: string;

  /**
   * Interceptor called [[[[[[[[when]]]]]]]] the agent produces output.
   * Use this to route agent messages to a UI, webhook, etc.
   * Also emitted as `brief` events.
   */
  onBrief?: (message: string) => void;
};
```

### [ScheduledTask](./scheduled-task.md) Type

Tasks scheduled with `Vigil` are represented by the `ScheduledTask` object, which is persisted to disk [Source 2].

```typescript
export type ScheduledTask = {
  id: string;
  /** 5-field Cron Expression (local time) */
  cron: string;
  /** Prompt to run when the task fires */
  prompt: string;
  /** Creation timestamp (epoch ms) */
  createdAt: number;
  /** Last fire timestamp (epoch ms). Only written for recurring tasks. */
  lastFiredAt?: number;
  /** When true, task reschedules after firing (default: one-shot) */
  recurring: boolean;
  /** When true, skips recurringMaxAgeMs auto-expiry */
  permanent?: boolean;
  /**
   * Task execution priority.
   * Higher values execute first when multiple tasks are due simultaneously.
   * Default: 0. Range: -100 to 100.
   */
  priority?: number;
};
```

## Methods & Properties

Based on examples, `Vigil` instances expose the following methods for controlling the autonomous loop and scheduling tasks [Source 2]:

*   **`start()`**: Starts the autonomous loop, enabling both the tick interval and the cron scheduler.
*   **`stop()`**: Stops the autonomous loop.
*   **`schedule(cron: string, prompt: string)`**: Schedules a recurring task that will fire based on the provided [Cron Expression](../concepts/cron-expression.md).
*   **`scheduleOnce(cron: string, prompt: string)`**: Schedules a one-shot task that will execute once at the next time matching the cron expression and then be removed.

## Events

`Vigil` instances are `EventEmitter`s that emit the following events [Source 2]:

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `tick` | `{ count: number; response: string }` | Emitted when the agent processes a tick from its proactive wake-up interval. |
| `cron:fire` | `{ task: ScheduledTask; response: string }` | Emitted when a scheduled cron task fires and is dispatched to the agent. |
| `cron:delayed` | `{ taskId: string; retryCount: number; delayMs: number; reason: string }` | Emitted when a cron task is delayed due to a busy agent, with exponential back-off. |
| `brief` | `{ message: string; timestamp: Date }` | Emitted when the agent produces [Structured Output](../concepts/structured-output.md) via its brief channel. |
| `error` | `{ source: "tick" \| "cron" \| "persist" \| "watchdog"; error: Error; task?: ScheduledTask }` | Emitted when a tick, cron task, persistence, or watchdog operation fails. |
| `start` | `{ tickInterval: number; taskCount: number }` | Emitted when the `Vigil` autonomous loop starts. |
| `stop` | `{ ticksRun: number; tasksRun: number }` | Emitted when the `Vigil` autonomous loop stops. |

## Examples

### Minimal Tick-Driven Agent

This example creates an autonomous agent that wakes up every minute to check for new work [Source 2].

```typescript
import { Vigil } from 'yaaf';

// Minimal: autonomous agent that wakes every minute
const agent = new Vigil({
  systemPrompt: 'You are a proactive assistant. Check for new work.',
  tools: myTools,
  tickInterval: 60_000,
});

agent.on('tick', ({ count }) => console.log(`Tick #${count}`));
agent.on('cron:fire', ({ task }) => console.log(`Cron fired: ${task.id}`));
agent.on('brief', ({ message }) => console.log(`Agent says: ${message}`));

await agent.start();
// Agent now runs autonomously. Stop it with:
// agent.stop();
```

### Agent with Scheduled Tasks

This example demonstrates scheduling both recurring and one-shot tasks for an agent that monitors GitHub pull requests [Source 2].

```typescript
import { Vigil } from 'yaaf';

// With scheduled tasks
const agent = new Vigil({
  systemPrompt: 'You monitor GitHub PRs and notify on new reviews.',
  tools: [githubTool, notifyTool],
});

// Check PRs every hour (recurring)
agent.schedule('0 * * * *', 'Check for new PR reviews and notify the team.');

// Run a one-shot wake-up 5 minutes from now
const inFive = new Date(Date.now() + 5 * 60_000);
agent.scheduleOnce(
  `${inFive.getMinutes()} ${inFive.getHours()} * * *`,
  'Initial orientation run — summarise open PRs.',
);

await agent.start();
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/vigil.ts