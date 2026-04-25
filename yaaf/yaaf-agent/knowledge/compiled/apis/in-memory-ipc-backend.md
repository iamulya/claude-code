---
summary: The default in-process implementation of `DistributedIPCBackend` for YAAF, handling IPC within a single Node.js process.
export_name: InMemoryIPCBackend
source_file: src/integrations/ipc.backend.ts
category: class
title: InMemoryIPCBackend
entity_type: api
search_terms:
 - in-process IPC
 - single process communication
 - default IPC backend
 - local agent communication
 - EventEmitter IPC
 - how does IPC work by default
 - non-distributed IPC
 - local message passing
 - InProcessIPCPlugin default
 - single node agent messaging
 - what is DistributedIPCBackend
 - backward compatible IPC
stub: false
compiled_at: 2026-04-24T17:13:19.254Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/ipc.backend.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`InMemoryIPCBackend` is the default, in-process implementation of the `DistributedIPCBackend` interface. It facilitates [Inter-Process Communication](../concepts/inter-process-communication.md) (IPC) for agents running within a single Node.js process [Source 1].

This backend is used by default [when](./when.md) the `InProcessIPCPlugin` is configured without a custom `backend` property. Its behavior is equivalent to a simple EventEmitter, where messages published to a mailbox are only visible to subscribers within the same process. In multi-process or multi-pod deployments, messages sent via this backend will be silently dropped and will not reach other replicas [Source 1].

For applications requiring communication across multiple processes or servers, a custom implementation of `DistributedIPCBackend` (e.g., using Redis) must be provided to enable cross-replica message transport [Source 1].

## Signature / Constructor

`InMemoryIPCBackend` implements the `DistributedIPCBackend` interface.

```typescript
export class InMemoryIPCBackend implements DistributedIPCBackend {
  // ... implementation details
}
```

The class adheres to the following interface [Source 1]:

```typescript
export interface DistributedIPCBackend {
  publish(mailbox: string, message: IPCMessage): Promise<number>;
  subscribe(mailbox: string, handler: (message: IPCMessage) => void): () => void;
  drain(mailbox: string): Promise<IPCMessage[]>;
}
```

## Methods & Properties

As an implementation of `DistributedIPCBackend`, `InMemoryIPCBackend` provides the following public methods [Source 1]:

### publish

Publishes a message to a named mailbox. In this implementation, the message is only visible to subscribers within the same Node.js process.

**Signature**
```typescript
publish(mailbox: string, message: IPCMessage): Promise<number>;
```
**Parameters**
- `mailbox`: The inbox name, which corresponds to the `to` field of the `IPCMessage`.
- `message`: The fully-formed message to publish.
**Returns**
A `Promise` that resolves to the new queue depth after the publish operation.

### subscribe

Subscribes to messages arriving in a named mailbox. The provided handler is invoked for each new message published after the subscription is established.

**Signature**
```typescript
subscribe(mailbox: string, handler: (message: IPCMessage) => void): () => void;
```
**Parameters**
- `mailbox`: The inbox to watch for new messages.
- `handler`: A callback function that is called for each new message.
**Returns**
An unsubscribe function that, when called, will stop the handler from receiving further messages.

### drain

Atomically removes and returns all pending messages for a given mailbox. This is used for polling-based consumption of messages that were published but not yet consumed.

**Signature**
```typescript
drain(mailbox: string): Promise<IPCMessage[]>;
```
**Parameters**
- `mailbox`: The inbox to drain.
**Returns**
A `Promise` that resolves to an array of all pending `IPCMessage` objects, ordered from oldest to newest.

## Examples

`InMemoryIPCBackend` is the default and is used implicitly. The following example shows an agent configured with the `InProcessIPCPlugin`. Since no `backend` is specified in the plugin's configuration, `InMemoryIPCBackend` will be used automatically.

```typescript
import { Agent, InProcessIPCPlugin } from 'yaaf';

const agent = new Agent({
  name: 'local-agent',
  plugins: [
    new InProcessIPCPlugin({
      // No 'backend' property is provided, so YAAF defaults to
      // using InMemoryIPCBackend for single-process communication.
    }),
  ],
});

// Any IPC messages sent or received by this agent will be handled
// by InMemoryIPCBackend and will not leave the current Node.js process.
```

## See Also

- `DistributedIPCBackend`: The interface that `InMemoryIPCBackend` implements, allowing for custom, distributed IPC transports.
- `InProcessIPCPlugin`: The plugin that utilizes a `DistributedIPCBackend` to provide IPC capabilities to an agent.

## Sources

[Source 1]: src/[Integrations](../subsystems/integrations.md)/ipc.backend.ts