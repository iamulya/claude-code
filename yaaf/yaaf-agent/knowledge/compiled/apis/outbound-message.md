---
export_name: OutboundMessage
source_file: src/gateway/channel.ts
category: type
summary: Represents a message to be sent out through a channel.
title: OutboundMessage
entity_type: api
search_terms:
 - sending messages from agent
 - channel send method
 - agent response format
 - message to send to user
 - gateway output message
 - how to reply to user
 - Channel.send parameter
 - platform message structure
 - outgoing message type
 - YAAF message sending
 - reply structure
 - send data structure
stub: false
compiled_at: 2026-04-25T00:10:44.565Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/channel.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`OutboundMessage` is a type that represents a message intended to be sent from the YAAF framework to an external platform, such as a chat service [Source 1]. It serves as the data payload for the `send` method of the [Channel](./channel.md) interface. A [Channel](./channel.md) implementation is responsible for taking an `OutboundMessage` object, formatting it according to the target platform's requirements, and transmitting it [Source 1].

This type encapsulates all the necessary information for a channel to deliver a message, which might include the recipient's identifier, the message content, and any platform-specific metadata.

## Signature

The specific fields of the `OutboundMessage` type are not defined in the provided source material. However, its usage is defined within the [Channel](./channel.md) interface's `send` method signature [Source 1].

```typescript
// From the Channel interface
// Source: src/gateway/channel.ts

interface Channel {
  // ...
  send(message: OutboundMessage): Promise<void>;
  // ...
}
```

Any object passed to a channel's `send` method must conform to the `OutboundMessage` type.

## Examples

The following example shows a hypothetical implementation of a [Channel](./channel.md) to illustrate how an `OutboundMessage` object is consumed by the `send` method.

```typescript
import { Channel, OutboundMessage } from 'yaaf';

// This is a simplified, hypothetical example.
class MyChatServiceChannel implements Channel {
  readonly name = 'my-chat-service';
  private apiClient: any; // Represents the platform's API client

  constructor() {
    // Initialize the platform's API client
    this.apiClient = {
      sendMessage: async (recipient: string, text: string) => {
        console.log(`Sending "${text}" to ${recipient} via MyChatService.`);
        return Promise.resolve();
      }
    };
  }

  // The send method receives an OutboundMessage object.
  // The structure of OutboundMessage would likely contain fields
  // like 'recipientId' and 'text'.
  async send(message: OutboundMessage): Promise<void> {
    // The implementation would extract data from the message object
    // to make the actual API call.
    // e.g., await this.apiClient.sendMessage(message.recipientId, message.text);
    
    console.log('Received OutboundMessage to send:', message);
    // Assuming message has recipientId and text properties for this example
    // @ts-ignore
    await this.apiClient.sendMessage(message.recipientId, message.text);
  }

  // ... other required Channel methods (onMessage, start, stop, etc.)
  onMessage(handler: (message: any) => Promise<void>): void { /* ... */ }
  async start(): Promise<void> { /* ... */ }
  async stop(): Promise<void> { /* ... */ }
  isConnected(): boolean { return true; }
}
```

## See Also

*   [Channel](./channel.md): The interface that defines the contract for sending and receiving messages, using `OutboundMessage` for sending.
*   [chunkResponse](./chunk-response.md): A utility function that can be used to split a long response into multiple strings, which would then likely be packaged into multiple `OutboundMessage` objects.

## Sources

*   [Source 1]: `src/gateway/channel.ts`