---
title: Channel
entity_type: api
summary: Base class for transport adapters that connect agents to specific messaging platforms.
export_name: Channel
source_file: src/gateway.ts
category: interface
stub: false
compiled_at: 2026-04-16T14:07:13.757Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/gateway.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/gateway/channel.ts
confidence: 1
---

## Overview
`Channel` is the core abstraction for transport adapters in the YAAF Gateway module. It provides a unified interface for connecting agents to various messaging platforms such as Telegram, Slack, Discord, or a local terminal. 

Each channel implementation is responsible for the transport layer: establishing connections, listening for inbound messages, formatting responses according to platform requirements, and handling outbound delivery.

## Signature
```typescript
export interface Channel {
  readonly name: string;
  onMessage(handler: MessageHandler): void;
  send(message: OutboundMessage): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  isConnected(): boolean;
}

export type MessageHandler = (message: InboundMessage) => Promise<void>;
```

## Methods & Properties
| Member | Type | Description |
| :--- | :--- | :--- |
| `name` | `readonly string` | A unique identifier for the channel (e.g., 'telegram', 'discord'). |
| `onMessage` | `(handler: MessageHandler) => void` | Registers a callback function. The channel should invoke this handler whenever a new message is received from the platform. |
| `send` | `(message: OutboundMessage) => Promise<void>` | Sends a message from the agent back to the messaging platform. |
| `start` | `() => Promise<void>` | Initializes the channel, such as opening a WebSocket or starting an HTTP server. |
| `stop` | `() => Promise<void>` | Gracefully shuts down the channel and cleans up resources. |
| `isConnected` | `() => boolean` | Returns the current connection status of the channel. |

> [!NOTE]
> There is a discrepancy between the documentation and the source code regarding `onMessage`. The source code defines `onMessage` as a registration method for a handler, while documentation examples sometimes treat it as a method to be called directly to process a message.

## Examples

### Using Built-in Channels
The `ConsoleChannel` is provided for local development and testing via stdin/stdout.

```typescript
import { Gateway, ConsoleChannel } from 'yaaf/gateway';

const consoleChannel = new ConsoleChannel({
  prompt: 'you> ',
});

const gateway = new Gateway({
  agent: myAgent,
  channels: [consoleChannel],
});

await gateway.start();
```

### Implementing a Custom Channel
To support a new platform, implement the `Channel` interface.

```typescript
import { Channel, type MessageHandler, type InboundMessage, type OutboundMessage } from 'yaaf/gateway';
import http from 'http';

class WebhookChannel implements Channel {
  name = 'webhook';
  private handler?: MessageHandler;
  private server?: http.Server;

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    this.server = http.createServer(async (req, res) => {
      const body = await readBody(req); // Helper to parse request
      
      if (this.handler) {
        const message: InboundMessage = {
          text: body.text,
          userId: body.userId,
          channelId: 'webhook',
        };
        await this.handler(message);
      }

      res.writeHead(200);
      res.end();
    });
    this.server.listen(8080);
  }

  async stop(): Promise<void> {
    this.server?.close();
  }

  async send(message: OutboundMessage): Promise<void> {
    // Logic to send the response back to the webhook client
    console.log(`Sending to ${message.channelId}: ${message.text}`);
  }

  isConnected(): boolean {
    return !!this.server?.listening;
  }
}
```

## See Also
- `Gateway`
- `ConsoleChannel`
- `InboundMessage`
- `OutboundMessage`