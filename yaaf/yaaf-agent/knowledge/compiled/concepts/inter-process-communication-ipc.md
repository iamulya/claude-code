---
summary: The mechanism allowing YAAF agents to exchange messages and coordinate across different processes or execution contexts.
title: Inter-Process Communication (IPC)
entity_type: concept
search_terms:
 - agent to agent communication
 - message passing between agents
 - multi-agent coordination
 - IPCAdapter capability
 - InProcessIPCPlugin
 - Mailbox transport
 - agent message queue
 - distributed agent systems
 - how do YAAF agents talk to each other
 - same-process communication
 - cross-process communication
 - agent swarm messaging
 - dead letter queue
 - backpressure
stub: false
compiled_at: 2026-04-24T17:56:11.442Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/inProcessIPC.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

[Inter-Process Communication](./inter-process-communication.md) (IPC) in YAAF is the framework's mechanism for enabling agents to send messages to, and receive messages from, one another. It is a fundamental capability for Building [Multi-Agent Systems](./multi-agent-systems.md), or "swarms," where agents must coordinate tasks, share information, and operate cohesively. The IPC system provides a standardized interface for message passing, abstracting away the underlying transport layer, which allows agents to communicate whether they are running in the same process or distributed across different ones [Source 1].

## How It Works in YAAF

The core of YAAF's IPC system is the `IPCAdapter` interface, which defines a standard contract for any IPC implementation. Plugins that provide this capability must implement this interface, ensuring a consistent API for agent developers [Source 1].

The primary methods defined by the `IPCAdapter` interface include [Source 1]:
*   `send()`: Sends a message to a specific agent's inbox.
*   `subscribe()`: Registers a handler function to be called [when](../apis/when.md) a message arrives in an inbox. This enables event-driven, low-latency communication without polling.
*   `readUnread()`: Retrieves all unread messages from an inbox.
*   `deadLetter()`: Moves a message that cannot be processed to a dead-letter queue for later inspection.
*   `listDeadLetters()`: Retrieves messages from the dead-letter queue.

Messages exchanged through the IPC system conform to the `IPCMessage` type, which includes fields such as `id`, `from`, `to`, `body`, `timestamp`, `ttlMs` (time-to-live), and delivery attempt counters [Source 1].

YAAF provides multiple implementations of the `IPCAdapter` capability:

*   **`InProcessIPCPlugin`**: This implementation is designed for agents running within the same Node.js process. It uses the native Node.js `EventEmitter` module to deliver messages synchronously and with zero latency. It avoids polling, disk I/O, and file lock contention, making it highly efficient for single-process agent swarms [Source 1].
*   **`Mailbox`**: The source material mentions this as a file-based transport for cross-process communication, serving as an alternative to the `InProcessIPCPlugin` [Source 1].

The `InProcessIPCPlugin` also includes production-grade features such as [Source 1]:
*   **[Backpressure](./backpressure.md)**: A `maxInboxSize` cap can be configured to either drop the oldest messages or reject new ones when an inbox is full.
*   **[Observability](./observability.md)**: Emits events like `ipc:dlq`, `ipc:backpressure`, and `ipc:ttl_expired` for monitoring.
*   **Security**: A subscription can be configured with an `allowedSenders` whitelist to enforce which agents are permitted to send messages to it.

## Configuration

Configuration of the IPC system is handled by selecting and configuring a specific `IPCAdapter` plugin. While detailed configuration depends on the chosen plugin, the `subscribe` method on the `IPCAdapter` interface accepts an `options` object. This allows for per-subscription configuration, such as setting up an `allowedSenders` whitelist for security [Source 1].

```typescript
// Conceptual example of subscribing with options
// based on the IPCAdapter interface [Source 1]

const ipcPlugin: IPCAdapter = agent.getCapability("ipc");

const unsubscribe = ipcPlugin.subscribe(
  "my-agent-inbox",
  (message) => {
    console.log("Received message:", message.body);
  },
  {
    // Example configuration for a subscription
    allowedSenders: ["agent-id-123", "agent-id-456"]
  }
);
```

## Sources
[Source 1] src/[Integrations](../subsystems/integrations.md)/inProcessIPC.ts