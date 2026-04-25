---
title: Vigil Autonomous Agent Mode
entity_type: subsystem
summary: An always-on autonomous execution engine where the agent runs continuously, featuring a tick-driven proactive loop and a cron-based task scheduler.
primary_files:
 - src/vigil.ts
exports:
 - Vigil
 - vigil
 - VigilConfig
 - ScheduledTask
 - VigilEvents
search_terms:
 - autonomous agent
 - always-on agent
 - proactive agent execution
 - how to schedule agent tasks
 - cron jobs for LLM agents
 - tick-driven agent loop
 - persistent agent tasks
 - YAAF continuous mode
 - agent background tasks
 - scheduled prompts
 - long-running agent
 - agent journaling
 - background agent process
stub: false
compiled_at: 2026-04-24T18:21:26.629Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/vigil.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Vigil subsystem provides an autonomous, "always-on" execution mode for YAAF agents [Source 1]. It extends the standard reactive agent model, which primarily responds to user messages, into a proactive engine that can run continuously. Vigil is designed for use cases where an agent needs to perform background tasks, monitor systems, or execute actions on a predefined schedule without direct user interaction for every operation [Source 1].

## Architecture

Vigil's architecture is built upon the base `Agent` class, augmenting it with several key components to enable autonomous operation [Source 1].

1.  **[Autonomous Loop](../concepts/autonomous-loop.md)**: This is a tick-driven execution model. The agent "wakes up" at a configurable interval (`tickInterval`), at which point it receives a periodic prompt. This prompt signals the agent to assess its environment and decide on its next actions, enabling proactive behavior [Source 1].

2.  **[Cron Scheduler](../concepts/cron-scheduler.md)**: Vigil includes a task scheduler that uses standard 5-field [Cron Expression](../concepts/cron-expression.md)s. Developers can schedule one-shot or recurring tasks. These tasks are persisted to disk in the configured `storageDir`, ensuring they survive application restarts [Source 1].

3.  **Brief Output [Channel](../apis/channel.md)**: To communicate results or status updates without requiring a user to be present, Vigil provides a [Structured Output](../concepts/structured-output.md) pathway called the "brief" channel. This allows the agent to send messages that can be captured by an `onBrief` handler or a `brief` event listener, suitable for logging or routing to other systems [Source 1].

4.  **Append-only [Session Journal](../concepts/session-journal.md)**: For [Observability](../concepts/observability.md) and [Memory](../concepts/memory.md), Vigil maintains daily log files in an append-only journal. This journal captures every tick, cron task execution, and brief message, providing a complete record of the agent's autonomous activity [Source 1].

The following diagram illustrates the relationship between Vigil's components and the underlying `AgentRunner` it inherits from the base `Agent` class [Source 1]:

```
┌─────────────────────────────────────────────────────────┐
│ Vigil │
│ │
│ ┌──────────────┐ ┌────────────┐ ┌──────────────┐ │
│ │ Agent loop │ │ Scheduler │ │ Journal │ │
│ │ (tick/cron) │ │ (cron.ts) │ │ (daily log) │ │
│ └──────┬───────┘ └──────┬─────┘ └──────┬───────┘ │
│ └─────────────────►│◄────────────────┘ │
│ ▼ │
│ AgentRunner (inherited from Agent) │
└─────────────────────────────────────────────────────────┘
```

## Integration Points

Vigil integrates with the rest of the framework and external systems in several ways:

*   **Inheritance**: The `Vigil` class extends the core `Agent` class, inheriting its fundamental capabilities for processing prompts and using [Tools](./tools.md) [Source 1].
*   **Event Emitter**: Vigil emits a series of lifecycle events defined by the `VigilEvents` type. Other parts of an application can listen for events such as `tick`, `cron:fire`, `brief`, and `error` to monitor and react to the agent's state [Source 1].
*   **File System**: The subsystem interacts with the local file system via the `storageDir` to persist scheduled tasks and write to the session journal, making its state durable across restarts [Source 1].
*   **Output Handling**: The `onBrief` configuration callback provides a direct integration point for routing the agent's structured output to user interfaces, webhooks, or other services [Source 1].

## Key APIs

The primary public API surface for the Vigil subsystem includes the main class, configuration types, and methods for controlling the agent's lifecycle and schedule.

*   **`Vigil` class**: The main class for instantiating an autonomous agent. It is initialized with a `VigilConfig` object [Source 1].
*   **`vigil()` factory function**: A convenience function for creating a `Vigil` instance, particularly for agents that wake up on a minute-based interval [Source 1].
*   **`agent.start()`**: Starts the autonomous loop, beginning the tick-driven wake-ups and activating the cron scheduler [Source 1].
*   **`agent.stop()`**: Stops the autonomous loop [Source 1].
*   **`agent.schedule(cron: string, prompt: string)`**: Schedules a recurring task to be executed based on the provided Cron Expression [Source 1].
*   **`agent.scheduleOnce(cron: string, prompt: string)`**: Schedules a one-time task [Source 1].
*   **`agent.on(event, handler)`**: Subscribes a handler function to Vigil-specific events, such as `'tick'`, `'cron:fire'`, and `'brief'` [Source 1].
*   **`ScheduledTask` type**: Defines the structure for a scheduled task, including its ID, cron expression, prompt, and metadata [Source 1].
*   **`VigilEvents` type**: An exported type that documents all possible events and their corresponding data payloads, enabling type-safe event handling [Source 1].

## Configuration

Vigil is configured via the `VigilConfig` object, which extends the base `AgentConfig`. Key configuration options specific to Vigil include [Source 1]:

*   **`tickInterval`**: A number specifying the milliseconds between autonomous "tick" probes. If set to `0`, the tick-driven mode is disabled, and the agent will only run based on its cron schedule. The default is `60_000` (1 minute).
*   **`tickPrompt`**: A function that generates the prompt injected on each tick. It receives the current timestamp and tick count. The default is `"<tick timestamp="...">You're awake — what needs attention now?</tick>"`.
*   **`storageDir`**: The file path to a directory for persisting scheduled tasks and the session journal. It defaults to `./.vigil` in the current working directory.
*   **`recurringMaxAgeMs`**: The maximum age in milliseconds for a recurring task before it is automatically expired, unless marked as `permanent`. The default is 7 days.
*   **`onBrief`**: An optional callback function `(message: string) => void` that is called whenever the agent produces output through its brief channel.

An example of minimal configuration for a tick-driven agent:
```typescript
const agent = new Vigil({
  systemPrompt: 'You are a proactive assistant. Check for new work.',
  tools: myTools,
  tickInterval: 60_000, // Wake up every minute
});

await agent.start();
```
[Source 1]

## Sources

[Source 1] `src/vigil.ts`