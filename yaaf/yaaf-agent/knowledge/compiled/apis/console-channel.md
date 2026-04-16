---
summary: A built-in implementation of the Channel interface for local testing via stdin/stdout.
export_name: ConsoleChannel
source_file: src/gateway/channel.ts
category: class
title: ConsoleChannel
entity_type: api
stub: false
compiled_at: 2026-04-16T14:18:31.398Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/gateway/channel.ts
confidence: 1
---

## Overview
The `ConsoleChannel` class is a built-in implementation of the `Channel` interface designed for local development and debugging. It provides a text-based interface that allows developers to interact with an agent directly through the terminal. By reading from `stdin` and writing to `stdout`, it simulates the behavior of a messaging platform without requiring external API keys or network connectivity.

## Signature / Constructor
The `ConsoleChannel` implements the `Channel` interface.

```typescript
export class ConsoleChannel implements Channel {
  readonly name: string;

  onMessage(handler: MessageHandler): void;
  send(message: OutboundMessage): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  isConnected(): boolean;
}
```

## Methods & Properties

| Member | Type | Description |
| :--- | :--- | :--- |
| `name` | `readonly string` | The identifier for the channel, typically set to `'console'`. |
| `onMessage(handler)` | `method` | Registers a `MessageHandler` callback that the channel invokes whenever a new line of text is entered into the terminal. |
| `send(message)` | `method` | Writes an `OutboundMessage` to the standard output (`stdout`). |
| `start()` | `method` | Initializes the channel and begins listening for input from `stdin`. |
| `stop()` | `method` | Stops the channel and ceases listening for terminal input. |
| `isConnected()` | `method` | Returns a boolean indicating whether the channel is currently active and listening for input. |

## Examples

### Basic Usage with Gateway
This example demonstrates how to initialize a `ConsoleChannel` and register it with a `Gateway` to interact with an agent via the terminal.

```typescript
import { Gateway, ConsoleChannel } from './gateway/channel';

// Initialize the console-based channel
const consoleChannel = new ConsoleChannel();

// Configure the gateway with an agent and the console channel
const gateway = new Gateway({
  agent: {
    run: async (input: string) => `Agent received: ${input}`
  },
  channels: [consoleChannel]
});

// Start the gateway to begin processing terminal input
await gateway.start();
```

## See Also
* `Channel`
* `Gateway`