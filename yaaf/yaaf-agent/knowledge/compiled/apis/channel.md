---
summary: Interface for implementing transport layers to connect YAAF agents to various chat platforms.
export_name: Channel
source_file: src/gateway/channel.ts
category: interface
title: Channel
entity_type: api
search_terms:
 - connect to chat platform
 - implement new transport layer
 - chat platform integration
 - message transport interface
 - how to add discord support
 - telegram channel implementation
 - whatsapp integration
 - custom message source
 - inbound message handling
 - outbound message sending
 - platform adapter
 - chat gateway
stub: false
compiled_at: 2026-04-24T16:54:27.456Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/channel.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `Channel` interface defines the contract for creating a transport layer that connects a YAAF agent to an external chat platform, such as Discord, Telegram, or Slack [Source 1]. Implementations of this interface are responsible for all platform-specific communication, including:

- Establishing and managing the connection to the platform's API.
- Receiving inbound messages from users.
- Formatting and sending outbound messages from the agent.
- Handling platform-specific authentication and lifecycle events.

A `Channel` implementation is typically used by the `Gateway` class, which orchestrates message flow from one or more channels to a single agent [Source 1].

## Signature

The `Channel` interface is defined as follows [Source 1]:

```typescript
export interface Channel {
  /** Channel identifier (e.g., 'telegram', 'discord', 'whatsapp') */
  readonly name: string;

  /**
   * Register a message handler. The gateway calls this during setup.
   * The channel should invoke the handler for every inbound message.
   */
  onMessage(handler: MessageHandler): void;

  /** Send a message through this channel */
  send(message: OutboundMessage): Promise<void>;

  /** Start the channel (connect, listen for messages) */
  start(): Promise<void>;

  /** Stop the channel (disconnect, clean up) */
  stop(): Promise<void>;

  /** Whether the channel is currently connected */
  isConnected(): boolean;
}

export type MessageHandler = (message: InboundMessage) => Promise<void>;
```

## Methods & Properties

### Properties

- **`name`**: `readonly string`
  A unique, human-readable identifier for the channel, such as `'discord'` or `'telegram'`. This is used for logging and [Session Resolution](../concepts/session-resolution.md) [Source 1].

### Methods

- **`onMessage(handler: MessageHandler): void`**
  Registers a callback function that the `Gateway` provides. The `Channel` implementation must call this handler for every inbound message it receives from the chat platform [Source 1].

- **`send(message: OutboundMessage): Promise<void>`**
  Sends a message from the agent to the chat platform. The implementation is responsible for formatting the `OutboundMessage` payload into a format the platform's API understands [Source 1].

- **`start(): Promise<void>`**
  Initializes the channel, connects to the chat platform's service, and begins listening for incoming messages. This method is called by the `Gateway` [when](./when.md) it starts [Source 1].

- **`stop(): Promise<void>`**
  Gracefully disconnects from the chat platform, stops listening for messages, and cleans up any resources like network connections or timers [Source 1].

- **`isConnected(): boolean`**
  Returns `true` if the channel is currently connected and ready to send or receive messages, and `false` otherwise [Source 1].

## Examples

### Implementing a Custom Channel

The following example shows the basic structure of a class that implements the `Channel` interface. This skeleton can be used as a starting point for integrating a new chat platform.

```typescript
import { Channel, MessageHandler, InboundMessage, OutboundMessage } from 'yaaf';
import { SomeChatPlatformClient } from 'some-chat-platform-sdk';

class MyChatPlatformChannel implements Channel {
  public readonly name = 'my-chat-platform';
  private client: SomeChatPlatformClient;
  private messageHandler?: MessageHandler;

  constructor(apiKey: string) {
    this.client = new SomeChatPlatformClient({ auth: apiKey });
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  async send(message: OutboundMessage): Promise<void> {
    // Platform-specific logic to send a message
    await this.client.sendMessage({
      chatId: message.conversationId,
      text: message.text,
    });
  }

  async start(): Promise<void> {
    // Connect to the platform and set up listeners
    await this.client.connect();
    this.client.on('message', async (platformMessage) => {
      if (this.messageHandler) {
        // Adapt the platform-specific message to the InboundMessage format
        const inboundMessage: InboundMessage = {
          id: platformMessage.id,
          text: platformMessage.content,
          senderId: platformMessage.author.id,
          conversationId: platformMessage.chat.id,
          channel: this.name,
          timestamp: new Date(platformMessage.createdAt),
        };
        await this.messageHandler(inboundMessage);
      }
    });
  }

  async stop(): Promise<void> {
    await this.client.disconnect();
  }

  isConnected(): boolean {
    return this.client.isConnected();
  }
}

// Usage with a Gateway
// const myChannel = new MyChatPlatformChannel('YOUR_API_KEY');
// const gateway = new Gateway({ agent, channels: [myChannel] });
// await gateway.start();
```

## See Also

- `Gateway`: The class that manages one or more `Channel` instances to route messages to an agent.
- `ConsoleChannel`: A simple, built-in `Channel` implementation for testing via the command line console.

## Sources

[Source 1]: src/gateway/channel.ts