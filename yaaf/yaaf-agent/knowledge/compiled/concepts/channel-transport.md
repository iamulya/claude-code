---
summary: The abstraction layer in YAAF that decouples agent logic from platform-specific messaging protocols.
title: Channel Transport
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:18:29.628Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/gateway/channel.ts
confidence: 0.9
---

---
title: Channel Transport
entity_type: concept
summary: The abstraction layer in YAAF that decouples agent logic from platform-specific messaging protocols.
related_subsystems:
  - Gateway

## What It Is
Channel Transport is the architectural abstraction in YAAF that separates an agent's core reasoning logic from the technical details of external communication platforms. By providing a unified interface for different messaging protocols—such as Telegram, Discord, or WhatsApp—YAAF allows developers to deploy a single agent across multiple platforms without modifying the agent's internal implementation.

This decoupling ensures that the agent remains "provider-agnostic" regarding its input and output streams. The transport layer handles the complexities of connecting to APIs, maintaining long-lived connections (like WebSockets or long-polling), and formatting messages to meet specific platform constraints.

## How It Works in YAAF
The transport system is built around two primary components: the `Channel` interface and the `Gateway` class.

### The Channel Interface
Every supported platform must implement the `Channel` interface. This interface defines the standard lifecycle and communication methods:
- **Lifecycle Management**: `start()` and `stop()` methods handle the initialization and teardown of the platform connection.
- **Message Ingestion**: The `onMessage(handler)` method allows the system to register a callback that is triggered whenever the platform receives a new message.
- **Message Egress**: The `send(message)` method transmits the agent's response back to the platform.
- **State**: The `isConnected()` method provides real-time status of the transport's health.

### The Gateway
The `Gateway` acts as a central hub that routes messages from one or more `Channel` instances to a single agent. It provides several high-level features:
- **Session Resolution**: Uses a `sessionResolver` to identify unique conversations, typically defaulting to a combination of the channel name and the sender's ID.
- **Message Filtering**: Employs a `messageFilter` to determine which inbound messages should be processed (e.g., ignoring messages in group chats unless the agent is explicitly mentioned).
- **Response Chunking**: Uses the `chunkResponse` utility to split long agent responses into multiple messages if they exceed the `maxLength` defined in a channel's `ChannelLimits`.
- **Hooks**: Provides `beforeProcess` and `afterProcess` hooks to transform text before it reaches the agent or after the agent generates a response.

## Configuration
Developers configure the transport layer by passing a `GatewayConfig` object to the `Gateway`. This configuration defines the agent, the array of active channels, and various processing behaviors.

```typescript
import { Gateway, ConsoleChannel } from './gateway/channel';

const gateway = new Gateway({
  agent: myAgent,
  channels: [
    new ConsoleChannel(), // A built-in channel for stdin/stdout testing
  ],
  // Resolve sessions per-user on the specific channel
  sessionResolver: (msg) => `${msg.channel}:${msg.senderId}`,
  
  // Only process messages that aren't empty
  messageFilter: (msg) => msg.text.trim().length > 0,

  // Optional: Transform input before the agent sees it
  beforeProcess: async (msg) => {
    return msg.text.toLowerCase();
  }
});

await gateway.start();
```

### Channel Limits
Implementations of the transport layer often reference `ChannelLimits` to ensure compatibility with the target platform. This includes:
- `maxLength`: The maximum number of characters allowed in a single message.
- `markdown`: A boolean indicating whether the platform supports markdown formatting.

## See Also
- [[ConsoleChannel]]
- [[Gateway]]