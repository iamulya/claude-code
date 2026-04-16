---
summary: A proactive execution model where an agent wakes up at regular intervals (ticks) to decide on actions without user input.
title: Autonomous Loop
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:40:52.190Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/vigil.ts
confidence: 1
---

---
title: Autonomous Loop
entity_type: concept
summary: A proactive execution model where an agent wakes up at regular intervals (ticks) to decide on actions without user input.
related_subsystems:
  - Vigil

## What It Is
The Autonomous Loop is a proactive execution model that enables LLM-powered agents to operate continuously rather than reacting solely to user-initiated messages. In traditional agent architectures, the agent remains idle until a user provides a prompt. The Autonomous Loop solves this by introducing a "heartbeat" or "tick" mechanism, allowing the agent to monitor its environment, manage long-running tasks, and initiate actions independently.

In YAAF, this concept is central to the **Vigil** engine, which transforms a standard reactive agent into an "always-on" autonomous entity capable of background work and self-directed reasoning.

## How It Works in YAAF
The Autonomous Loop is implemented within the `Vigil` class, which extends the base `Agent` class. It operates on a configurable interval known as a **tick**.

1.  **Wake-up Signal**: At every interval (defined by `tickInterval`), the engine triggers a "tick".
2.  **Proactive Prompting**: The engine injects a specific prompt (the `tickPrompt`) into the agent's context. This prompt typically signals to the agent that it has "woken up" and should evaluate its current state, tools, or scheduled tasks to decide what to do next.
3.  **Execution**: The agent processes the tick prompt using its standard reasoning loop (inherited from `AgentRunner`). It may call tools, produce a "brief" (structured output), or decide to remain idle until the next tick.
4.  **Lifecycle Management**: The loop is started using the `agent.start()` method and continues until `agent.stop()` is called.

The loop emits several events during its cycle, including `tick` (when a proactive interval completes) and `error` (if a tick fails to process).

## Configuration
Developers configure the Autonomous Loop through the `VigilConfig` object. The primary controls are the frequency of the ticks and the content of the prompt that triggers the agent's reasoning.

```ts
import { Vigil } from './vigil.js';

const agent = new Vigil({
  systemPrompt: 'You are a proactive system monitor.',
  // Configure the loop to run every 30 seconds
  tickInterval: 30_000,
  // Customizing the wake-up signal
  tickPrompt: (timestamp, count) => 
    `Current time is ${timestamp}. This is tick #${count}. Check system health.`,
});

// Handle the results of the autonomous loop
agent.on('tick', ({ count, response }) => {
  console.log(`Tick ${count} processed. Agent response: ${response}`);
});

await agent.start();
```

If `tickInterval` is set to `0`, the tick-driven autonomous loop is disabled, though the agent may still respond to other triggers such as the Cron scheduler.

## See Also
- Vigil
- Cron Scheduler
- Brief Output Channel
- Session Journal