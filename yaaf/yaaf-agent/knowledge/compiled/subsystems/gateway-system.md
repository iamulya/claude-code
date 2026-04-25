---
summary: Manages multi-channel message reception, routing to agents, session resolution, and message processing for LLM agents.
primary_files:
 - src/gateway/channel.ts
title: Gateway System
entity_type: subsystem
exports:
 - Gateway
 - Channel
 - GatewayConfig
 - ConsoleChannel
 - chunkResponse
search_terms:
 - connect to chat platforms
 - multi-channel agent
 - route messages to agent
 - Discord bot integration
 - Telegram agent
 - session management for agents
 - message filtering
 - response chunking
 - how to handle message limits
 - YAAF channels
 - InboundMessage handling
 - OutboundMessage sending
 - agent transport layer
stub: false
compiled_at: 2026-04-24T18:12:58.299Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/channel.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The Gateway system serves as the primary entry point for external messages into the YAAF framework. It is responsible for routing messages from multiple communication [Channel](../apis/channel.md)s, such as chat platforms, to a single agent instance for processing [Source 1].

The system's core responsibilities include [Source 1]:
*   **Multi-Channel message reception**: Listening for and receiving messages from various configured channels simultaneously.
*   **[Session Resolution](../concepts/session-resolution.md)**: Determining a unique session key for each inbound message to maintain conversational context.
*   **[Message Filtering](../concepts/message-filtering.md)**: Deciding whether to process or ignore an inbound message based on configurable rules (e.g., only responding to mentions in a group chat).
*   **[Response Chunking](../concepts/response-chunking.md)**: Splitting agent responses into smaller parts to comply with the message length limits of a specific channel.
*   **[Error Isolation](../concepts/error-isolation.md)**: Ensuring that a failure in one channel does not impact the operation of other channels.

## Architecture

The Gateway system is architected around a central `Gateway` class that orchestrates interactions between one or more `Channel` implementations and a single agent.

*   **`Gateway`**: The central class that manages the lifecycle of all channels. It receives a `GatewayConfig` object upon initialization, which defines the agent to use, the channels to listen on, and various processing hooks [Source 1].
*   **`Channel`**: An interface that represents the transport layer for a specific communication platform (e.g., Discord, Telegram, or a simple console). Implementations of this interface handle the platform-specific logic for connecting, sending, and receiving messages. Each channel must implement `start()`, `stop()`, `send()`, and `onMessage()` methods [Source 1].
*   **`MessageHandler`**: A function type that the `Gateway` registers with each `Channel`. The channel invokes this handler for every inbound message it receives, passing the message to the Gateway for processing [Source 1].
*   **`ConsoleChannel`**: A simple, built-in implementation of the `Channel` interface that reads from standard input and writes to standard output. It is primarily used for testing and development [Source 1].
*   **`chunkResponse`**: A utility function that splits a long text response into smaller chunks suitable for channels with message length limits. It attempts to split at paragraph or sentence boundaries to maintain readability [Source 1].

## Integration Points

The Gateway system's primary integration point is with an agent instance. The `GatewayConfig` object requires an `agent` property, which is an object with a `run` method. The Gateway invokes this `run` method for each message that passes the filtering stage, effectively handing off the core language processing task to the agent subsystem [Source 1].

## Key APIs

*   **`Gateway`**: The main class that orchestrates message routing from channels to an agent.
*   **`Channel`**: The interface that must be implemented to add support for a new chat platform or message source.
*   **`GatewayConfig`**: A type definition for the configuration object passed to the `Gateway` constructor. It defines the agent, channels, and custom behavior hooks.
*   **`ConsoleChannel`**: A concrete `Channel` implementation for command-line interaction.
*   **`chunkResponse(text: string, channelName: string): string[]`**: A utility function to split a response string into an array of smaller strings based on channel limits [Source 1].

## Configuration

The Gateway system is configured via the `GatewayConfig` object provided to the `Gateway` class constructor. Key configuration options include [Source 1]:

*   `agent`: The agent instance that will process the messages.
*   `channels`: An array of objects that implement the `Channel` interface.
*   `sessionResolver`: An optional function to resolve a session key from an inbound message. The default behavior creates a session key based on the channel name and sender ID (`${channelName}:${senderId}`).
*   `messageFilter`: An optional function that returns `true` to process a message or `false` to ignore it.
*   `beforeProcess`: An optional hook to transform the input text of a message before it is sent to the agent.
*   `afterProcess`: An optional hook to transform the agent's response before it is sent back through the channel. This can be used to format or chunk the output.
*   `onError`: An optional error handler for logging or managing errors that occur during message processing or within a channel.

## Extension Points

The primary method for extending the Gateway system is by creating a custom implementation of the `Channel` interface. This allows YAAF to connect to any messaging platform or event source [Source 1].

Additionally, the behavior of the Gateway can be customized without creating new classes by providing functions to the hooks in `GatewayConfig`, such as `sessionResolver`, `messageFilter`, `beforeProcess`, and `afterProcess` [Source 1].

## Sources

[Source 1]: src/gateway/channel.ts