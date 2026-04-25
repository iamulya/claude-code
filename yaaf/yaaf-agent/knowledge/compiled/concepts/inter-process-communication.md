---
summary: The core concept of enabling message exchange between different processes or replicas in a distributed YAAF deployment.
primary_files:
 - src/integrations/ipc.backend.ts
 - src/integrations/inProcessIPC.js
title: Inter-Process Communication
entity_type: concept
related_subsystems:
 - integrations
search_terms:
 - distributed agents
 - multi-pod communication
 - agent message passing
 - cross-replica messaging
 - IPC backend
 - how to scale YAAF agents
 - Redis IPC for YAAF
 - InProcessIPCPlugin
 - DistributedIPCBackend
 - message queue for agents
 - agent-to-agent communication
 - cross-process messaging
stub: false
compiled_at: 2026-04-24T17:56:07.178Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/ipc.backend.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Inter-Process Communication (IPC) in YAAF refers to the mechanism for exchanging messages between different agent processes or replicas, particularly in a distributed deployment [Source 1]. By default, YAAF's `InProcessIPCPlugin` uses an in-process EventEmitter, which limits message visibility to the single Node.js process where the agent is running. In a multi-process or multi-pod environment, this default behavior would cause messages sent between different replicas to be silently lost [Source 1].

The IPC concept addresses this limitation by introducing a pluggable transport layer. This allows developers to replace the default in-process communication with a robust, distributed backend (like Redis, RabbitMQ, or Kafka) to ensure messages can be reliably sent and received across all running instances of an agent [Source 1].

## How It Works in YAAF

YAAF abstracts the transport layer for IPC through the `DistributedIPCBackend` interface. This interface defines the contract for any external messaging system that facilitates cross-replica communication [Source 1]. [when](../apis/when.md) a custom backend is provided, the `InProcessIPCPlugin` delegates its core messaging operations to it. The framework's internal logic for managing inboxes, dead-letter queues, and sender filters remains in-process; the backend is solely responsible for message transport [Source 1].

The `DistributedIPCBackend` interface consists of three primary methods:

*   `publish(mailbox, message)`: Sends a message to a named mailbox, making it available to all subscribed replicas [Source 1].
*   `subscribe(mailbox, handler)`: Subscribes to new messages arriving in a specific mailbox. The handler is invoked for messages published *after* the subscription is active. This method is considered best-effort and may not preserve message order under high concurrency [Source 1].
*   `drain(mailbox)`: Atomically retrieves and removes all pending messages from a mailbox. This is used for polling-based consumption and is the recommended way to ensure ordered message processing, as it guarantees First-In, First-Out (FIFO) delivery [Source 1].

YAAF includes a default implementation called `InMemoryIPCBackend`, which provides the standard single-process behavior and is used when no external backend is configured [Source 1].

## Configuration

To enable distributed IPC, a developer must implement the `DistributedIPCBackend` interface and provide it to the `InProcessIPCPlugin` through its configuration. The implementation will typically wrap a client for a message broker like Redis [Source 1].

The following example demonstrates a minimal `DistributedIPCBackend` implementation using Redis:

```typescript
import { createClient } from 'redis'
import type { DistributedIPCBackend, IPCMessage } from 'yaaf/[[[[[[[[Integrations]]]]]]]]/ipc.backend'

const pub = createClient()
const sub = pub.duplicate()
await pub.connect()
await sub.connect()

const backend: DistributedIPCBackend = {
  async publish(mailbox, message) {
    const key = `ipc:inbox:${mailbox}`
    const val = await pub.lPush(key, JSON.stringify(message))
    await pub.publish(`ipc:ch:${mailbox}`, JSON.stringify(message))
    return val
  },
  subscribe(mailbox, handler) {
    sub.subscribe(`ipc:ch:${mailbox}`, (msg) => handler(JSON.parse(msg)))
    return () => sub.unsubscribe(`ipc:ch:${mailbox}`)
  },
  async drain(mailbox) {
    const key = `ipc:inbox:${mailbox}`
    const items = await pub.lRange(key, 0, -1)
    await pub.del(key)
    return items.map(i => JSON.parse(i) as IPCMessage)
  },
}
```
[Source 1]

This backend would then be passed into the configuration for the `InProcessIPCPlugin`.

## Sources

[Source 1]: src/Integrations/ipc.backend.ts