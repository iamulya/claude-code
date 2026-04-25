---
summary: Defines the structure for a cron-scheduled task, including its cron expression, prompt, and recurrence settings, used within the Vigil autonomous agent.
export_name: ScheduledTask
source_file: src/vigil.ts
category: type
title: ScheduledTask
entity_type: api
search_terms:
 - cron job definition
 - scheduled agent prompt
 - recurring task configuration
 - Vigil agent tasks
 - how to schedule a task
 - autonomous agent jobs
 - task priority
 - one-shot vs recurring tasks
 - task persistence
 - agent scheduling
 - cron expression for agent
 - task auto-expiry
 - define a scheduled job
 - Vigil task structure
stub: false
compiled_at: 2026-04-24T17:35:27.603Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/automation/heartbeat.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/vigil.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `ScheduledTask` type defines the data structure for a single scheduled job within the Vigil autonomous agent subsystem [Source 2]. Each `ScheduledTask` represents a prompt to be executed by the agent at a specific time or on a recurring basis, defined by a [Cron Expression](../concepts/cron-expression.md).

These tasks are a core component of Vigil's ability to run continuously and proactively. They are persisted to disk, allowing them to survive application restarts [Source 2]. Tasks can be configured as one-shot or recurring, and can be assigned a priority to manage execution order [when](./when.md) multiple tasks are due simultaneously [Source 2].

It is important to note that a different type, also named `ScheduledTask`, exists within the `Heartbeat` automation module. That type has a different structure, including fields like `active`, `onlyIfRelevant`, and `timeoutMs` [Source 1]. This article describes the `ScheduledTask` type as defined and used by the Vigil subsystem.

## Signature

The `ScheduledTask` type is an object with the following properties:

```typescript
export type ScheduledTask = {
  id: string;
  /** 5-field cron expression (local time) */
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
[Source 2]

### Properties

*   **`id`**: `string`
    A unique identifier for the task [Source 2].
*   **`cron`**: `string`
    A 5-field cron expression (minute, hour, day of month, month, day of week) that determines when the task should run. The time is interpreted in the local timezone of the server [Source 2].
*   **`prompt`**: `string`
    The input prompt that will be sent to the agent for execution when the task fires [Source 2].
*   **`createdAt`**: `number`
    The timestamp (in epoch milliseconds) when the task was created [Source 2].
*   **`lastFiredAt`**: `number` (optional)
    The timestamp (in epoch milliseconds) of the last time the task was executed. This property is only set for recurring tasks [Source 2].
*   **`recurring`**: `boolean`
    If `true`, the task will be rescheduled to run again after it fires. If `false` or omitted, the task is a one-shot and will be removed after execution [Source 2].
*   **`permanent`**: `boolean` (optional)
    If `true`, the task is exempt from the automatic expiry configured by `recurringMaxAgeMs` in the Vigil configuration [Source 2].
*   **`priority`**: `number` (optional)
    An integer between -100 and 100 that determines the execution order if multiple tasks are due at the same time. Tasks with higher priority values are executed first. The default priority is 0 [Source 2].

## Examples

While `ScheduledTask` objects are not typically instantiated directly, they are created and managed by a `Vigil` agent instance via methods like `schedule()` and `scheduleOnce()`. The following examples demonstrate how these tasks are used in practice.

### Scheduling a Recurring Task

This example creates a recurring `ScheduledTask` that runs every hour to check for new pull request reviews.

```typescript
import { Vigil } from 'yaaf';
// Assume githubTool and notifyTool are defined elsewhere
import { githubTool, notifyTool } from './tools';

const agent = new Vigil({
  systemPrompt: 'You monitor GitHub PRs and notify on new reviews.',
  tools: [githubTool, notifyTool],
});

// This call creates a ScheduledTask internally.
// The resulting task object will have `recurring: true`.
agent.schedule('0 * * * *', 'Check for new PR reviews and notify the team.');

await agent.start();
```
[Source 2]

### Scheduling a One-Shot Task

This example creates a `ScheduledTask` that runs only once, five minutes from the current time.

```typescript
import { Vigil } from 'yaaf';
// Assume myTools are defined elsewhere
import { myTools } from './tools';

const agent = new Vigil({
  systemPrompt: 'You are a proactive assistant.',
  tools: myTools,
});

// Calculate the cron expression for 5 minutes from now
const inFive = new Date(Date.now() + 5 * 60_000);
const cronExpression = `${inFive.getMinutes()} ${inFive.getHours()} * * *`;

// This call creates a one-shot ScheduledTask internally.
// The resulting task object will have `recurring: false`.
agent.scheduleOnce(
  cronExpression,
  'Initial orientation run — summarise open PRs.',
);

await agent.start();
```
[Source 2]

## Sources

*   [Source 1]: `src/automation/heartbeat.ts`
*   [Source 2]: `src/vigil.ts`