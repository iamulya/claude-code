---
export_name: VigilEventHandler
source_file: src/vigil.ts
category: type
summary: A type definition for event handler functions that respond to specific events emitted by the Vigil autonomous agent.
title: VigilEventHandler
entity_type: api
search_terms:
 - Vigil event listener
 - handle agent events
 - subscribe to Vigil ticks
 - cron fire event handler
 - agent error handling
 - brief message callback
 - Vigil lifecycle events
 - how to use agent.on
 - VigilEvents type
 - asynchronous agent notifications
 - agent event payload
 - typed event handler
stub: false
compiled_at: 2026-04-24T17:48:02.828Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/vigil.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`VigilEventHandler` is a generic TypeScript type that defines the signature for functions used to handle events emitted by a `Vigil` agent instance. It ensures that event listeners are type-safe, receiving the correct payload structure for the specific event they are subscribed to.

This type is used in conjunction with the `Vigil.on()` method to subscribe to lifecycle and operational events, such as ticks, cron job firings, errors, and agent-initiated messages. The available events and their corresponding payload shapes are defined in the `VigilEvents` type.

## Signature

`VigilEventHandler` is a generic type that takes an event name as its type parameter.

```typescript
export type VigilEventHandler<K extends keyof VigilEvents> = (data: VigilEvents[K]) => void;
```

The event names and their payload types are defined by the `VigilEvents` interface [Source 1]:

```typescript
export type VigilEvents = {
  /** Agent processed a tick (proactive wake-up interval) */
  tick: { count: number; response: string };

  /** Cron task fired and was dispatched to the agent */
  "cron:fire": { task: ScheduledTask; response: string };

  /**
   * Cron task was delayed due to a busy agent (exponential back-off).
   * Observable so operators can detect tasks that are consistently deferred.
   */
  "cron:delayed": { taskId: string; retryCount: number; delayMs: number; reason: string };

  /** Agent produced structured output via the brief channel */
  brief: { message: string; timestamp: Date };

  /** Tick, cron task, persistence, or watchdog operation failed */
  error: { source: "tick" | "cron" | "persist" | "watchdog"; error: Error; task?: ScheduledTask };

  /** Vigil started autonomous loop */
  start: { tickInterval: number; taskCount: number };

  /** Vigil stopped */
  stop: { ticksRun: number; tasksRun: number };
};
```

- **`K`**: A string literal type representing the name of the event, e.g., `'tick'`, `'error'`, or `'cron:fire'`.
- **`data`**: The event payload object, whose structure is determined by `VigilEvents[K]`.

## Examples

The most common use of `VigilEventHandler` is implicitly [when](./when.md) providing a callback function to the `Vigil.on()` method. TypeScript infers the correct type for the payload object based on the event name.

```typescript
import { Vigil, VigilEventHandler } from 'yaaf';

// Assume myTools is an array of Tool instances
const agent = new Vigil({
  systemPrompt: 'You are a proactive assistant.',
  tools: myTools,
  tickInterval: 60_000,
});

// The type of `data` is inferred as { count: number; response: string }
agent.on('tick', (data) => {
  console.log(`Tick #${data.count} completed.`);
});

// The type of `data` is inferred as { task: ScheduledTask; response: string }
agent.on('cron:fire', (data) => {
  console.log(`Cron task fired: ${data.task.id}`);
});

// The type of `data` is inferred as { message: string; timestamp: Date }
agent.on('brief', (data) => {
  console.log(`Agent says: ${data.message}`);
});

// You can also explicitly type a handler function for clarity or reuse.
const handleError: VigilEventHandler<'error'> = ({ source, error, task }) => {
  console.error(`An error occurred in the '${source}' subsystem:`, error);
  if (task) {
    console.error(`The error was related to task: ${task.id}`);
  }
};

agent.on('error', handleError);

// Start the agent to begin receiving events
agent.start();
```

## Sources

[Source 1]: src/vigil.ts