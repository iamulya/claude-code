---
export_name: vigil
source_file: src/vigil.ts
category: function
summary: A factory function to create a Vigil agent instance, simplifying configuration for common autonomous agent use cases.
title: vigil (factory function)
entity_type: api
search_terms:
 - create autonomous agent
 - scheduled agent tasks
 - cron job agent
 - proactive agent setup
 - Vigil agent constructor
 - always-on LLM agent
 - how to make a vigil agent
 - tick-based agent
 - periodic agent execution
 - YAAF autonomous mode
 - vigil factory
 - set tick interval in minutes
stub: false
compiled_at: 2026-04-24T17:48:18.366Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/vigil.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `vigil` function is a factory for creating an instance of the `Vigil` class [Source 1]. It serves as a convenient wrapper, simplifying the configuration for creating an autonomous, "always-on" agent that operates on a periodic tick interval [Source 1].

A `Vigil` agent extends the base `Agent` with several features for autonomous operation: a tick-driven proactive loop for periodic wake-ups, a persistent cron-based task scheduler, a [Structured Output](../concepts/structured-output.md) [Channel](./channel.md), and an append-only [Session Journal](../concepts/session-journal.md) [Source 1].

The primary convenience of this factory function is allowing the tick interval to be specified in minutes (`tickEveryMinutes`) rather than milliseconds (`tickInterval`), which is used by the `Vigil` class constructor directly [Source 1].

## Signature

The `vigil` function takes a single configuration object and returns a new `Vigil` instance [Source 1].

```typescript
export function vigil(
  config: Omit<VigilConfig, "tickInterval"> & {
    /**
     * The number of minutes between autonomous tick probes.
     * This is a convenience wrapper for the `tickInterval` property.
     */
    tickEveryMinutes: number;
  }
): Vigil;
```

### Parameters

*   **`config`**: An object that extends the `VigilConfig` type, with the `tickInterval` property replaced by `tickEveryMinutes`.
    *   `tickEveryMinutes` (`number`): The interval in minutes for the agent's autonomous "tick" loop. This is converted to milliseconds and passed to the underlying `Vigil` constructor's `tickInterval` property [Source 1].
    *   Other properties from `AgentConfig` and `VigilConfig` (such as `systemPrompt`, `tools`, `storageDir`, etc.) are passed through to the `Vigil` constructor [Source 1].

### Returns

*   A new instance of the `Vigil` class, configured for autonomous operation [Source 1].

## Examples

The following example demonstrates creating a proactive DevOps assistant that wakes up every five minutes to check for tasks [Source 1].

```typescript
import { vigil } from 'yaaf';
// Assume checkBuildTool and alertTool are defined elsewhere
import { checkBuildTool, alertTool } from './tools';

const agent = vigil({
  systemPrompt: 'You are a proactive DevOps assistant.',
  tools: [checkBuildTool, alertTool],
  tickEveryMinutes: 5,
});

// The agent instance can be started to begin its autonomous loop.
// It will emit events for ticks, cron jobs, and other activities.
agent.on('tick', ({ count }) => console.log(`Tick #${count} has occurred.`));

async function run() {
  await agent.start();
  console.log('Vigil agent started. It will run every 5 minutes.');
  // The agent will now run in the background.
  // To stop it, call agent.stop().
}

run();
```

## Sources

[Source 1]: src/vigil.ts