---
title: Implementing Custom Channels
entity_type: guide
summary: A step-by-step guide on creating custom transport adapters for the YAAF Gateway to support proprietary or niche messaging platforms.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:07:33.256Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/gateway.md
confidence: 1
---

## Overview
In YAAF, a **Channel** is a transport adapter that connects an agent to a specific messaging platform (e.g., Slack, Telegram, or a custom web portal). While YAAF includes several built-in channels, developers can implement custom channels to support proprietary APIs or specialized communication protocols.

This guide demonstrates how to extend the base `Channel` class to create a custom transport layer, handle incoming messages, and deliver agent responses back to the user.

## Prerequisites
- An existing YAAF agent instance.
- The `yaaf/gateway` module installed.
- Basic understanding of the YAAF Gateway architecture, where messages flow from a Channel to the Gateway, then to the Agent, and back through the Channel.

## Step-by-Step

### 1. Extend the Base Channel Class
All custom channels must extend the abstract `Channel` class provided by the gateway module. You must define a unique `name` for the channel.

```typescript
import { Channel, type ChannelMessage } from 'yaaf/gateway';

class MyCustomChannel extends Channel {
  name = 'my-custom-transport';
  
  // Implementation goes here
}
```

### 2. Implement the Lifecycle Methods
The Gateway calls `start()` and `stop()` to manage the channel's connection to the external service.

- **start()**: Use this to initialize listeners, connect to webhooks, or open socket connections.
- **stop()**: Use this to perform cleanup, such as closing server ports or disconnecting clients.

```typescript
async start(): Promise<void> {
  // Example: Initializing a hypothetical server
  this.server = http.createServer(async (req, res) => {
    // Logic to handle incoming requests
  });
  this.server.listen(3000);
}

async stop(): Promise<void> {
  // Ensure resources are released
  await this.server?.close();
}
```

### 3. Handle Incoming Messages
When the custom transport receives a message, it must be converted into a `ChannelMessage` object and passed to the Gateway using `this.onMessage()`. The `onMessage` method is a callback automatically provided by the Gateway when the channel is registered.

```typescript
// Inside the start() method or a request handler
const body = await readBody(req);

const message: ChannelMessage = {
  text: body.text,      // The raw text from the user
  userId: body.userId,  // Unique identifier for the user
  channelId: 'webhook', // Identifier for the specific conversation or room
};

// Forward the message to the Gateway and await the agent's response
const response = await this.onMessage(message);

// Send the response back to the source if the transport is request-response
res.end(JSON.stringify({ response }));
```

### 4. Implement Outbound Messaging
The `send()` method is used by the Gateway to push messages to the user asynchronously (e.g., proactive notifications or multi-part responses).

```typescript
async send(channelId: string, text: string): Promise<void> {
  // Logic to push 'text' to the specific 'channelId' 
  // via the external platform's API
  await externalApi.postMessage({
    to: channelId,
    content: text
  });
}
```

### 5. Register the Channel with the Gateway
Once the custom channel is implemented, pass it to the `Gateway` configuration.

```typescript
import { Gateway } from 'yaaf/gateway';

const myChannel = new MyCustomChannel();

const gateway = new Gateway({
  agent: myAgent,
  channels: [myChannel],
});

await gateway.start();
```

## Configuration Reference

### ChannelMessage Interface
When passing messages to `this.onMessage()`, the object must adhere to the following structure:

| Property | Type | Description |
|----------|------|-------------|
| `text` | `string` | The content of the user's message. |
| `userId` | `string` | The unique ID of the user on the external platform. |
| `channelId` | `string` | The ID of the specific thread, room, or channel. |

## Common Mistakes
1. **Forgetting to await onMessage**: The `onMessage` call triggers the LLM processing chain. Failing to await it may result in empty responses or race conditions in request-response transports.
2. **Hardcoding channelId**: Ensure the `channelId` passed to `onMessage` is preserved or correctly mapped so that the agent can maintain context for specific conversations.
3. **Resource Leaks**: Not implementing the `stop()` method to close active listeners or intervals can prevent the Node.js process from exiting cleanly.

## Next Steps
- Integrate an **Approval Manager** into your channel to handle sensitive tool executions.
- Apply a **Soul** to the Gateway to give your custom channel responses a specific personality.
- Explore built-in channels like `TelegramChannel` or `SlackChannel` for reference implementations.

## Sources
- Source 1: Gateway & Channels (`gateway.md`)---