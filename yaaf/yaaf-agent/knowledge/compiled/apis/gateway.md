---
title: Gateway
entity_type: api
summary: Orchestrates message flow from multiple Channel instances to a single agent, handling session management and message transformations.
export_name: Gateway
source_file: src/gateway/channel.ts
category: class
search_terms:
 - multi-channel agent
 - connect agent to discord
 - route messages to agent
 - session management for bots
 - message filtering
 - response chunking
 - Slack bot integration
 - Telegram bot framework
 - YAAF transport layer
 - how to use channels
 - inbound message handling
 - agent entry point
 - message transformation hooks
stub: false
compiled_at: 2026-04-24T17:07:43.277Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/channel.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `Gateway` class is an opt-in entry point for routing messages from multiple `Channel` instances to a single agent instance [Source 3]. It acts as a central hub for handling the transport layer of an agent, managing concerns like [Session Resolution](../concepts/session-resolution.md), [Message Filtering](../concepts/message-filtering.md), input/output transformations, and [Error Isolation](../concepts/error-isolation.md) between different communication platforms (e.g., Slack, Discord, Console) [Source 3].

By design, `Gateway` and its related [Utilities](../subsystems/utilities.md) are not included in the main `yaaf` package export. They must be imported explicitly from the `yaaf/gateway` module [when](./when.md) building agents that need to interact with users over multiple Channels [Source 2].

Key responsibilities of the `Gateway` include:
*   Receiving messages from multiple configured Channels [Source 3].
*   Resolving a unique session key for each message to maintain conversational context [Source 3].
*   Filtering inbound messages, for example, to make an agent only respond to direct mentions in a group chat [Source 3].
*   Transforming messages before they reach the agent and after the agent generates a response [Source 3].
*   Isolating errors, ensuring that a failure in one [Channel](./channel.md) does not impact the operation of others [Source 3].

## Signature / Constructor

The `Gateway` is instantiated with a configuration object that defines the agent, the channels it listens on, and various hooks to control message processing.

```typescript
import { GatewayConfig } from 'yaaf/gateway';

export class Gateway {
  constructor(config: GatewayConfig);
}
```

### `GatewayConfig`

The configuration object passed to the `Gateway` constructor has the following properties [Source 3]:

| Property | Type | Description |
| --- | --- | --- |
| `agent` | `{ run(input: string, signal?: AbortSignal): Promise<string> }` | **Required.** The agent instance that will process the inbound messages. |
| `channels` | `Channel[]` | **Required.** An array of channel instances that the gateway will manage. |
| `sessionResolver` | `(message: InboundMessage) => string` | *Optional.* A function to resolve a unique session key from an inbound message. Defaults to isolating sessions per user on each channel (`${channelName}:${senderId}`). |
| `messageFilter` | `(message: InboundMessage) => boolean` | *Optional.* A predicate function to filter inbound messages. Return `true` to process the message or `false` to ignore it. Defaults to processing all messages. |
| `beforeProcess` | `(message: InboundMessage) => string \| Promise<string>` | *Optional.* A hook called before the agent processes a message. It can be used to transform the input text. |
| `afterProcess` | `(response: string, message: InboundMessage) => string \| string[] \| Promise<string \| string[]>` | *Optional.* A hook called after the agent generates a response. It can be used to transform the output, such as chunking it for channels with message length limits. |
| `onError` | `(error: Error, context: { channel: string; message?: InboundMessage }) => void` | *Optional.* An error handler for exceptions that occur during channel communication or message processing. |

## Examples

### Basic Console Gateway

This example demonstrates setting up a `Gateway` to connect a simple agent to the console for interactive testing. It uses the built-in `ConsoleChannel` [Source 3].

```typescript
import { Gateway, ConsoleChannel } from 'yaaf/gateway';
import type { InboundMessage } from 'yaaf/gateway';

// A mock agent for demonstration purposes
const myAgent = {
  async run(input: string): Promise<string> {
    console.log(`[Agent] Received: "${input}"`);
    return `You said: "${input}"`;
  },
};

// A simple channel that reads from and writes to the console
const consoleChannel = new ConsoleChannel();

// Instantiate the Gateway
const gateway = new Gateway({
  agent: myAgent,
  channels: [consoleChannel],
  // Optional: Add a prefix to all agent responses
  afterProcess: (response: string, message: InboundMessage) => {
    return `🤖 Agent Response: ${response}`;
  },
  onError: (error, context) => {
    console.error(`Error in channel ${context.channel}:`, error);
  },
});

// Start the channel to begin listening for messages
async function start() {
  console.log('Starting gateway. Type a message and press Enter. Type "exit" to quit.');
  // The gateway itself doesn't have start/stop; you manage the channels.
  await consoleChannel.start();
}

start();
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway.ts
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/channel.ts