---
export_name: InboundMessage
source_file: src/gateway/channel.ts
category: type
summary: Represents an incoming message from a channel, containing sender, text, and channel context.
title: InboundMessage
entity_type: api
search_terms:
 - incoming message format
 - channel message structure
 - gateway input message
 - user message object
 - sender identification
 - session resolver input
 - message filtering data
 - how to get user id from message
 - what is in a message object
 - channel context
 - thread id
 - group chat message
stub: false
compiled_at: 2026-04-25T00:08:11.182Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/channel.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`InboundMessage` is a type alias for the standardized object structure that represents a message received from an external platform via a [Channel](./channel.md). It serves as the common data format that all channels must produce, ensuring that the Gateway and the [Agent](./agent.md) can process messages from different sources in a uniform way [Source 1].

This object encapsulates the core components of a message: its text content, information about the sender, and the context of the conversation (such as the specific channel or thread it came from). It is the primary input for several key hooks within the [GatewayConfig](./gateway-config.md), including `sessionResolver`, `messageFilter`, and `beforeProcess`, allowing for customized logic based on message details [Source 1].

## Signature

`InboundMessage` is a type alias for an object. While the source file does not contain the explicit type definition, its structure can be inferred from its usage in the Gateway system, particularly in the default `sessionResolver` and various handler functions [Source 1]. The following represents its conceptual structure:

```typescript
export type InboundMessage = {
  /** The text content of the message. */
  text: string;

  /** A unique identifier for the message sender. */
  senderId: string;

  /** The name of the channel that received the message (e.g., 'console', 'discord'). */
  channelName: string;

  /** A unique identifier for the specific channel or conversation (e.g., a Discord channel ID). */
  channelId: string;

  /** (Optional) A unique identifier for a thread within a channel, if applicable. */
  threadId?: string;

  /**
   * Any additional, channel-specific metadata.
   * This allows channels to pass through platform-specific information.
   */
  [key: string]: any;
};
```

## Examples

### Basic Message Handling

A [MessageHandler](./message-handler.md) receives an `InboundMessage` object for every incoming message that passes the gateway's filters.

```typescript
import type { InboundMessage, MessageHandler } from 'yaaf';

const myMessageHandler: MessageHandler = async (message: InboundMessage) => {
  console.log(
    `Received message from user ${message.senderId} in channel ${message.channelName}:`
  );
  console.log(`> ${message.text}`);
  // The gateway will now route this message to the agent for processing.
};
```

### Custom Session Resolution

The `sessionResolver` function in [GatewayConfig](./gateway-config.md) uses an `InboundMessage` to generate a unique session key. This allows for fine-grained control over conversation context. The default behavior is to create a session per user per channel (`${channelName}:${senderId}`) [Source 1].

The following example changes the behavior to create a single shared session for everyone in a specific channel.

```typescript
import type { GatewayConfig, InboundMessage } from 'yaaf';

const gatewayConfig: Partial<GatewayConfig> = {
  // Create a separate conversation session for each channel,
  // shared by all users in that channel.
  sessionResolver: (message: InboundMessage): string => {
    return `session-for-channel:${message.channelId}`;
  },
  // ... other gateway config
};
```

## See Also

-   [Channel](./channel.md): The interface for components that receive messages from external platforms and convert them into `InboundMessage` objects.
-   [GatewayConfig](./gateway-config.md): The configuration object for the Gateway, which uses `InboundMessage` in several of its callback hooks.
-   [MessageHandler](./message-handler.md): The type definition for a function that processes an `InboundMessage`.
-   `OutboundMessage`: The counterpart to `InboundMessage`, used for sending replies back through a [Channel](./channel.md).

## Sources

[Source 1]: src/gateway/channel.ts