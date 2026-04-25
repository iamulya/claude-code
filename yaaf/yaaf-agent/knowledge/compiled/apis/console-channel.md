---
summary: A simple Channel implementation for console-based interaction, useful for testing and development.
export_name: ConsoleChannel
source_file: src/gateway/channel.ts
category: class
title: ConsoleChannel
entity_type: api
search_terms:
 - console interaction
 - stdin stdout channel
 - testing agent locally
 - development channel
 - command line agent
 - how to test a yaaf agent
 - terminal input for agent
 - local development setup
 - simple channel implementation
 - debugging agent
 - yaaf gateway example
 - CLI agent interface
stub: false
compiled_at: 2026-04-24T16:57:33.952Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/channel.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`Console[[[[[[[[Channel]]]]]]]]` is a basic implementation of the `Channel` interface designed for local development and testing [Source 2]. It provides a way to interact with a YAAF agent directly from the command line by reading user input from standard input (`stdin`) and writing the agent's responses to standard output (`stdout`) [Source 2].

This class is part of the optional Gateway subsystem and must be imported explicitly from `yaaf/gateway` [Source 1]. It is typically used with the `Gateway` class to quickly set up a local interactive session with an agent without needing to configure external chat platforms or transport layers.

## Constructor

The `ConsoleChannel` is instantiated without any parameters.

```typescript
import { ConsoleChannel } from 'yaaf/gateway';

const consoleChannel = new ConsoleChannel();
```

## Methods & Properties

As an implementation of the `Channel` interface, `ConsoleChannel` exposes the following public members [Source 2].

### Properties

#### name
A read-only string identifier for the Channel. For `ConsoleChannel`, this is typically a static value like `'console'`.

```typescript
readonly name: string;
```

### Methods

#### onMessage()
Registers a handler function that the `Gateway` provides. `ConsoleChannel` invokes this handler for each line of text received from `stdin`.

```typescript
onMessage(handler: MessageHandler): void;
```

#### send()
Sends an outbound message to the user by writing its content to `stdout`.

```typescript
send(message: OutboundMessage): Promise<void>;
```

#### start()
Begins listening for input on `stdin`. This method is called by the `Gateway` [when](./when.md) it starts.

```typescript
start(): Promise<void>;
```

#### stop()
Stops listening for input and performs any necessary cleanup.

```typescript
stop(): Promise<void>;
```

#### isConnected()
Returns a boolean indicating whether the channel is currently active and listening for input.

```typescript
isConnected(): boolean;
```

## Examples

The most common use case for `ConsoleChannel` is to create a simple, interactive command-line interface for an agent using the `Gateway`.

```typescript
import { Gateway, ConsoleChannel } from 'yaaf/gateway';

// 1. Define a mock agent for demonstration
const myAgent = {
  async run(input: string): Promise<string> {
    return `You said: ${input}`;
  }
};

// 2. Instantiate the ConsoleChannel
const channel = new ConsoleChannel();

// 3. Create a Gateway to route messages from the channel to the agent
const gateway = new Gateway({
  agent: myAgent,
  channels: [channel],
});

// 4. Start the gateway
async function main() {
  console.log("Agent is running. Type a message and press Enter. Press Ctrl+C to exit.");
  await gateway.start();
}

main();

// When you run this, you can type in the console:
// > hello world
// The agent will respond:
// Agent: You said: hello world
```

## See Also

- `Gateway`: The class that manages one or more `Channel` instances to route messages to an agent.
- `Channel`: The interface that `ConsoleChannel` implements, defining the contract for all communication channels.

## Sources

[Source 1]: src/gateway.ts
[Source 2]: src/gateway/channel.ts