---
summary: Type definition for functions that handle inbound messages from a channel.
export_name: MessageHandler
source_file: src/gateway/channel.ts
category: type
title: MessageHandler
entity_type: api
search_terms:
 - inbound message handler
 - channel message callback
 - how to process incoming messages
 - onMessage handler type
 - gateway message processing
 - channel event listener
 - asynchronous message function
 - InboundMessage processing
 - YAAF channel integration
 - message routing function
 - handle new chat message
stub: false
compiled_at: 2026-04-24T17:22:10.681Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/channel.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`MessageHandler` is a TypeScript type alias that defines the signature for a function responsible for processing a single inbound message. It serves as the primary callback mechanism between a `[[[[[[[[Channel]]]]]]]]` and the `Gateway`.

A `Channel` implementation receives a `MessageHandler` function from the `Gateway` via its `onMessage` method during setup. The Channel is then responsible for invoking this handler for every message it receives from its underlying platform (e.g., Discord, Telegram). The handler's logic, provided by the `Gateway`, orchestrates [Message Filtering](../concepts/message-filtering.md), [Session Resolution](../concepts/session-resolution.md), and agent invocation [Source 1].

Because the function returns a `Promise<void>`, message handling is an asynchronous operation, allowing for I/O-bound tasks like calling an [LLM](../concepts/llm.md) agent without blocking the channel's event loop [Source 1].

## Signature

The `MessageHandler` is defined as a function type that accepts one argument and returns a `Promise<void>` [Source 1].

```typescript
export type MessageHandler = (message: InboundMessage) => Promise<void>;
```

**Parameters:**

*   `message`: `InboundMessage`
    *   An object representing a message received from the channel. It contains details such as the content, sender, and conversation context.

**Returns:**

*   `Promise<void>`
    *   A promise that resolves [when](./when.md) the message has been processed. It does not return a value.

## Examples

### Channel Implementation Usage

A custom `Channel` implementation would store the handler provided by the `Gateway` and call it whenever a new message arrives from the platform.

```typescript
import { Channel, MessageHandler, InboundMessage, OutboundMessage } from 'yaaf';

class MyCustomChannel implements Channel {
  readonly name = 'my-custom-channel';
  private handler: MessageHandler | null = null;

  // The Gateway calls this method to register its handler.
  onMessage(handler: MessageHandler): void {
    this.handler = handler;
    console.log('Message handler registered for MyCustomChannel.');
  }

  // This method is called by the channel's internal logic when a message is received.
  private async onPlatformMessage(platformPayload: any): Promise<void> {
    if (!this.handler) {
      console.warn('No message handler registered. Ignoring message.');
      return;
    }

    // Transform the platform-specific payload into a generic InboundMessage.
    const inboundMessage: InboundMessage = {
      // ... map fields from platformPayload
    };

    // Invoke the Gateway's handler to process the message.
    await this.handler(inboundMessage);
  }

  // Other required Channel methods...
  async send(message: OutboundMessage): Promise<void> { /* ... */ }
  async start(): Promise<void> { /* ... */ }
  async stop(): Promise<void> { /* ... */ }
  isConnected(): boolean { return true; }
}
```

## See Also

*   `Channel`: The interface that uses `MessageHandler` to receive messages from the `Gateway`.
*   `Gateway`: The class that provides the concrete implementation of the `MessageHandler` to channels.

## Sources

*   [Source 1] `src/gateway/channel.ts`