---
title: ChannelMessage
summary: The `ChannelMessage` type defines the structure of messages exchanged between a `Channel` and the `Gateway`.
export_name: ChannelMessage
source_file: src/gateway.ts
category: type
entity_type: api
search_terms:
 - gateway message format
 - channel communication protocol
 - how to create a custom channel
 - onMessage data structure
 - user message object
 - platform message adapter
 - inbound message type
 - userId channelId text
 - connecting agent to chat
 - transport adapter message
 - Gateway onMessage parameter
 - message payload structure
stub: false
compiled_at: 2026-04-25T00:05:23.883Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md
compiled_from_quality: documentation
confidence: 0.9
---

## Overview

The `ChannelMessage` type is a standardized data structure used within the YAAF framework to represent a message received from an external messaging platform. A [Channel](./channel.md) implementation is responsible for receiving a platform-specific message (e.g., from Slack, Discord, or a custom webhook) and transforming it into a `ChannelMessage` object [Source 1].

This standardized object is then passed to the [Gateway](./gateway.md)'s `onMessage` method, which forwards it to the associated [Agent](./agent.md) for processing. It contains the essential information required to understand and respond to the user, including the message content, the user's identifier, and the identifier of the conversation or channel it originated from [Source 1].

## Signature

`ChannelMessage` is a TypeScript type alias for an object with the following structure:

```typescript
export type ChannelMessage = {
  /**
   * The text content of the message from the user.
   */
  text: string;

  /**
   * A unique identifier for the user who sent the message.
   * This is used to maintain conversation state and apply user-specific policies.
   */
  userId: string;

  /**
   * A unique identifier for the channel, thread, or direct message
   * conversation where the message originated. The agent's response will be
   * sent back to this channelId.
   */
  channelId: string;
};
```

## Examples

The primary use of `ChannelMessage` is within custom [Channel](./channel.md) implementations. The channel's logic will construct a `ChannelMessage` object from the incoming data and pass it to the gateway for processing.

The following example shows a simplified custom `WebhookChannel` that creates a `ChannelMessage` from an incoming HTTP request body [Source 1].

```typescript
import { Channel, type ChannelMessage } from 'yaaf';
import http from 'node:http';

// A hypothetical function to parse the request body
async function readBody(req: http.IncomingMessage): Promise<{ text: string; userId: string; }> {
  // ... implementation to parse JSON body ...
  return { text: '', userId: '' };
}

class WebhookChannel extends Channel {
  name = 'webhook';
  server?: http.Server;

  async start(): Promise<void> {
    this.server = http.createServer(async (req, res) => {
      // Assuming the request body has `text` and `userId` fields
      const body = await readBody(req);

      // 1. Construct the ChannelMessage object
      const message: ChannelMessage = {
        text: body.text,
        userId: body.userId,
        channelId: 'webhook', // For this channel, all messages are in one "channel"
      };

      // 2. Forward the standardized message to the Gateway
      const response = await this.onMessage(message);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ response }));
    });
    // ... server listen logic ...
  }

  // ... other required methods (stop, send) ...
  async stop(): Promise<void> { /* ... */ }
  async send(channelId: string, text: string): Promise<void> { /* ... */ }
}
```

## See Also

-   [Channel](./channel.md): The class responsible for creating `ChannelMessage` objects.
-   [Gateway](./gateway.md): The system that receives `ChannelMessage` objects from channels and routes them to an agent.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md