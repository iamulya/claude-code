---
summary: An interface for pluggable cross-replica Inter-Process Communication (IPC) transport in YAAF.
export_name: DistributedIPCBackend
source_file: src/integrations/ipc.backend.ts
category: interface
title: DistributedIPCBackend
entity_type: api
search_terms:
 - cross-replica communication
 - multi-pod agent messaging
 - IPC backend implementation
 - how to scale agents
 - distributed message queue
 - Redis IPC backend
 - pluggable IPC transport
 - InProcessIPCPlugin backend
 - agent-to-agent communication
 - message passing between agents
 - scaling YAAF agents
 - custom IPC transport
 - FIFO message delivery
stub: false
compiled_at: 2026-04-24T17:03:16.396Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/ipc.backend.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `DistributedIPCBackend` is an interface that defines a pluggable transport layer for [Inter-Process Communication](../concepts/inter-process-communication.md) (IPC) across multiple agent replicas [Source 1].

By default, the `InProcessIPCPlugin` uses an in-process EventEmitter, which limits message visibility to a single Node.js process. In distributed environments, such as multi-pod Kubernetes deployments, this causes messages between different replicas to be silently dropped. Implementing the `DistributedIPCBackend` interface allows developers to provide a custom transport mechanism, such as Redis or another message queue, enabling `send()` and `subscribe()` operations to work across all replicas that share the same backing store [Source 1].

[when](./when.md) a `DistributedIPCBackend` is provided in the `InProcessIPCConfig`, the `InProcessIPCPlugin` delegates its core transport operations (`send()`, `subscribe()`, and `readUnread()`) to the backend. However, higher-level logic like concurrent-slot bookkeeping, inbox maps, the dead-letter queue, and sender filters remain in-process. The backend is solely responsible for message transport [Source 1].

The framework requires that any implementation of this interface MUST deliver messages in a First-In, First-Out (FIFO) order for each mailbox. The `subscribe` method is considered best-effort and may not preserve order under high concurrency; the `drain` method should be used for reliable, ordered message replay [Source 1].

If no backend is configured, YAAF uses the `InMemoryIPCBackend` class, which provides the default in-process behavior for backward compatibility [Source 1].

## Signature

```typescript
import type { IPCMessage } from "./inProcessIPC.js";

export interface DistributedIPCBackend {
  publish(mailbox: string, message: IPCMessage): Promise<number>;
  subscribe(mailbox: string, handler: (message: IPCMessage) => void): () => void;
  drain(mailbox: string): Promise<IPCMessage[]>;
}
```

## Methods & Properties

### publish

Publishes a message to a named mailbox, making it visible to all replicas connected to the backend.

**Signature:**
```typescript
publish(mailbox: string, message: IPCMessage): Promise<number>;
```
- **Parameters:**
  - `mailbox`: `string` - The name of the destination inbox, which corresponds to the `to` field of the `IPCMessage`.
  - `message`: `IPCMessage` - The fully-formed message to publish.
- **Returns:** `Promise<number>` - A promise that resolves to the new depth of the message queue after the publish operation completes.

### subscribe

Subscribes to new messages arriving in a named mailbox.

**Signature:**
```typescript
subscribe(mailbox: string, handler: (message: IPCMessage) => void): () => void;
```
- **Parameters:**
  - `mailbox`: `string` - The inbox to watch for new messages.
  - `handler`: `(message: IPCMessage) => void` - A callback function that is invoked for each new message published *after* the subscription is established. This handler must not be called for messages that were already in the queue before subscribing.
- **Returns:** `() => void` - An unsubscribe function that, when called, terminates the subscription.

### drain

Atomically retrieves and removes all pending messages from a mailbox. This method is used by the `readUnread()` polling mechanism to consume messages.

**Signature:**
```typescript
drain(mailbox: string): Promise<IPCMessage[]>;
```
- **Parameters:**
  - `mailbox`: `string` - The inbox to drain.
- **Returns:** `Promise<IPCMessage[]>` - A promise that resolves to an array of all pending messages, ordered from oldest to newest.

## Examples

### Redis Backend Implementation

The following is a minimal, drop-in example of a `DistributedIPCBackend` implementation using the `redis` library [Source 1].

```typescript
import { createClient } from 'redis';
import type { DistributedIPCBackend, IPCMessage } from 'yaaf/[[[[[[[[Integrations]]]]]]]]/ipc.backend';

// Create separate publisher and subscriber clients
const pub = createClient();
const sub = pub.duplicate();

// Connect both clients
await pub.connect();
await sub.connect();

const redisBackend: DistributedIPCBackend = {
  async publish(mailbox, message) {
    const key = `ipc:inbox:${mailbox}`;
    // Add the message to a list for persistent queuing
    const val = await pub.lPush(key, JSON.stringify(message));
    // Publish to a channel for real-time notifications
    await pub.publish(`ipc:ch:${mailbox}`, JSON.stringify(message));
    return val;
  },

  subscribe(mailbox, handler) {
    const channel = `ipc:ch:${mailbox}`;
    // Subscribe to the real-time channel
    sub.subscribe(channel, (msg) => handler(JSON.parse(msg)));
    // Return a function to unsubscribe from the channel
    return () => sub.unsubscribe(channel);
  },

  async drain(mailbox) {
    const key = `ipc:inbox:${mailbox}`;
    // Atomically get all items from the list and delete the list
    const items = await pub.lRange(key, 0, -1);
    await pub.del(key);
    // Parse and return the messages
    return items.map(i => JSON.parse(i) as IPCMessage);
  },
};

// This `redisBackend` instance can now be passed to the InProcessIPCPlugin configuration.
```

## Sources
[Source 1]: src/Integrations/ipc.backend.ts