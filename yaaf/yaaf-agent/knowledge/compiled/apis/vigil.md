---
export_name: Vigil
source_file: src/vigil.ts
category: class
summary: An autonomous, always-on agent class that extends the base Agent with proactive loops and scheduling.
title: Vigil
entity_type: api
stub: false
compiled_at: 2026-04-16T14:07:05.272Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/doctor.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/vigil.ts
confidence: 1
---

## Overview
Vigil is the autonomous execution engine for YAAF. It extends the base Agent class to provide an "always-on" execution model where the agent can act proactively rather than only responding to direct user input. 

Vigil's architecture consists of four primary components:
1.  **Autonomous Loop**: A tick-driven proactive model where the agent wakes at configurable intervals to decide on its next actions.
2.  **Cron Scheduler**: A file-backed system for scheduling one-shot or recurring tasks using standard cron expressions.
3.  **Brief Output Channel**: A dedicated pathway for structured agent communication that does not block the main execution flow.
4.  **Append-only Session Journal**: A daily log system that captures ticks, cron events, and briefs for debugging and long-term memory.

Vigil is used internally by the YAAF Doctor's daemon mode to perform periodic project health checks and background diagnostics.

## Signature / Constructor

```typescript
export class Vigil extends Agent {
  constructor(config: VigilConfig);
}
```

### VigilConfig
The configuration object extends `AgentConfig` with the following autonomous-specific fields:

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `tickInterval` | `number` | `60000` | Milliseconds between autonomous tick probes. Set to `0` to disable ticks (cron-only mode). |
| `tickPrompt` | `(ts: string, count: number) => string` | (Internal) | A function that generates the prompt injected into the agent on each wake-up. |
| `recurringMaxAgeMs` | `number` | `7 days` | Maximum age for recurring tasks before auto-expiry. Set to `0` to never expire. |
| `storageDir` | `string` | `./.vigil` | Directory for persisting scheduled tasks and the session journal. |
| `onBrief` | `(message: string) => void` | — | Interceptor called when the agent produces output via the brief channel. |

## Methods & Properties

### `start()`
Starts the autonomous loop and initializes the cron scheduler.
- **Signature**: `async start(): Promise<void>`

### `stop()`
Stops the autonomous loop and halts the scheduler.
- **Signature**: `stop(): void`

### `schedule()`
Schedules a recurring task based on a cron expression.
- **Signature**: `schedule(cron: string, prompt: string): ScheduledTask`
- **Parameters**:
    - `cron`: A 5-field cron expression (local time).
    - `prompt`: The prompt to dispatch to the agent when the task fires.

### `scheduleOnce()`
Schedules a one-shot task that executes once and is then removed.
- **Signature**: `scheduleOnce(cron: string, prompt: string): ScheduledTask`

## Events
Vigil instances emit the following events:

| Event | Payload Type | Description |
| :--- | :--- | :--- |
| `tick` | `{ count: number; response: string }` | Emitted when the agent completes a proactive wake-up interval. |
| `cron:fire` | `{ task: ScheduledTask; response: string }` | Emitted when a scheduled task is triggered and processed. |
| `brief` | `{ message: string; timestamp: Date }` | Emitted when the agent produces structured output for the brief channel. |
| `error` | `{ source: 'tick' \| 'cron' \| 'persist'; error: Error; task?: ScheduledTask }` | Emitted when a loop, task, or persistence operation fails. |
| `start` | `{ tickInterval: number; taskCount: number }` | Emitted when the autonomous loop begins. |
| `stop` | `{ ticksRun: number; tasksRun: number }` | Emitted when the autonomous loop is halted. |

## Examples

### Minimal Autonomous Agent
This example creates an agent that wakes up every minute to check for work.

```typescript
import { Vigil } from 'yaaf';

const agent = new Vigil({
  systemPrompt: 'You are a proactive assistant. Check for new work.',
  tools: myTools,
  tickInterval: 60_000,
});

agent.on('tick', ({ count }) => console.log(`Tick #${count}`));
agent.on('brief', ({ message }) => console.log(`Agent says: ${message}`));

await agent.start();

// Later, stop the agent
// agent.stop();
```

### Scheduled Monitoring Tasks
This example configures an agent to monitor GitHub PRs every hour and perform a one-shot orientation run.

```typescript
import { Vigil } from 'yaaf';

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

## See Also
- `Agent`: The base class that Vigil extends.
- `YaafDoctor`: A built-in agent that utilizes Vigil for its daemon mode.