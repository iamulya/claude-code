---
summary: Provides Inter-Process Communication (IPC) capabilities for YAAF agents to communicate with each other.
primary_files:
 - src/integrations/inProcessIPC.ts
 - src/integrations/ipc.backend.js
title: Integrations
entity_type: subsystem
exports:
 - IPCMessage
 - IPCAdapter
 - InProcessIPCPlugin
search_terms:
 - agent to agent communication
 - inter-agent messaging
 - IPC adapter
 - in-process communication
 - EventEmitter IPC
 - message passing between agents
 - multi-agent swarms
 - agent backpressure
 - dead letter queue
 - message bus for agents
 - synchronous agent messages
 - zero-latency IPC
 - how do agents talk to each other
 - agent message queue
stub: false
compiled_at: 2026-04-24T18:13:39.478Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/inProcessIPC.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Integrations subsystem provides the framework for [Inter-Process Communication](../concepts/inter-process-communication.md) (IPC) between YAAF agents. Its primary purpose is to enable agents within a multi-agent system, or "swarm," to exchange messages reliably. This subsystem abstracts the underlying transport mechanism, allowing for different communication strategies depending on whether agents are running in the same process or distributed across multiple processes [Source 1].

## Architecture

The subsystem is designed around a standardized plugin capability interface, `IPCAdapter`. This interface defines the contract for any IPC implementation, ensuring that agents can send and receive messages using a consistent API regardless of the transport layer [Source 1].

A key component is the `IPCMessage` type, which standardizes the structure of messages exchanged between agents. Each message includes metadata such as sender (`from`), recipient (`to`), a unique `id`, `timestamp`, and delivery-related fields like `attempts` and `ttlMs` (time-to-live) [Source 1].

The subsystem includes production-grade features built into its design [Source 1]:
*   **[Backpressure](../concepts/backpressure.md) Management**: Inboxes can be configured with a `maxInboxSize` to prevent them from growing indefinitely. Policies like `drop-oldest` or `reject` can be applied [when](../apis/when.md) the limit is reached.
*   **[Observability](../concepts/observability.md)**: The system is designed to emit events for key state changes, such as `ipc:dlq` (a message is sent to the dead-letter queue), `ipc:backpressure`, and `ipc:ttl_expired`.
*   **Dead Letter Queue (DLQ)**: A mechanism to handle messages that fail to be delivered after a certain number of attempts.
*   **Security**: Subscriptions can be configured with an `allowedSenders` whitelist to enforce capability-based access control on an inbox.

One concrete implementation provided is the `InProcessIPCPlugin`. This plugin uses the native Node.js `EventEmitter` module to deliver messages synchronously within the same event loop turn. This provides a zero-latency, zero-I/O transport for agents co-located in the same Node.js process. For communication between different processes, the source material alludes to a separate `Mailbox` file-based transport [Source 1].

## Key APIs

The public API surface of this subsystem is defined by the `IPCAdapter` interface and its associated data types [Source 1].

*   **`IPCAdapter`**: An interface that defines the "ipc" plugin capability. It includes methods for managing the entire message lifecycle:
    *   `send(inbox, message)`: Sends a message to a specified inbox.
    *   `readUnread(inbox)`: Retrieves all unread messages from an inbox.
    *   `markAllRead(inbox)`: Marks all messages in an inbox as read.
    *   `subscribe(inbox, handler, options)`: Registers a handler to be called when a new message arrives in an inbox. Returns an unsubscribe function.
    *   `deadLetter(inbox, message, reason)`: Moves a message to the dead-letter queue for a given inbox.
    *   `listDeadLetters(inbox)`: Retrieves all messages from the dead-letter queue.
    *   `clear(inbox)`: Clears all messages from an inbox.

*   **`InProcessIPCPlugin`**: A concrete implementation of `IPCAdapter` for efficient, same-process communication. It extends `PluginBase` and can be registered with an agent.

*   **`IPCMessage`**: The standardized data structure for all messages flowing through the IPC system.

*   **`IPCEvent`**: A type representing [Observability Events](../concepts/observability-events.md) emitted by the IPC system, such as `{ type: "ipc:dlq", ... }`.

## Configuration

Configuration is primarily handled during the subscription process via the `SubscribeOptions` parameter of the `subscribe` method. The key configuration option mentioned in the source is `allowedSenders`, which provides a whitelist of agent IDs permitted to send messages to that specific subscription [Source 1]. Other features like `maxInboxSize` and backpressure policies are also implied to be configurable aspects of an IPC adapter implementation [Source 1].

## Sources

[Source 1]: src/integrations/inProcessIPC.ts