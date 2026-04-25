---
summary: Defines the structure for a persistent instruction (standing order) managed by the Heartbeat system.
export_name: StandingOrder
source_file: src/automation/heartbeat.ts
category: type
title: StandingOrder
entity_type: api
search_terms:
 - persistent agent instructions
 - recurring agent tasks
 - how to give an agent a permanent rule
 - Heartbeat system configuration
 - agent automation rules
 - scheduled agent behavior
 - prepending instructions to prompts
 - YAAF Heartbeat
 - long-term agent memory
 - proactive agent instructions
 - agent system prompt
 - background agent tasks
stub: false
compiled_at: 2026-04-24T17:39:49.712Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/automation/heartbeat.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `StandingOrder` type defines the data structure for a persistent instruction within the YAAF `Heartbeat` subsystem [Source 1]. A standing order represents a rule or instruction that the agent should adhere to, typically by prepending the instruction text to the prompts of scheduled tasks. This allows developers to establish long-term, overarching directives for an agent's automated behavior, such as "Always check my email for urgent items before generating a briefing" [Source 1].

Standing orders can also be configured with their own schedule, allowing them to run as independent tasks in addition to modifying other tasks [Source 1]. They are a key component for creating proactive and stateful agents that can follow consistent rules over time.

## Signature

`StandingOrder` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type StandingOrder = {
  /** Unique order identifier */
  id: string;
  /** Instruction that gets prepended to scheduled prompts */
  instruction: string;
  /** Whether this order is active */
  active: boolean;
  /** Optional schedule — if set, runs independently on this schedule */
  schedule?: string;
  /** Created timestamp */
  createdAt: number;
};
```

### Properties

- **`id`**: `string`
  A unique identifier for the standing order.
- **`instruction`**: `string`
  The core directive. This text is prepended to the prompts of scheduled tasks managed by the same `Heartbeat` instance.
- **`active`**: `boolean`
  A flag to enable or disable the standing order. If `false`, the instruction will not be applied.
- **`schedule`**: `string` (optional)
  An optional [Cron Expression](../concepts/cron-expression.md). If provided, this standing order will also be executed as an independent task on the specified schedule.
- **`createdAt`**: `number`
  A Unix timestamp (in milliseconds) indicating [when](./when.md) the standing order was created.

## Examples

The following example demonstrates creating a `Heartbeat` instance and adding a `StandingOrder` to ensure the agent always checks for urgent emails before generating a scheduled briefing [Source 1].

```typescript
import { Heartbeat } from 'yaaf';

// Assume myAgentRunner and gateway are defined elsewhere
const heartbeat = new Heartbeat({
  agent: myAgentRunner,
  onOutput: async (text) => {
    // Send the agent's output to a user
    await gateway.send({ text, channelName: 'telegram', recipientId: 'user123' });
  },
});

// Add a standing order to check email before any briefing.
// This instruction will be prepended to the prompt of other scheduled tasks.
heartbeat.addStandingOrder({
  id: 'email-check-rule',
  instruction: 'Before any briefing, check my email for urgent items and include a summary.',
  active: true,
  createdAt: Date.now(),
});

// Add a scheduled task that will be affected by the standing order.
heartbeat.addTask({
  id: 'morning-brief',
  schedule: '0 8 * * *', // Daily at 8am
  prompt: 'Generate my morning briefing. Check calendar, weather, and tasks.',
  active: true,
});

// When the 'morning-brief' task runs, the agent will receive a combined prompt like:
// "Before any briefing, check my email for urgent items and include a summary.
//  Generate my morning briefing. Check calendar, weather, and tasks."

heartbeat.start();
```

## See Also

- **Heartbeat**: The subsystem that manages and applies `StandingOrder` objects to scheduled tasks.
- **[ScheduledTask](./scheduled-task.md)**: The data structure for a one-time or recurring task that can be modified by a `StandingOrder`.

## Sources

[Source 1]: src/automation/heartbeat.ts