---
title: Standing Orders
summary: Persistent, recurring instructions or directives given to a YAAF agent that it regularly checks or acts upon, often prepended to prompts.
entity_type: concept
related_subsystems:
 - "[Automation System](../subsystems/automation-system.md)"
see_also:
 - "[Heartbeat](../apis/heartbeat.md)"
 - "[StandingOrder](../apis/standing-order.md)"
search_terms:
 - persistent instructions
 - recurring agent tasks
 - agent directives
 - how to give an agent permanent rules
 - always-on instructions for agents
 - YAAF heartbeat orders
 - scheduled agent instructions
 - prepending instructions to prompts
 - agent background tasks
 - cron jobs for agents
 - proactive agent behavior
 - long-term agent memory
stub: false
compiled_at: 2026-04-25T00:24:40.310Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/automation/heartbeat.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Standing Orders are persistent instructions or directives given to a YAAF agent that influence its behavior over time, particularly for scheduled or recurring tasks [Source 1]. They provide a mechanism for an agent to maintain a set of core rules or priorities without requiring them to be repeated in every prompt. This concept is a key part of YAAF's [Automation System](../subsystems/automation-system.md), enabling agents to act proactively and consistently according to predefined guidelines [Source 1].

For example, a standing order could instruct an agent to "always check for urgent emails before generating a daily briefing" or to "format all summaries using markdown." These orders are checked regularly and applied to relevant tasks, ensuring the agent adheres to long-term user preferences or operational constraints [Source 1].

## How It Works in YAAF

Standing Orders are implemented within the [Heartbeat](../apis/heartbeat.md) mechanism, which manages scheduled tasks and proactive agent execution [Source 1]. A developer can add a standing order to a `Heartbeat` instance. The core functionality is that the `instruction` text from an active `StandingOrder` is prepended to the prompts of scheduled tasks that the [Heartbeat](../apis/heartbeat.md) triggers [Source 1].

The `StandingOrder` data structure includes a unique `id`, the `instruction` text, an `active` flag to enable or disable it, and a creation timestamp. It also has an optional `schedule` property. If a schedule (as a [Cron Expression](./cron-expression.md)) is provided, the standing order can also run as an independent task, not just as a prefix to other tasks [Source 1]. This allows for both modifying existing scheduled tasks and creating new, recurring, instruction-based tasks.

## Configuration

Standing Orders are configured by adding them to an initialized `Heartbeat` instance. The `addStandingOrder` method is used for this purpose.

The following example demonstrates adding a standing order that instructs the agent to check for urgent emails before any briefing task runs [Source 1]:

```typescript
// Assumes 'heartbeat' is an initialized Heartbeat instance.

// Standing order: always check email before briefings
heartbeat.addStandingOrder({
  id: 'email-check',
  instruction: 'Before any briefing, check my email for urgent items.',
});
```

This instruction will now be automatically prepended to the prompts of other scheduled tasks managed by this `heartbeat` instance, such as a daily briefing task [Source 1].

## See Also

*   [Heartbeat](../apis/heartbeat.md): The core mechanism for scheduling tasks and processing Standing Orders.
*   [StandingOrder](../apis/standing-order.md): The API definition for the Standing Order data structure.
*   [Automation System](../subsystems/automation-system.md): The subsystem responsible for proactive and scheduled agent behaviors.

## Sources

[Source 1]: src/automation/heartbeat.ts