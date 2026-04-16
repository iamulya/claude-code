---
title: Gateway System
entity_type: subsystem
summary: Manages multi-channel message routing, session resolution, and response formatting between external platforms and a YAAF agent.
primary_files:
  - src/gateway.ts
  - src/gateway/channel.ts
exports:
  - Gateway
  - Channel
  - ConsoleChannel
  - chunkResponse
  - GatewayConfig
stub: false
compiled_at: 2026-04-16T14:18:13.646Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/gateway.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/gateway/channel.ts
confidence: 1
---

## Purpose
The Gateway System provides an opt-in entry point for connecting YAAF agents to external communication platforms. It serves as a transport-agnostic routing layer that abstracts the complexities of multi-channel message reception, session management, and platform-specific response formatting. 

By design, the Gateway System is not included in the main `yaaf` barrel export to keep the core framework lightweight. It must be imported explicitly from the `yaaf/gateway` entry point.

## Architecture
The subsystem is built around a centralized router that coordinates between one or more transport providers and a single agent instance.

### Key Components
- **Gateway**: The orchestrator class that manages the lifecycle of multiple channels. It routes inbound messages to the agent and handles the return flow of responses.
- **Channel**: A standardized interface for platform-specific transport layers (e.g., Telegram, Discord, WhatsApp). Each channel is responsible for connecting to its platform, listening for messages, and formatting outbound replies.
- **Session Resolver**: A logic component that maps inbound messages to specific session keys. By default, it uses a per-channel-peer isolation strategy (`${channelName}:${senderId}`).
- **ConsoleChannel**: A built-in implementation of the `Channel` interface used for testing and local development via `stdin` and `stdout`.

## Key APIs
### Gateway
The primary class used to initialize the system. It accepts a `GatewayConfig` and manages the execution loop for inbound messages.

### Channel Interface
Developers implement this interface to add support for new platforms.
```typescript
export interface Channel {
  readonly name: string
  onMessage(handler: MessageHandler): void
  send(message: OutboundMessage): Promise<void>
  start(): Promise<void>
  stop(): Promise<void>
  isConnected(): boolean
}
```

### chunkResponse
A utility function that splits long agent responses into multiple messages based on channel limits. It attempts to split at paragraph or sentence boundaries rather than mid-word to maintain readability.

## Configuration
The Gateway is configured via the `GatewayConfig` object, which defines how the system interacts with the agent and the external channels.

| Property | Description |
| :--- | :--- |
| `agent` | The agent instance to route messages to. Must implement a `run` method. |
| `channels` | An array of `Channel` implementations to listen on. |
| `sessionResolver` | Optional function to determine the session key for an inbound message. |
| `messageFilter` | Optional function to ignore specific messages (e.g., filtering for mentions in group chats). |
| `beforeProcess` | Hook to transform input text before it reaches the agent. |
| `afterProcess` | Hook to transform or chunk the agent's response before sending. |
| `onError` | Error handler for isolating failures within specific channels. |

## Extension Points
The Gateway System is designed for extensibility through two primary mechanisms:

1.  **Custom Channels**: By implementing the `Channel` interface, developers can connect YAAF agents to any platform that supports a programmatic message interface.
2.  **Processing Hooks**: The `beforeProcess` and `afterProcess` hooks allow for middleware-like transformations, such as translating messages, adding metadata, or implementing custom response logic like `ApprovalManager` (used for human-in-the-loop workflows).