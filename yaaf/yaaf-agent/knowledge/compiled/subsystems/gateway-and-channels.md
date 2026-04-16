---
title: Gateway & Channels
entity_type: subsystem
summary: A logical subsystem providing multi-channel transport for delivering agents to messaging platforms like Slack, Telegram, and Discord.
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
stub: false
compiled_at: 2026-04-16T14:07:01.756Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/gateway.md
confidence: 1
---

## Purpose
The Gateway & Channels subsystem provides a multi-channel transport layer for YAAF agents. It serves as the interface between external messaging platforms and the internal agent logic, allowing a single agent to communicate across multiple services such as Slack, Telegram, Discord, or a terminal console. This subsystem abstracts the platform-specific communication details, providing a unified message format for the agent to process.

## Architecture
The subsystem follows a hub-and-spoke model where the `Gateway` acts as the central orchestrator.

1.  **User Messages**: Inbound messages from external platforms are received by a platform-specific `Channel`.
2.  **Channel Normalization**: The `Channel` converts the platform-specific payload into a standardized `ChannelMessage`.
3.  **Gateway Processing**: The `Gateway` receives the message and routes it to the `Agent`.
4.  **Agent Execution**: The agent processes the message and generates a response.
5.  **Response Routing**: The `Gateway` sends the response back through the appropriate `Channel`.
6.  **Platform Delivery**: The `Channel` delivers the response back to the user on the original platform.

### Component Diagram
```
User Messages → Channel → Gateway → Agent → Channel → Response
                  ▲                           │
                  │         ┌─────────────────┘
                  │         ▼
              ┌───────┐  ┌───────┐  ┌───────┐
              │Telegram│  │ Slack │  │Discord│
              └───────┘  └───────┘  └───────┘
```

## Key APIs

### Gateway
The `Gateway` class is the primary entry point for the subsystem. It is initialized with an agent instance and an array of channels.

```typescript
import { Gateway } from 'yaaf/gateway';

const gateway = new Gateway({
  agent: myAgent,
  channels: [consoleChannel],
});

await gateway.start();
```

### Channel
The `Channel` is an abstract base class used to create transport adapters. YAAF includes several built-in channels:

| Channel | Platform | Transport |
|---------|----------|-----------|
| `ConsoleChannel` | Terminal | stdin/stdout |
| `TelegramChannel` | Telegram | Bot API |
| `SlackChannel` | Slack | Web API + Events |
| `DiscordChannel` | Discord | Discord.js |

### ApprovalManager
The `ApprovalManager` provides an interactive flow for operations that require human intervention (e.g., dangerous tool executions). It can be integrated into permission policies to pause execution until a user approves the action via a specific channel.

```typescript
import { ApprovalManager } from 'yaaf/gateway';

const approvals = new ApprovalManager({
  channel: slackChannel,
  timeout: 300_000, // 5 minutes
});
```

### Soul
The `Soul` class manages agent personality by loading configurations from `SOUL.md` files. When integrated with the `Gateway`, the personality is applied to all outgoing responses.

```typescript
import { Soul, Gateway } from 'yaaf/gateway';

const soul = Soul.fromFile('./SOUL.md');
const gateway = new Gateway({
  agent: myAgent,
  channels: [telegramChannel],
  soul,
});
```

## Extension Points

### Custom Channels
Developers can extend the `Channel` class to support additional messaging platforms or custom protocols. A custom channel must implement `start()`, `stop()`, and `send()` methods, and invoke `this.onMessage()` when a new message is received.

```typescript
import { Channel, type ChannelMessage } from 'yaaf/gateway';

class WebhookChannel extends Channel {
  name = 'webhook';

  async start(): Promise<void> {
    // Implementation for starting the listener
    // When a message arrives:
    // const response = await this.onMessage(message);
  }

  async stop(): Promise<void> {
    // Implementation for cleanup
  }

  async send(channelId: string, text: string): Promise<void> {
    // Implementation for sending messages back to the platform
  }
}
```

## Sources
- Source 1: `gateway.md` (YAAF Documentation)