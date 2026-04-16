# Gateway & Channels

The Gateway module provides multi-channel transport for delivering agents to messaging platforms.

> **Opt-in import:** `import { Gateway } from 'yaaf/gateway'`

## Architecture

```
User Messages → Channel → Gateway → Agent → Channel → Response
                  ▲                           │
                  │         ┌─────────────────┘
                  │         ▼
              ┌───────┐  ┌───────┐  ┌───────┐
              │Telegram│  │ Slack │  │Discord│
              └───────┘  └───────┘  └───────┘
```

## Channels

A Channel is a transport adapter that connects your agent to a messaging platform:

```typescript
import { Gateway, ConsoleChannel } from 'yaaf/gateway';

// Console channel for development
const consoleChannel = new ConsoleChannel({
  prompt: 'you> ',
});

// Start the gateway
const gateway = new Gateway({
  agent: myAgent,
  channels: [consoleChannel],
});

await gateway.start();
```

### Built-in Channels

| Channel | Platform | Transport |
|---------|----------|-----------|
| `ConsoleChannel` | Terminal | stdin/stdout |
| `TelegramChannel` | Telegram | Bot API |
| `SlackChannel` | Slack | Web API + Events |
| `DiscordChannel` | Discord | Discord.js |

### Custom Channel

```typescript
import { Channel, type ChannelMessage } from 'yaaf/gateway';

class WebhookChannel extends Channel {
  name = 'webhook';

  async start(): Promise<void> {
    // Set up webhook listener
    this.server = http.createServer(async (req, res) => {
      const body = await readBody(req);
      const message: ChannelMessage = {
        text: body.text,
        userId: body.userId,
        channelId: 'webhook',
      };

      // Forward to gateway
      const response = await this.onMessage(message);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ response }));
    });
  }

  async stop(): Promise<void> {
    this.server?.close();
  }

  async send(channelId: string, text: string): Promise<void> {
    // Send response back through webhook
  }
}
```

## Approval Manager

Interactive approval flow for dangerous operations:

```typescript
import { ApprovalManager } from 'yaaf/gateway';

const approvals = new ApprovalManager({
  channel: slackChannel,
  timeout: 300_000,  // 5 minutes
});

// In your permission policy:
permissions.onRequest(async (toolName, args, reason) => {
  return approvals.request({
    tool: toolName,
    arguments: args,
    reason,
    approvers: ['admin-user-id'],
  });
});
```

## Soul Integration

The Soul module defines agent personality via SOUL.md files:

```typescript
import { Soul, Gateway } from 'yaaf/gateway';

const soul = Soul.fromFile('./SOUL.md');

const gateway = new Gateway({
  agent: myAgent,
  channels: [telegramChannel],
  soul,  // Personality applied to all responses
});
```

See [System Prompts](prompts.md) for SOUL.md format.
