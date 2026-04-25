---
summary: Defines the interface for Inter-Process Communication (IPC) capabilities within YAAF.
export_name: IPCAdapter
source_file: src/integrations/inProcessIPC.ts
category: interface
title: IPCAdapter
entity_type: api
search_terms:
 - inter-process communication interface
 - agent messaging API
 - how to send messages between agents
 - IPC plugin contract
 - agent communication layer
 - message passing interface
 - dead letter queue API
 - subscribe to agent messages
 - read agent inbox
 - IPC capability
 - YAAF messaging
 - agent-to-agent communication
stub: false
compiled_at: 2026-04-24T17:14:50.718Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/inProcessIPC.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `IPCAdapter` is a TypeScript interface that defines the standard contract for [Inter-Process Communication](../concepts/inter-process-communication.md) (IPC) plugins within the YAAF framework [Source 1]. Any class that implements this interface provides a standardized way for agents to send and receive messages, regardless of the underlying transport mechanism.

This interface establishes a common API for core messaging functionalities, including sending messages to an inbox, reading unread messages, subscribing to real-time message delivery, and managing a dead-letter queue for failed messages. By programming against this interface, agent logic can be decoupled from specific IPC implementations, such as the in-process `InProcessIPCPlugin` or a file-based transport [Source 1].

## Signature

The `IPCAdapter` interface is defined as follows. It relies on the `IPCMessage` type for message structure [Source 1].

```typescript
// The structure for messages passed between agents
export type IPCMessage = {
  id: string;
  from: string;
  to: string;
  body: string; // JSON-serialized or plain text
  timestamp: string; // ISO 8601
  read: boolean;
  attempts: number;
  maxAttempts: number;
  ttlMs?: number;
  color?: string;
  summary?: string;
};

// The interface for IPC plugins
export interface IPCAdapter {
  readonly capability: "ipc";

  send(
    inbox: string,
    message: Omit<IPCMessage, "id" | "timestamp" | "read" | "attempts">,
  ): Promise<void>;

  readUnread(inbox: string): Promise<IPCMessage[]>;

  markAllRead(inbox: string): Promise<void>;

  subscribe(
    inbox: string,
    handler: (msg: IPCMessage) => void,
    options?: SubscribeOptions,
  ): () => void;

  deadLetter(inbox: string, message: IPCMessage, reason: string): Promise<void>;

  listDeadLetters(inbox: string): Promise<IPCMessage[]>;

  clear(inbox: string): Promise<void>;
}
```

## Methods & Properties

### Properties

#### `capability`
- **Type**: `readonly "ipc"`
- **Description**: A read-only property that identifies the plugin as providing the "ipc" capability [Source 1].

### Methods

#### `send()`
- **Signature**: `send(inbox: string, message: Omit<IPCMessage, ...>): Promise<void>`
- **Description**: Sends a message to the specified inbox. The `id`, `timestamp`, `read`, and `attempts` fields are managed by the IPC implementation [Source 1].

#### `readUnread()`
- **Signature**: `readUnread(inbox: string): Promise<IPCMessage[]>`
- **Description**: Retrieves all unread messages from the specified inbox [Source 1].

#### `markAllRead()`
- **Signature**: `markAllRead(inbox: string): Promise<void>`
- **Description**: Marks all messages currently in the specified inbox as read [Source 1].

#### `subscribe()`
- **Signature**: `subscribe(inbox: string, handler: (msg: IPCMessage) => void, options?: SubscribeOptions): () => void`
- **Description**: Registers a callback function (`handler`) to be invoked [when](./when.md)ever a new message arrives in the specified inbox. Returns an unsubscribe function that, when called, will stop the subscription [Source 1].

#### `deadLetter()`
- **Signature**: `deadLetter(inbox: string, message: IPCMessage, reason: string): Promise<void>`
- **Description**: Moves a message that could not be processed into the dead-letter queue for the specified inbox, along with a reason for the failure [Source 1].

#### `listDeadLetters()`
- **Signature**: `listDeadLetters(inbox: string): Promise<IPCMessage[]>`
- **Description**: Retrieves all messages from the dead-letter queue of the specified inbox [Source 1].

#### `clear()`
- **Signature**: `clear(inbox: string): Promise<void>`
- **Description**: Permanently removes all messages from the specified inbox, including its dead-letter queue [Source 1].

## Events

Implementations of the `IPCAdapter` interface may emit events to provide [Observability](../concepts/observability.md) into their operations. The source material defines a standard event type for dead-lettered messages [Source 1].

- **`ipc:dlq`**: Fired when a message is sent to the dead-letter queue.
  - **Payload**: `{ type: "ipc:dlq"; inbox: string; messageId: string; reason: string }`

## Examples

The following example demonstrates how a function can use any `IPCAdapter` implementation to process messages for an agent without being tied to a specific transport.

```typescript
import type { IPCAdapter, IPCMessage } from 'yaaf';

// A hypothetical IPC implementation is passed to the agent.
// This could be InProcessIPCPlugin or another custom implementation.
declare const ipc: IPCAdapter;

const agentInbox = 'agent-alpha-inbox';

// Function to process incoming messages for an agent
async function processAgentMessages(ipcAdapter: IPCAdapter, inbox: string) {
  console.log(`Checking for messages in ${inbox}...`);
  const messages = await ipcAdapter.readUnread(inbox);

  if (messages.length === 0) {
    console.log('No new messages.');
    return;
  }

  for (const message of messages) {
    try {
      console.log(`Processing message ${message.id} from ${message.from}`);
      // ... application-specific message processing logic ...
    } catch (error) {
      console.error(`Failed to process message ${message.id}. Moving to DLQ.`);
      await ipcAdapter.deadLetter(inbox, message, error.message);
    }
  }

  // Mark all processed (or dead-lettered) messages as read
  await ipcAdapter.markAllRead(inbox);
}

// Using the function with the provided IPC adapter
processAgentMessages(ipc, agentInbox);
```

## See Also

- `InProcessIPCPlugin`: An in-[Memory](../concepts/memory.md), zero-latency implementation of `IPCAdapter` for agents running in the same Node.js process [Source 1].

## Sources

- [Source 1]: `src/integrations/inProcessIPC.ts`