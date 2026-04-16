---
title: Gateway
entity_type: api
summary: The main entry point for connecting agents to multiple communication channels simultaneously.
export_name: Gateway
source_file: src/gateway.ts
category: class
stub: false
compiled_at: 2026-04-16T14:07:11.209Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/gateway.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/gateway.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/gateway/channel.ts
confidence: 1
---

## Overview
The `Gateway` class is an opt-in entry point for the YAAF transport layer. It acts as a router that connects a single agent to multiple communication platforms (Channels) such as Telegram, Slack, Discord, or a local console. 

The Gateway handles the lifecycle of attached channels, manages session resolution (isolating conversations by user or group), filters inbound messages, and processes outbound responses—including chunking long messages to meet platform-specific character limits. It is designed for production environments where error isolation is required; a failure in one channel does not affect the operation of others.

## Signature / Constructor

The `Gateway` is initialized with a configuration object that defines the agent, the transport channels, and optional middleware for message processing.

```typescript
export class Gateway {
  constructor(config: GatewayConfig);
}

export type GatewayConfig = {
  /** The agent to route messages to */
  agent: { run(input: string, signal?: AbortSignal): Promise<string> };
  
  /** Channels to listen on */
  channels: Channel[];
  
  /** 
   * Resolve a session key from an inbound message. 
   * Default: `${channelName}:${senderId}` 
   */
  sessionResolver?: (message: InboundMessage) => string;
  
  /** 
   * Filter inbound messages. Return true to process, false to ignore. 
   */
  messageFilter?: (message: InboundMessage) => boolean;
  
  /** 
   * Called before the agent processes a message to transform input text. 
   */
  beforeProcess?: (message: InboundMessage) => string | Promise<string>;
  
  /** 
   * Called after the agent produces a response to transform or chunk output. 
   */
  afterProcess?: (response: string, message: InboundMessage) => string | string[] | Promise<string | string[]>;
  
  /** Error handler for channel or processing errors */
  onError?: (error: Error, context: { channel: string; message?: InboundMessage }) => void;
  
  /** Optional personality definition applied to responses */
  soul?: Soul;
};
```

## Methods & Properties

### start()
Starts the gateway and invokes the `start()` method on all registered channels to begin listening for inbound messages.
- **Signature**: `start(): Promise<void>`

### stop()
Stops the gateway and all attached channels, performing necessary cleanup and disconnecting from external APIs.
- **Signature**: `stop(): Promise<void>`

## Examples

### Basic Multi-Channel Setup
This example demonstrates connecting an agent to both a console for local testing and a Telegram channel.

```typescript
import { Gateway, ConsoleChannel, TelegramChannel } from 'yaaf/gateway';

const gateway = new Gateway({
  agent: myAgent,
  channels: [
    new ConsoleChannel({ prompt: 'you> ' }),
    new TelegramChannel({ token: process.env.TELEGRAM_TOKEN })
  ],
});

await gateway.start();
```

### Custom Message Filtering
Filtering messages to ensure the agent only responds to specific criteria, such as ignoring messages from other bots.

```typescript
const gateway = new Gateway({
  agent: myAgent,
  channels: [slackChannel],
  messageFilter: (msg) => {
    // Only process messages that aren't from bots
    return !msg.isBot;
  },
  onError: (err, ctx) => {
    console.error(`Error on channel ${ctx.channel}:`, err);
  }
});
```

### Integration with Soul
Applying a personality definition to all responses routed through the gateway.

```typescript
import { Soul, Gateway } from 'yaaf/gateway';

const soul = Soul.fromFile('./SOUL.md');

const gateway = new Gateway({
  agent: myAgent,
  channels: [discordChannel],
  soul,
});
```

## See Also
- `Channel`: The interface used to implement new platform adapters.
- `ConsoleChannel`: A built-in implementation for terminal-based interaction.
- `ApprovalManager`: A utility for handling interactive permission requests through Gateway channels.