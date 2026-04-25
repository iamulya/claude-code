---
title: DiscordChannel
summary: The `DiscordChannel` class enables a YAAF agent to interact with Discord using the Discord.js library.
export_name: DiscordChannel
source_file: src/gateway.ts
category: class
entity_type: api
search_terms:
 - Discord bot integration
 - connect agent to Discord
 - Discord.js channel
 - YAAF Discord adapter
 - messaging platform gateway
 - how to use agent in Discord
 - DiscordChannel setup
 - real-time chat agent
 - Discord gateway
 - YAAF channels
 - Discord transport
stub: false
compiled_at: 2026-04-25T00:06:21.245Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md
compiled_from_quality: documentation
confidence: 0.9
---

## Overview

The `DiscordChannel` class is a built-in transport adapter that connects a YAAF [Agent](./agent.md) to the Discord messaging platform [Source 1]. It is part of the [Gateway](./gateway.md) module and uses the Discord.js library to handle communication with the Discord API [Source 1].

To use this channel, an instance of `DiscordChannel` is created and passed to the `channels` array in the [Gateway](./gateway.md) constructor. The gateway then manages the lifecycle of the channel, forwarding user messages from Discord to the agent and sending the agent's responses back to Discord [Source 1].

## Signature / Constructor

`DiscordChannel` is a class that extends the base [Channel](./channel.md) class. The specific constructor options are not detailed in the provided source material, but would typically include authentication tokens and other configuration required by the Discord.js client.

```typescript
import { DiscordChannel } from 'yaaf/gateway';

// Constructor signature is not specified in the source material.
// It would be instantiated with platform-specific configuration.
const discordChannel = new DiscordChannel({
  // e.g., token: process.env.DISCORD_BOT_TOKEN
  /* ... discord-specific options */
});
```

## Examples

The following example demonstrates how to configure a [Gateway](./gateway.md) to use `DiscordChannel`, connecting an agent to a Discord server.

```typescript
import { Gateway, DiscordChannel } from 'yaaf/gateway';
import { Agent } from 'yaaf';

// Assume myAgent is a pre-configured YAAF Agent instance
const myAgent = new Agent({ /* ... agent configuration ... */ });

// Instantiate the DiscordChannel with necessary configuration,
// such as a bot token from environment variables.
const discordChannel = new DiscordChannel({
  token: process.env.DISCORD_BOT_TOKEN,
});

// Create a Gateway to manage the agent and its channels.
const gateway = new Gateway({
  agent: myAgent,
  channels: [discordChannel],
});

// Start the gateway to connect to Discord and begin processing messages.
async function startAgent() {
  await gateway.start();
  console.log('Agent is connected to Discord and listening for messages.');
}

startAgent();
```
[Source 1]

## See Also

*   [Gateway](./gateway.md): The main class for managing agent communication across different platforms.
*   [Channel](./channel.md): The base class for creating custom transport adapters.
*   [ConsoleChannel](./console-channel.md): A built-in channel for interacting with an agent via the command line.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md