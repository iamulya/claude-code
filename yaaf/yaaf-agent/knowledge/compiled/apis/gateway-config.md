---
summary: Configuration object for initializing the Gateway, specifying agent, channels, and message processing hooks.
export_name: GatewayConfig
source_file: src/gateway/channel.ts
category: type
title: GatewayConfig
entity_type: api
search_terms:
 - gateway setup
 - configure message channels
 - agent routing configuration
 - message processing hooks
 - session management
 - inbound message filtering
 - transform agent input
 - customize agent output
 - gateway error handling
 - channel session resolver
 - beforeProcess hook
 - afterProcess hook
 - messageFilter hook
stub: false
compiled_at: 2026-04-24T17:07:51.972Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/channel.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`GatewayConfig` is a type alias for the configuration object required to initialize a `Gateway` instance. It serves as the central point for defining how the gateway connects an agent to various communication Channels and how it processes messages flowing between them.

This configuration specifies the core components, such as the agent and the Channels, and provides optional hooks to customize the message lifecycle. These hooks allow for advanced behaviors like [Session Management](../subsystems/session-management.md), [Message Filtering](../concepts/message-filtering.md) (e.g., only responding to mentions in a group chat), transforming message content before and after agent processing, and custom error handling.

## Signature

The `GatewayConfig` is a plain object with the following properties [Source 1]:

```typescript
export type GatewayConfig = {
  /** The agent to route messages to */
  agent: { run(input: string, signal?: AbortSignal): Promise<string> };

  /** Channels to listen on */
  [[Channel]]s: Channel[];

  /**
   * Resolve a session key from an inbound message.
   * Default: `${[[Channel]]Name}:${senderId}` (per-[[Channel]]-peer isolation).
   */
  sessionResolver?: (message: InboundMessage) => string;

  /**
   * Filter inbound messages (e.g., only respond to mentions in groups).
   * Return true to process, false to ignore.
   * Default: process all.
   */
  messageFilter?: (message: InboundMessage) => boolean;

  /**
   * Called before the agent processes a message.
   * Can transform the input text.
   */
  beforeProcess?: (message: InboundMessage) => string | Promise<string>;

  /**
   * Called after the agent produces a response.
   * Can transform or chunk the output.
   */
  afterProcess?: (
    response: string,
    message: InboundMessage,
  ) => string | string[] | Promise<string | string[]>;

  /** Error handler for [[Channel]]/processing errors */
  onError?: (error: Error, context: { channel: string; message?: InboundMessage }) => void;
};
```

### Properties

- **`agent`** (required): An object with a `run` method that takes a string input and returns a promise resolving to the agent's string response. This is the agent that will handle all processed messages.
- **`channels`** (required): An array of objects conforming to the `Channel` interface. The gateway will manage these channels, listening for inbound messages and sending outbound responses through them.
- **`sessionResolver`** (optional): A function that takes an `InboundMessage` and returns a unique session key as a string. This is used to maintain conversational state. If not provided, the default resolver creates a key by combining the channel name and the sender's ID (`${channelName}:${senderId}`).
- **`messageFilter`** (optional): A function that takes an `InboundMessage` and returns a boolean. If it returns `false`, the message is ignored by the gateway. If it returns `true` or is not provided, the message is processed. This is useful for ignoring messages that don't meet certain criteria, such as not mentioning the bot in a group chat.
- **`beforeProcess`** (optional): A function that is called with the `InboundMessage` before its text is sent to the agent. It can return a modified string (or a promise resolving to one) to transform the input. For example, it could be used to strip a bot mention from the message text.
- **`afterProcess`** (optional): A function called with the agent's raw string response and the original `InboundMessage`. It can transform the response before it's sent back to the channel. It can return a single string, an array of strings (for chunking long messages), or a promise that resolves to either.
- **`onError`** (optional): A function to handle errors that occur within the gateway or its channels during message processing. It receives the `Error` object and a context object containing the channel name and optionally the message that caused the error.

## Examples

A typical configuration for a gateway that connects a simple agent to a console channel, filters messages to only respond to those starting with "/ask", and adds a prefix to every response.

```typescript
import { Gateway, GatewayConfig, ConsoleChannel, InboundMessage } from 'yaaf';

// A mock agent for demonstration purposes
const myAgent = {
  async run(input: string): Promise<string> {
    return `You said: ${input}`;
  }
};

// A simple channel that reads from and writes to the console
const consoleChannel = new ConsoleChannel();

// The gateway configuration object
const config: GatewayConfig = {
  agent: myAgent,
  channels: [consoleChannel],

  // Only process messages that start with "/ask "
  messageFilter: (message: InboundMessage) => {
    return message.text.startsWith('/ask ');
  },

  // Strip the "/ask " prefix before sending to the agent
  beforeProcess: (message: InboundMessage) => {
    return message.text.substring(5); // length of "/ask "
  },

  // Add a prefix to the agent's response
  afterProcess: (response: string, message: InboundMessage) => {
    return `🤖 Agent Response: ${response}`;
  },

  // Log any errors to the console
  onError: (error, context) => {
    console.error(`Error in channel ${context.channel}:`, error);
  }
};

// The gateway would then be initialized with this config
// const gateway = new Gateway(config);
// gateway.start();
```

## See Also

- `Gateway`: The class that uses this configuration object to manage agent-channel communication.
- `Channel`: The interface that communication channels (like `ConsoleChannel`) must implement.

## Sources

[Source 1]: src/gateway/channel.ts