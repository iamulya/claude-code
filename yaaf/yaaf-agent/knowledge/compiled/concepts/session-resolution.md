---
summary: The mechanism by which the Gateway identifies and manages distinct conversational sessions across different channels and users.
title: Session Resolution
entity_type: concept
related_subsystems:
 - Gateway
search_terms:
 - how to manage user conversations
 - separate chats per user
 - conversation state management
 - session key generation
 - Gateway sessionResolver
 - multi-user agent state
 - channel-specific sessions
 - per-user conversation history
 - isolating user chats
 - what is a session key
 - custom session logic
 - per-group chat state
stub: false
compiled_at: 2026-04-24T18:02:03.122Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/channel.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Session Resolution is the process of generating a unique identifier, known as a session key, for each incoming message. This mechanism is fundamental to how the YAAF `Gateway` manages concurrent conversations from multiple users across various [Channel](../apis/channel.md)s [Source 1].

The primary purpose of Session Resolution is to maintain conversational context and state isolation. By assigning a consistent session key to all messages from a specific conversational context (e.g., a direct message with a user, or a specific group chat), the framework can ensure that [Memory](./memory.md), history, and state from one conversation do not leak into another. This allows a single agent instance to serve many users simultaneously without confusing their interactions [Source 1].

## How It Works in YAAF

The `Gateway` subsystem is responsible for handling Session Resolution. [when](../apis/when.md) configuring the `Gateway`, a developer can provide a `sessionResolver` function. For every `InboundMessage` received from any Channel, the `Gateway` invokes this function to determine the session key for that message [Source 1].

If no custom `sessionResolver` is provided, YAAF uses a default strategy that creates a unique session for each user on each channel. The default session key is generated using the template: `${channelName}:${senderId}` [Source 1]. This provides what the framework refers to as "per-channel-peer isolation," meaning a user's conversation on one platform (e.g., Discord) is treated as a completely separate session from their conversation on another platform (e.g., Telegram) [Source 1].

## Configuration

The default session resolution behavior can be overridden by supplying a custom `sessionResolver` function within the `GatewayConfig`. This function receives the `InboundMessage` object and must return a string that will be used as the session key [Source 1]. This allows for flexible [Session Management](../subsystems/session-management.md) strategies tailored to specific use cases.

### Example: User-Centric Session (Cross-Channel)

To maintain a single, continuous conversation for a user regardless of which channel they use, the session key can be based solely on the `senderId`.

```typescript
import { Gateway, InboundMessage } from 'yaaf';

const gatewayConfig = {
  // ... other config
  sessionResolver: (message: InboundMessage): string => {
    // Use only the sender's ID for the session key.
    return message.senderId;
  },
};
```

### Example: Group Chat Session (Shared)

To create a shared session for all participants within a specific group chat on a channel, the key can be derived from the channel and a conversation or group ID.

```typescript
import { Gateway, InboundMessage } from 'yaaf';

const gatewayConfig = {
  // ... other config
  sessionResolver: (message: InboundMessage): string => {
    // Assumes InboundMessage has a conversationId property for group chats.
    if (message.conversationId) {
      return `${message.channel.name}:${message.conversationId}`;
    }
    // Fallback to default behavior for direct messages.
    return `${message.channel.name}:${message.senderId}`;
  },
};
```

## Sources

[Source 1]: src/gateway/channel.ts