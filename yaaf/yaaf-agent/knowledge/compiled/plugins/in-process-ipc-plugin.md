---
summary: Zero-latency EventEmitter-based IPC plugin for agents running in the same Node.js process.
capabilities:
 - ipc
title: InProcessIPCPlugin
entity_type: plugin
built_in: true
search_terms:
 - same process agent communication
 - in-memory IPC
 - EventEmitter agent messaging
 - zero latency IPC
 - how to make agents talk in one process
 - inter-agent communication
 - IPCAdapter implementation
 - local agent swarm
 - synchronous message delivery
 - alternatives to Mailbox plugin
 - agent backpressure
 - agent message queue
stub: false
compiled_at: 2026-04-24T18:08:53.639Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/inProcessIPC.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `InProcessIPCPlugin` provides a zero-latency, in-[Memory](../concepts/memory.md) [Inter-Process Communication](../concepts/inter-process-communication.md) (IPC) mechanism for agents operating within the same Node.js process [Source 1]. It implements the `IPCAdapter` plugin capability.

Message delivery is handled synchronously via Node.js's built-in `EventEmitter`, occurring within the same event-loop turn. This design avoids the overhead of polling, disk I/O, or file lock contention associated with other IPC methods [Source 1].

This plugin is the recommended choice for multi-agent swarms where all agents are co-located in a single process. For communication between agents in different processes, the `Mailbox` file-based transport should be used instead [Source 1].

Production-grade features include [Source 1]:
*   **[Backpressure](../concepts/backpressure.md)**: A `maxInboxSize` cap can be configured with policies to either drop the oldest messages or reject new ones.
*   **[Observability](../concepts/observability.md)**: Emits events for key IPC states, such as `ipc:dlq` (dead-letter queue), `ipc:backpressure`, and `ipc:ttl_expired`.
*   **Security**: Subscriptions can be configured with an `allowedSenders` whitelist to enforce capability-based access control.

## Installation

As a built-in plugin, `InProcessIPCPlugin` does not require separate installation. It can be imported directly from the YAAF framework's plugin collection.

```typescript
import { InProcessIPCPlugin } from "yaaf/plugins";
```

There are no peer dependencies for this plugin.

## Configuration

The provided source material does not include the constructor signature for `InProcessIPCPlugin`. The following is a basic example of how to instantiate and add the plugin to an agent's configuration.

```typescript
import { Agent } from "yaaf/core";
import { InProcessIPCPlugin } from "yaaf/plugins";

// Instantiate the plugin
const ipcPlugin = new InProcessIPCPlugin();

// Add the plugin to an agent's configuration
const agent = new Agent({
  name: "MyAgent",
  plugins: [ipcPlugin],
  // ... other agent configuration
});
```

## Capabilities

`InProcessIPCPlugin` implements the `ipc` capability.

### IPC

The `ipc` capability provided by this plugin enables agents to send and receive messages. The implementation is based on a subscribe-based delivery model using `EventEmitter`, which eliminates the need for polling [Source 1].

Key characteristics of this implementation include:
*   **In-Process Communication**: Designed exclusively for agents running in the same Node.js process.
*   **Zero Latency**: Messages are delivered synchronously, providing immediate communication.
*   **High Performance**: Avoids network, disk, and serialization overhead, making it highly efficient for local agent swarms.

The adapter provides standard IPC functionalities such as sending messages, reading unread messages, subscribing to an inbox, and managing a dead-letter queue [Source 1].

## Limitations

*   **Single-Process Only**: This plugin cannot be used for communication between agents running in separate Node.js processes. For cross-process or distributed communication, an alternative transport like the `Mailbox` plugin is required [Source 1].

## Sources

[Source 1] src/[Integrations](../subsystems/integrations.md)/inProcessIPC.ts