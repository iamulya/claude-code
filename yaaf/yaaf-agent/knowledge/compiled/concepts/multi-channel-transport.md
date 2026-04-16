---
title: Multi-channel Transport
entity_type: concept
summary: The architectural pattern of abstracting messaging platform specifics to allow an agent to communicate across different interfaces (Slack, Discord, Web) using a unified interface.
stub: false
compiled_at: 2026-04-16T14:07:23.778Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/gateway.md
confidence: 0.9
---

---
title: "Multi-channel Transport"
entity_type: "concept"
summary: "The architectural pattern of abstracting messaging platform specifics to allow an agent to communicate across different interfaces (Slack, Discord, Web) using a unified interface."
related_subsystems:
  - "Gateway"

## What It Is
Multi-channel transport is an architectural pattern in YAAF that decouples an agent's core logic from the specific communication protocols of messaging platforms. By providing a unified abstraction layer, the framework allows a single agent to interact with users across diverse environments—such as terminal consoles, Slack, Telegram, or Discord—without requiring modifications to the agent's internal processing or personality definitions.

This abstraction is primarily handled by the **Gateway** module, which serves as the bridge between the agent and various external interfaces.

## How It Works in YAAF
The transport system relies on two primary components: the `Gateway` and the `Channel`.

### The Gateway
The `Gateway` acts as the central orchestrator. It manages the lifecycle of the agent and its associated channels. When a message is received from any configured channel, the Gateway routes it to the agent, processes the response, and ensures the response is delivered back through the correct channel.

### Channels
A `Channel` is a transport adapter that implements the specific logic required to communicate with a particular platform. It handles the normalization of incoming messages into a standard format and the delivery of outgoing messages.

The message flow follows this path:
`User Messages` → `Channel` → `Gateway` → `Agent` → `Channel` → `Response`

### Built-in Channels
YAAF provides several pre-configured channels:

| Channel | Platform | Transport |
|---------|----------|-----------|
| `ConsoleChannel` | Terminal | stdin/stdout |
| `TelegramChannel` | Telegram | Bot API |
| `SlackChannel` | Slack | Web API + Events |
| `DiscordChannel` | Discord | Discord.js |

### Extended Capabilities
The transport layer also supports advanced interaction patterns:
*   **Approval Manager**: An interactive flow that allows agents to request human permission for dangerous operations (e.g., tool execution) directly through a channel like Slack.
*   **Soul Integration**: The ability to apply a consistent personality (defined via `SOUL.md` files) across all transport channels simultaneously.

## Configuration
Developers configure multi-channel transport by instantiating a `Gateway` and providing it with an agent and an array of channel instances.

### Basic Gateway Setup
```typescript
import { Gateway, ConsoleChannel } from 'yaaf/gateway';

// Console channel for development
const consoleChannel = new ConsoleChannel({
  prompt: 'you> ',
});

// Start the gateway with the agent and selected channels
const gateway = new Gateway({
  agent: myAgent,
  channels: [consoleChannel],
});

await gateway.start();
```

### Implementing a Custom Channel
To support a new platform, developers can extend the base `Channel` class and implement the `start`, `stop`, and `send` methods.

```typescript
import { Channel, type ChannelMessage } from 'yaaf/gateway';

class WebhookChannel extends Channel {
  name = 'webhook';

  async start(): Promise<void> {
    // Set up platform-specific listener (e.g., HTTP server)
    this.server = http.createServer(async (req, res) => {
      const body = await readBody(req);
      const message: ChannelMessage = {
        text: body.text,
        userId: body.userId,
        channelId: 'webhook',
      };

      // Forward the normalized message to the gateway
      const response = await this.onMessage(message);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ response }));
    });
  }

  async stop(): Promise<void> {
    this.server?.close();
  }

  async send(channelId: string, text: string): Promise<void> {
    // Logic to send the response back to the platform
  }
}
```

## Sources
- `gateway.md`