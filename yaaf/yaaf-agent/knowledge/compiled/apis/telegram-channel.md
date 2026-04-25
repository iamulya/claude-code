---
title: TelegramChannel
summary: The `TelegramChannel` class connects a YAAF agent to the Telegram messaging platform using the Bot API.
export_name: TelegramChannel
source_file: src/gateway.ts
category: class
entity_type: api
search_terms:
 - telegram bot integration
 - connect agent to telegram
 - yaaf telegram channel
 - telegram bot api
 - messaging platform adapter
 - how to use telegram with yaaf
 - telegram gateway
 - chat platform integration
 - TelegramChannel class
 - YAAF bot framework
 - Telegram transport
stub: false
compiled_at: 2026-04-25T00:15:18.103Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md
compiled_from_quality: documentation
confidence: 0.9
---

## Overview

The `TelegramChannel` is a built-in [Channel](./channel.md) class that serves as a transport adapter, enabling a YAAF [Agent](./agent.md) to communicate with users on the Telegram messaging platform [Source 1]. It utilizes the official Telegram Bot API for sending and receiving messages [Source 1].

This class is used by instantiating it and passing it to the [Gateway](./gateway.md) constructor's `channels` array. The [Gateway](./gateway.md) then manages the connection and message flow between the agent and the Telegram service [Source 1].

## Signature / Constructor

`TelegramChannel` extends the base [Channel](./channel.md) class [Source 1]. The source material does not provide a detailed constructor signature, but it is instantiated as a class.

```typescript
// Conceptual signature based on usage
import { Channel, ChannelConfig } from 'yaaf/gateway';

interface TelegramChannelConfig extends ChannelConfig {
  // Configuration specific to the Telegram Bot API,
  // such as an API token, would be expected here.
  // The source material does not specify these options.
}

export class TelegramChannel extends Channel {
  constructor(config: TelegramChannelConfig);
}
```

## Methods & Properties

As a subclass of [Channel](./channel.md), `TelegramChannel` implements the standard interface for a channel, including methods like `start()`, `stop()`, and `send()`. The source material does not provide further details on its specific public methods or properties [Source 1].

## Examples

The following example demonstrates how to configure a [Gateway](./gateway.md) to use `TelegramChannel` to connect an agent to Telegram.

```typescript
import { Agent } from 'yaaf';
import { Gateway, TelegramChannel } from 'yaaf/gateway';

// Assume myAgent is a pre-configured YAAF Agent instance
const myAgent = new Agent(/* ... */);

// Instantiate the TelegramChannel
// Note: The specific configuration options (e.g., bot token)
// are not detailed in the source material.
const telegramChannel = new TelegramChannel({
  // ... Telegram-specific configuration
});

// The Gateway manages the agent and its connection channels
const gateway = new Gateway({
  agent: myAgent,
  channels: [telegramChannel],
});

// Start the gateway to begin listening for Telegram messages
async function startApp() {
  await gateway.start();
  console.log('Gateway started, connected to Telegram.');
}

startApp();
```
[Source 1]

## See Also

- [Gateway](./gateway.md): The main component for managing agent connections to external platforms.
- [Channel](./channel.md): The base class and interface for all channel implementations.
- [ConsoleChannel](./console-channel.md): An alternative channel for local development and testing in the terminal.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md