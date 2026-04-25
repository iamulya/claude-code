---
title: Channel API
entity_type: api
summary: The abstract base class for all YAAF transport adapters, defining the interface for message handling and sending.
primary_files:
 - src/soul.ts
export_name: Channel
source_file: src/gateway.ts
category: class
search_terms:
 - transport adapter
 - connect to messaging platform
 - custom channel implementation
 - Slack integration
 - Discord bot
 - Telegram bot
 - how to handle incoming messages
 - send agent response
 - Gateway channel
 - message transport layer
 - create new channel
 - WebhookChannel example
 - stdin/stdout
 - ConsoleChannel
stub: false
compiled_at: 2026-04-24T16:54:40.690Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md
compiled_from_quality: documentation
confidence: 0.98
---

## Overview

The `[[[[[[[[Channel]]]]]]]]` class is an abstract base class that serves as a transport adapter, connecting a YAAF agent to an external messaging platform via the `Gateway` [Source 1]. Each Channel implementation is responsible for handling the specific protocol of a platform, such as the Slack Web API, Discord.js, or a simple console interface [Source 1].

To create a custom channel, a developer extends the `Channel` class and implements its abstract methods for starting and stopping the connection, as well as for sending messages. The channel implementation receives messages from its platform, formats them into a `ChannelMessage` object, and forwards them to the agent by calling the protected `onMessage` method inherited from the base class [Source 1].

## Signature / Constructor

`Channel` is an abstract class and cannot be instantiated directly. It must be extended by a concrete implementation.

```typescript
import type { ChannelMessage } from 'yaaf/gateway';

export abstract class Channel {
  // A unique identifier for the channel.
  abstract name: string;

  // Method to initialize the connection to the messaging platform.
  abstract start(): Promise<void>;

  // Method to gracefully terminate the connection.
  abstract stop(): Promise<void>;

  // Method to send a message from the agent to the platform.
  abstract send(channelId: string, text: string): Promise<void>;

  // Protected method provided by the base class to forward incoming messages
  // to the Gateway and the agent.
  protected onMessage(message: ChannelMessage): Promise<string | void>;
}
```

### `ChannelMessage` Type

This is the standardized message format that channels use to communicate with the `Gateway`.

```typescript
export type ChannelMessage = {
  text: string;
  userId: string;
  channelId: string;
};
```

## Methods & Properties

Subclasses of `Channel` must implement the following properties and methods.

### Properties

*   **`name: string`** (abstract)
    A unique string identifier for the channel. This is used internally by the `Gateway`.

### Methods

*   **`start(): Promise<void>`** (abstract)
    This method should contain the logic to initialize the channel and establish a connection with the messaging platform. This could involve starting a web server, connecting a WebSocket, or listening to `stdin` [Source 1].

*   **`stop(): Promise<void>`** (abstract)
    This method should contain the logic to gracefully shut down the channel's connection and release any resources [Source 1].

*   **`send(channelId: string, text: string): Promise<void>`** (abstract)
    The `Gateway` calls this method to send a response from the agent back to the user on the messaging platform. The implementation should use the platform's specific API to deliver the `text` to the given `channelId` [Source 1].

*   **`onMessage(message: ChannelMessage): Promise<string | void>`** (protected)
    This method is provided by the `Channel` base class and should not be overridden. Channel implementations call `this.onMessage()` to pass an incoming message from the platform to the `Gateway` for processing by the agent. It returns a promise that resolves with the agent's response text, if any [Source 1].

## Examples

The following example shows how to create a custom `WebhookChannel` that listens for incoming HTTP requests, processes them, and sends a response back [Source 1].

```typescript
import { Channel, type ChannelMessage } from 'yaaf/gateway';
import http from 'node:http';

// A utility function to read the request body.
async function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => resolve(JSON.parse(body)));
    req.on('error', reject);
  });
}

class WebhookChannel extends Channel {
  // Unique name for this channel type.
  name = 'webhook';
  private server?: http.Server;

  async start(): Promise<void> {
    // Set up an HTTP server to listen for incoming webhooks.
    this.server = http.createServer(async (req, res) => {
      const body = await readBody(req);
      
      // Adapt the incoming request to the standard ChannelMessage format.
      const message: ChannelMessage = {
        text: body.text,
        userId: body.userId,
        channelId: 'webhook', // A static channelId for this simple case.
      };

      // Forward the message to the Gateway/Agent for processing.
      const response = await this.onMessage(message);

      // Send the agent's response back via the HTTP response.
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ response }));
    });

    this.server.listen(8080);
    console.log('WebhookChannel listening on port 8080');
  }

  async stop(): Promise<void> {
    // Gracefully shut down the server.
    this.server?.close();
  }

  async send(channelId: string, text: string): Promise<void> {
    // In a real-world scenario, this might send a response back to a
    // pre-configured response URL provided in the initial webhook.
    // For this example, we log it, as the response is sent synchronously.
    console.log(`[WebhookChannel] SEND to ${channelId}: ${text}`);
  }
}
```

## See Also

*   **Gateway**: The subsystem that manages one or more `Channel` instances to connect an agent to users.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md