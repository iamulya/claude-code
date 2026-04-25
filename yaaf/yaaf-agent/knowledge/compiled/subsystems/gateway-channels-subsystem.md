---
title: Gateway & Channels Subsystem
entity_type: subsystem
summary: Provides multi-channel transport for delivering agents to messaging platforms.
primary_files:
 - src/gateway.ts
exports:
 - Gateway
 - Channel
 - ConsoleChannel
 - TelegramChannel
 - SlackChannel
 - DiscordChannel
 - ApprovalManager
 - Soul
search_terms:
 - connect agent to slack
 - discord bot integration
 - telegram agent
 - multi-channel agent
 - messaging platform adapter
 - console agent for development
 - how to create a custom channel
 - agent transport layer
 - interactive tool approval
 - ApprovalManager
 - agent personality
 - Soul integration
 - YAAF gateway
stub: false
compiled_at: 2026-04-24T18:12:40.486Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md
compiled_from_quality: documentation
confidence: 0.98
---

## Purpose

The Gateway & [Channel](../apis/channel.md)s subsystem provides a multi-Channel transport layer for deploying YAAF agents to various messaging platforms [Source 1]. It abstracts the specifics of each platform's API, allowing an agent to communicate with users over different transports like a terminal console, Slack, or Telegram using a unified interface [Source 1].

## Architecture

The subsystem is centered around a `Gateway` that manages one or more `Channel` instances. The flow of communication is as follows: a user sends a message on a platform, the corresponding Channel adapter receives it and forwards it to the Gateway. The Gateway then passes the message to the agent for processing. The agent's response is sent back through the Gateway to the originating Channel, which delivers it to the user [Source 1].

```
User Messages → Channel → Gateway → Agent → Channel → Response
                  ▲                           │
                  │         ┌─────────────────┘
                  │         ▼
              ┌───────┐  ┌───────┐  ┌───────┐
              │Telegram│  │ Slack │  │Discord│
              └───────┘  └───────┘  └───────┘
```

Each channel acts as a transport-specific adapter for a platform like Slack, Discord, or a simple command-line interface [Source 1].

## Integration Points

The Gateway subsystem integrates with other parts of the framework to enhance agent functionality:

*   **[ApprovalManager](../apis/approval-manager.md)**: This component provides an interactive approval flow for potentially dangerous operations. It integrates with a channel (e.g., `SlackChannel`) to send approval requests to designated approvers and wait for a response. This is typically used within a permission policy to gate tool usage [Source 1].
*   **[Soul](../apis/soul.md)**: The Soul module, which defines an agent's personality via `SOUL.md` files, can be integrated directly with the Gateway. [when](../apis/when.md) a `Soul` instance is provided to the Gateway, its personality is applied to all agent responses sent through any of the configured channels [Source 1].

## Key APIs

The primary APIs for this subsystem are available via the `yaaf/gateway` import path [Source 1].

*   **`Gateway`**: The main class that orchestrates the agent and its channels. It is responsible for starting and stopping the connections and routing messages between the agent and the channels.
*   **`Channel`**: The abstract base class for all channel adapters. It defines the interface for starting, stopping, sending messages, and handling incoming messages.
*   **Built-in Channels**: YAAF provides several pre-built channels [Source 1]:
    *   `ConsoleChannel`: For interacting with an agent via the terminal (stdin/stdout).
    *   `TelegramChannel`: Connects to the Telegram Bot API.
    *   `SlackChannel`: Connects to the Slack Web API and Events API.
    *   `DiscordChannel`: Integrates with Discord via the Discord.js library.
*   **`ApprovalManager`**: A class that facilitates interactive approval flows for actions requiring human oversight. It uses a channel to communicate with approvers.
*   **`Soul`**: A class that encapsulates an agent's personality, loaded from a `SOUL.md` file, which can be applied at the Gateway level.

## Configuration

The Gateway is configured by instantiating the `Gateway` class with an agent and an array of channel instances [Source 1].

```typescript
import { Gateway, ConsoleChannel } from 'yaaf/gateway';

// An instance of a YAAF agent
const myAgent = /* ... */;

// Configure a channel for development
const consoleChannel = new ConsoleChannel({
  prompt: 'you> ',
});

// Configure the gateway
const gateway = new Gateway({
  agent: myAgent,
  channels: [consoleChannel],
});

// Start the gateway to begin listening for messages
await gateway.start();
```

The `ApprovalManager` is configured separately and then used within other parts of the application, such as a permission policy [Source 1].

```typescript
import { ApprovalManager } from 'yaaf/gateway';

const approvals = new ApprovalManager({
  channel: slackChannel, // A configured channel instance
  timeout: 300_000,      // 5 minutes
});
```

To apply a consistent personality to an agent, a `Soul` instance is passed during Gateway configuration [Source 1].

```typescript
import { Soul, Gateway } from 'yaaf/gateway';

const soul = Soul.fromFile('./SOUL.md');

const gateway = new Gateway({
  agent: myAgent,
  channels: [telegramChannel],
  soul,  // Personality applied to all responses
});
```

## Extension Points

The primary extension point is the creation of custom `Channel` implementations to support new messaging platforms or transports not included by default. This is achieved by extending the base `Channel` class and implementing its required methods: `start`, `stop`, and `send`. The custom channel must also call `this.onMessage(message)` to forward incoming messages to the Gateway [Source 1].

The following example demonstrates a custom channel for a generic webhook [Source 1]:

```typescript
import { Channel, type ChannelMessage } from 'yaaf/gateway';
import http from 'http';

class WebhookChannel extends Channel {
  name = 'webhook';
  private server: http.Server;

  async start(): Promise<void> {
    // Set up webhook listener
    this.server = http.createServer(async (req, res) => {
      const body = await readBody(req);
      const message: ChannelMessage = {
        text: body.text,
        userId: body.userId,
        channelId: 'webhook',
      };

      // Forward to gateway for processing by the agent
      const response = await this.onMessage(message);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ response }));
    });
    // ... start listening on a port
  }

  async stop(): Promise<void> {
    this.server?.close();
  }

  async send(channelId: string, text: string): Promise<void> {
    // Logic to send a response back through the webhook, if applicable
  }
}
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md