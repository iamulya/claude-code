---
summary: A structured output pathway for autonomous agents to communicate results or status updates without blocking on user interaction.
title: Brief Channel
entity_type: concept
related_subsystems:
  - Vigil
stub: false
compiled_at: 2026-04-16T14:41:00.997Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/vigil.ts
confidence: 0.9
---

## What It Is
The Brief Channel is a communication pattern in YAAF designed for autonomous agents operating in background or "always-on" modes. Unlike traditional LLM interactions that follow a synchronous request-response cycle (where a user sends a prompt and waits for a reply), the Brief Channel allows an agent to push information to the outside world asynchronously.

This concept solves the problem of visibility in autonomous systems. When an agent runs on a schedule or a proactive loop, it needs a way to report its findings, status updates, or completed tasks without a human user being present to receive the return value of a function call.

## How It Works in YAAF
The Brief Channel is a core component of the `Vigil` subsystem, YAAF's autonomous execution engine. It is implemented as both a configuration callback and an event emitter.

When a `Vigil` agent performs a "tick" (a proactive wake-up) or executes a scheduled cron task, any structured output intended for the user is routed through this channel. This prevents the agent's autonomous loop from blocking and allows developers to decouple the agent's logic from the delivery mechanism (e.g., sending a Slack message, updating a database, or logging to a console).

The channel carries a payload consisting of:
- **Message**: The string content produced by the agent.
- **Timestamp**: The precise time the brief was generated.

## Configuration
Developers can interact with the Brief Channel in two ways: via the `VigilConfig` object during initialization or by attaching event listeners to a `Vigil` instance.

### Using the onBrief Interceptor
The `onBrief` property in the configuration is an interceptor used to route agent messages to external systems like UIs or webhooks.

```typescript
import { Vigil } from 'yaaf/vigil';

const agent = new Vigil({
  systemPrompt: 'Monitor the system and report anomalies.',
  // Interceptor configuration
  onBrief: (message) => {
    console.log(`External Notification: ${message}`);
  },
  tickInterval: 60_000,
});
```

### Using Event Listeners
The `Vigil` class emits a `brief` event that can be consumed by multiple listeners. This is useful for logging or multi-channel notifications.

```typescript
agent.on('brief', ({ message, timestamp }) => {
  console.log(`[${timestamp.toISOString()}] Agent Brief: ${message}`);
});
```

## Sources
- `src/vigil.ts`