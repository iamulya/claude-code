---
title: Gateway API
entity_type: api
summary: The main class for orchestrating multi-channel communication between users and YAAF agents.
export_name: Gateway
source_file: src/gateway.ts
category: class
search_terms:
 - multi-channel agent
 - connect agent to slack
 - connect agent to discord
 - connect agent to telegram
 - messaging platform integration
 - how to deploy a yaaf agent
 - transport layer for agents
 - user communication gateway
 - channel adapters
 - agent input/output
 - console channel
 - webhook channel
 - agent personality
 - start agent server
stub: false
compiled_at: 2026-04-24T17:07:43.199Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md
compiled_from_quality: documentation
confidence: 0.98
---

## Overview

The `Gateway` class is the central component for managing multi-[Channel](./channel.md) communication between users and a YAAF agent. It acts as a transport layer, receiving messages from various messaging platforms via `Channel` adapters, forwarding them to the agent for processing, and sending the agent's responses back to the user through the originating channel [Source 1].

The typical data flow is as follows [Source 1]:
`User Message → Channel → Gateway → Agent → Channel → Response`

This architecture allows a single agent instance to be accessible across multiple platforms like Slack, Discord, Telegram, or a simple console interface simultaneously [Source 1].

## Constructor

The `Gateway` is instantiated with a configuration object that specifies the agent to run and the channels to connect to [Source 1].

```typescript
import { Gateway } from 'yaaf/gateway';
import type { Agent } from 'yaaf';
import type { Channel } from 'yaaf/gateway';
import type { [[[[[[[[Soul]]]]]]]] } from 'yaaf/gateway';

interface GatewayConfig {
  /** The agent instance that will handle incoming messages. */
  agent: Agent<any, any>;

  /** An array of channel instances to connect to. */
  channels: Channel[];

  /** An optional Soul instance to apply a consistent personality to all agent responses. */
  soul?: Soul;
}

const gateway = new Gateway(config: GatewayConfig);
```

## Methods & Properties

### start()

Starts the gateway and all its configured channels, beginning to listen for incoming messages [Source 1].

```typescript
async start(): Promise<void>;
```

### stop()

Stops the gateway and all its channels, gracefully shutting down connections [Source 1]. While not explicitly shown in the `Gateway` example, the `Channel` interface includes a `stop` method, implying a corresponding lifecycle method on the `Gateway` [Source 1].

```typescript
async stop(): Promise<void>;
```

## Examples

### Basic Usage with [ConsoleChannel](./console-channel.md)

This example demonstrates setting up a `Gateway` to interact with an agent via the command line for development and testing purposes [Source 1].

```typescript
import { Gateway, ConsoleChannel } from 'yaaf/gateway';
import { myAgent } from './my-agent'; // Assuming myAgent is an exported Agent instance

// The ConsoleChannel is a built-in channel for terminal interaction.
const consoleChannel = new ConsoleChannel({
  prompt: 'you> ',
});

// The Gateway orchestrates communication between the agent and the channel.
const gateway = new Gateway({
  agent: myAgent,
  channels: [consoleChannel],
});

// Start the gateway to begin listening for input from the console.
await gateway.start();
```

### Integrating a Soul for Personality

A `Soul` can be provided to the `Gateway` to apply a consistent personality, defined in a `SOUL.md` file, to all agent responses across all channels [Source 1].

```typescript
import { Gateway, Soul } from 'yaaf/gateway';
import { myAgent } from './my-agent';
import { telegramChannel } from './channels'; // Assuming a configured TelegramChannel

// Load the agent's personality from a SOUL.md file.
const soul = Soul.fromFile('./SOUL.md');

const gateway = new Gateway({
  agent: myAgent,
  channels: [telegramChannel],
  soul, // The soul is applied to all responses sent through the gateway.
});

await gateway.start();
```

## See Also

*   **Channel**: The base class for creating transport adapters for messaging platforms [Source 1].
*   **[ApprovalManager](./approval-manager.md)**: A utility for creating interactive approval flows for sensitive operations within a channel [Source 1].
*   **Soul**: A module for defining and applying a consistent personality to an agent [Source 1].

## Sources

*   [Source 1]: `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/gateway.md`