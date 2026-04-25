---
title: Creating Custom Channels Guide
entity_type: guide
summary: A step-by-step guide to implementing a custom transport adapter for YAAF agents.
difficulty: intermediate
search_terms:
 - custom transport layer
 - how to connect agent to new platform
 - YAAF channel implementation
 - webhook integration for YAAF
 - extending YAAF gateway
 - create new channel adapter
 - connect to unsupported messaging service
 - Channel class example
 - onMessage handler
 - gateway transport adapter
 - custom messaging integration
 - YAAF agent webhook
stub: false
compiled_at: 2026-04-24T18:06:40.683Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md
compiled_from_quality: documentation
confidence: 0.95
---

## Overview

This guide provides a step-by-step walkthrough for creating a custom `[[[[[[[[Channel]]]]]]]]` in YAAF. A Channel is a transport adapter that connects a YAAF agent to an external messaging platform or API endpoint [Source 1]. By implementing the `Channel` abstract class, developers can integrate agents with any service that can send and receive messages.

This guide will use a simple HTTP webhook as an example to demonstrate the core concepts required to build a fully functional custom channel.

## Prerequisites

Before you begin, you should have a YAAF project set up with an initialized agent instance. This guide assumes you have an `myAgent` object ready to be connected to a `Gateway`.

## Step-by-Step

The process involves extending the base `Channel` class and implementing its required methods to handle the lifecycle and message flow for a specific transport.

### 1. Import Core Classes

First, import the necessary `Channel` and `ChannelMessage` types from the `yaaf/gateway` module [Source 1].

```typescript
import { Channel, type ChannelMessage } from 'yaaf/gateway';
import * as http from 'http'; // For the webhook example
```

The `ChannelMessage` type defines the standardized message format that the Gateway expects to receive from any channel.

### 2. Define the Custom Channel Class

Create a new class that extends the abstract `Channel` class. This example creates a `WebhookChannel` [Source 1].

```typescript
class WebhookChannel extends Channel {
  // Implementation details will go here
}
```

### 3. Implement the `name` Property

Set a unique `name` for your channel. This is used for identification and logging purposes.

```typescript
class WebhookChannel extends Channel {
  name = 'webhook';
  // ...
}
```

### 4. Implement the `start` Method

The `start` method is responsible for initializing the connection to the external platform. For a webhook, this involves starting an HTTP server to listen for incoming requests.

Inside this method, you must:
1.  Set up your listener (e.g., an HTTP server, a WebSocket client).
2.  Parse incoming data from the platform into the `ChannelMessage` format. A `ChannelMessage` requires `text`, `userId`, and `channelId`.
3.  Call `this.onMessage(message)` to forward the standardized message to the Gateway, which then passes it to the agent for processing. This method returns a promise that resolves with the agent's response text [Source 1].
4.  Send the agent's response back to the user via the platform's API.

```typescript
class WebhookChannel extends Channel {
  name = 'webhook';
  private server: http.Server | undefined;

  async start(): Promise<void> {
    // A simple function to read the request body
    const readBody = (req: http.IncomingMessage): Promise<any> => {
      return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(JSON.parse(data)));
        req.on('error', err => reject(err));
      });
    };

    this.server = http.createServer(async (req, res) => {
      const body = await readBody(req);
      
      // 1. Parse incoming request into a ChannelMessage
      const message: ChannelMessage = {
        text: body.text,
        userId: body.userId,
        channelId: 'webhook', // A static ID for this example
      };

      // 2. Forward to gateway and wait for the agent's response
      const response = await this.onMessage(message);

      // 3. Send the response back to the caller
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ response }));
    });

    // Start listening on a port
    this.server.listen(8080);
    console.log('WebhookChannel listening on port 8080');
  }
  // ...
}
```

### 5. Implement the `stop` Method

The `stop` method should gracefully shut down any open connections or listeners to ensure a clean exit and prevent resource leaks. For the webhook example, this means closing the HTTP server [Source 1].

```typescript
class WebhookChannel extends Channel {
  // ...
  async stop(): Promise<void> {
    this.server?.close();
    console.log('WebhookChannel stopped.');
  }
  // ...
}
```

### 6. Implement the `send` Method

The `send` method is used for proactive messaging, where the agent initiates a message without a direct preceding user request. The `Gateway` or other parts of the system may call this method. For many simple request/response channels, this might not be used, but it is required to be implemented. The example from the source material leaves this empty, as the response is handled directly in the `start` method's request handler [Source 1].

```typescript
class WebhookChannel extends Channel {
  // ...
  async send(channelId: string, text: string): Promise<void> {
    // In a real-world scenario, you might implement logic here
    // to send a message to a specific user or channel via the webhook's platform.
    // For this example, we do nothing as responses are synchronous.
    console.log(`Proactive send to ${channelId}: ${text}`);
  }
}
```

### 7. Integrate with the Gateway

Finally, instantiate your new custom channel and add it to the `channels` array in the `Gateway` configuration [Source 1].

```typescript
import { Gateway } from 'yaaf/gateway';

// Assume myAgent is an initialized YAAF agent
const myAgent = /* ... */;

const webhookChannel = new WebhookChannel();

const gateway = new Gateway({
  agent: myAgent,
  channels: [webhookChannel],
});

// Start the gateway and the custom channel
await gateway.start();
```

With this setup, the `Gateway` will manage the lifecycle of your `WebhookChannel`, calling its `start` and `stop` methods automatically.

## Common Mistakes

1.  **Forgetting to Call `this.onMessage`**: The most common error is failing to call `this.onMessage(message)` within the listener. This call is what forwards the user's message to the agent. Without it, the agent will never receive any input from the channel.
2.  **Incorrect `ChannelMessage` Mapping**: The object passed to `this.onMessage` must conform to the `ChannelMessage` interface (`text`, `userId`, `channelId`). Mismatching or omitting these fields will cause runtime errors or unexpected behavior.
3.  **Not Implementing `stop`**: Failing to implement the `stop` method can lead to resource leaks, such as open server ports or database connections, after the application is supposed to have shut down.

## Next Steps

*   Explore the source code for built-in channels like `TelegramChannel` or `SlackChannel` for more complex, real-world examples of channel implementation [Source 1].
*   Integrate an `ApprovalManager` with your gateway to add interactive approval flows for sensitive agent operations [Source 1].

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md