---
summary: Configuration interface for the Heartbeat class, specifying agent integration and callbacks.
export_name: HeartbeatConfig
source_file: src/automation/heartbeat.ts
category: type
title: HeartbeatConfig
entity_type: api
search_terms:
 - heartbeat setup
 - configure scheduled tasks
 - agent scheduling options
 - onOutput callback
 - onError callback
 - cron job agent
 - proactive agent configuration
 - standing orders setup
 - checkIntervalMs setting
 - how to connect agent to heartbeat
 - heartbeat agent runner
 - scheduled task error handling
stub: false
compiled_at: 2026-04-24T17:11:37.654Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/automation/heartbeat.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`HeartbeatConfig` is a TypeScript type alias that defines the configuration object required to instantiate the `Heartbeat` class. It serves as the primary integration point between an agent, the scheduling system, and the application's output channels.

This configuration specifies which agent to invoke for scheduled tasks, how to handle the agent's output, how to manage errors, and the frequency at which to check for pending tasks. A valid `HeartbeatConfig` object is mandatory [when](./when.md) creating a new `Heartbeat` instance.

## Signature

The `HeartbeatConfig` type is defined as follows:

```typescript
export type HeartbeatConfig = {
  /** The agent to invoke for scheduled tasks */
  agent: { run(input: string, signal?: AbortSignal): Promise<string> };

  /** Called with the agent's output after a scheduled run */
  onOutput: (text: string, task: ScheduledTask) => Promise<void>;

  /** Called when a scheduled task errors */
  onError?: (error: Error, task: ScheduledTask) => void;

  /** Check interval in ms (how often to evaluate schedules). Default: 60000 */
  checkIntervalMs?: number;
};
```

### Properties

- **`agent`** (required)
  - An object that exposes an asynchronous `run` method. This is the agent runner that the `Heartbeat` will invoke to execute the prompts of scheduled tasks. The `run` method must accept a string `input` (the prompt) and an optional `AbortSignal`, and it must return a `Promise<string>` containing the agent's final output.

- **`onOutput`** (required)
  - An asynchronous callback function that is executed whenever a scheduled task completes successfully. It receives the agent's string output (`text`) and the `ScheduledTask` object that was executed. This function is the intended place to forward the agent's response to a user, for example, by calling a messaging gateway.

- **`onError`** (optional)
  - An optional callback function for handling errors that occur during a task's execution. It receives the `Error` object and the `ScheduledTask` that failed. If not provided, errors will be silently ignored by the `Heartbeat` instance.

- **`checkIntervalMs`** (optional)
  - The interval, in milliseconds, at which the `Heartbeat` system checks its list of tasks to see if any are due to run based on their cron schedules.
  - **Default**: `60000` (60 seconds).

## Examples

The following example demonstrates how to create a `HeartbeatConfig` object to configure a `Heartbeat` instance.

```typescript
import { Heartbeat, HeartbeatConfig, ScheduledTask } from 'yaaf';

// 1. Define a mock agent runner that conforms to the required interface.
const myAgentRunner = {
  async run(input: string, signal?: AbortSignal): Promise<string> {
    console.log(`Agent is processing prompt: "${input}"`);
    // In a real application, this would invoke an LLM.
    return `This is the agent's response to your scheduled task.`;
  }
};

// 2. Define a mock output handler (e.g., a messaging gateway).
const myGateway = {
  async send(message: { text: string; recipient: string }) {
    console.log(`Sending to ${message.recipient}: ${message.text}`);
  }
};

// 3. Create the HeartbeatConfig object.
const config: HeartbeatConfig = {
  agent: myAgentRunner,
  onOutput: async (text: string, task: ScheduledTask) => {
    console.log(`Task '${task.id}' completed successfully.`);
    await myGateway.send({
      text: text,
      recipient: 'user123'
    });
  },
  onError: (error: Error, task: ScheduledTask) => {
    console.error(`Task '${task.id}' failed:`, error.message);
  },
  checkIntervalMs: 30000 // Check for due tasks every 30 seconds.
};

// 4. Use the config to create a Heartbeat instance.
const heartbeat = new Heartbeat(config);

// Now you can add tasks and start the heartbeat.
// heartbeat.addTask({ ... });
// heartbeat.start();
```

## Sources

- [Source 1]: `src/automation/heartbeat.ts`