---
summary: Defines the structure of messages exchanged via YAAF's IPC system.
export_name: IPCMessage
source_file: src/integrations/inProcessIPC.ts
category: type
title: IPCMessage
entity_type: api
search_terms:
 - inter-process communication message
 - agent message format
 - IPC message structure
 - what is in an IPC message
 - message passing between agents
 - InProcessIPCPlugin message type
 - DistributedIPCBackend message type
 - agent-to-agent communication
 - mailbox message
 - message queue object
 - IPC payload
 - how to send a message
stub: false
compiled_at: 2026-04-24T17:14:53.096Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/inProcessIPC.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/ipc.backend.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `IPCMessage` type defines the standard data structure for all messages sent between agents using YAAF's [Inter-Process Communication](../concepts/inter-process-communication.md) (IPC) system. It serves as the fundamental unit of communication for both same-process and distributed agent swarms [Source 1, Source 2].

This type is used by implementations of the `IPCAdapter` interface, such as `InProcessIPCPlugin`, and by pluggable backends that conform to the `DistributedIPCBackend` interface. It encapsulates not only the message payload but also essential metadata for routing, delivery tracking, and lifecycle management [Source 1, Source 2].

## Signature

`IPCMessage` is a TypeScript type alias with the following structure [Source 1]:

```typescript
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
```

### Fields

| Field         | Type     | Description                                                                                             |
|---------------|----------|---------------------------------------------------------------------------------------------------------|
| `id`          | `string` | A unique identifier for the message, typically a UUID.                                                  |
| `from`        | `string` | The identifier of the sending agent.                                                                    |
| `to`          | `string` | The destination inbox or agent identifier.                                                              |
| `body`        | `string` | The message payload. This is often a JSON-serialized string but can be any plain text.                  |
| `timestamp`   | `string` | An ISO 8601 formatted string representing [when](./when.md) the message was created.                                 |
| `read`        | `boolean`| A flag indicating whether the message has been read by the recipient.                                   |
| `attempts`    | `number` | The number of times delivery has been attempted.                                                        |
| `maxAttempts` | `number` | The maximum number of delivery attempts before the message is sent to the dead-letter queue.            |
| `ttlMs`       | `number` | (Optional) Time-to-live in milliseconds. If the message is not processed within this time, it may be discarded. |
| `color`       | `string` | (Optional) A color string, useful for enhancing visibility in logs and debugging [Tools](../subsystems/tools.md).                 |
| `summary`     | `string` | (Optional) A brief summary of the message content, useful for logging and [Observability](../concepts/observability.md).                |

## Examples

### Creating a Message for Sending

When sending a message using an `IPCAdapter`, several fields (`id`, `timestamp`, `read`, `attempts`) are automatically populated by the IPC system. You only need to provide the core message details.

```typescript
import { Agent, InProcessIPCPlugin } from 'yaaf';
import type { IPCMessage } from 'yaaf';

const ipc = new InProcessIPCPlugin();
const agent = new Agent({
  id: 'agent-1',
  plugins: [ipc],
});

// The object passed to `send` is a subset of the full IPCMessage
const messageToSend: Omit<IPCMessage, 'id' | 'timestamp' | 'read' | 'attempts'> = {
  from: 'agent-1',
  to: 'agent-2',
  body: JSON.stringify({ task: 'process_data', dataId: 'xyz-123' }),
  maxAttempts: 3,
  summary: 'Process data xyz-123',
};

// The IPC plugin will construct the full IPCMessage before sending.
await ipc.send('agent-2-inbox', messageToSend);
```

### Receiving a Message

A subscription handler receives the complete `IPCMessage` object, including all system-managed metadata.

```typescript
import type { IPCMessage } from 'yaaf';

const ipc = new InProcessIPCPlugin();

// A handler function that processes incoming messages
const handleMessage = (msg: IPCMessage) => {
  console.log(`Received message ${msg.id} from ${msg.from}`);
  console.log(`Timestamp: ${msg.timestamp}`);
  console.log(`Body: ${msg.body}`);
  
  const payload = JSON.parse(msg.body);
  // ... process payload
};

// Subscribe to an inbox
const unsubscribe = ipc.subscribe('agent-2-inbox', handleMessage);
```

## See Also

*   `InProcessIPCPlugin`: The default, in-[Memory](../concepts/memory.md) IPC implementation for same-process communication.
*   `IPCAdapter`: The interface that defines the standard capabilities for IPC plugins.
*   `DistributedIPCBackend`: The interface for implementing custom, cross-process message transport backends (e.g., using Redis).

## Sources

*   [Source 1]: `src/integrations/inProcessIPC.ts`
*   [Source 2]: `src/integrations/ipc.backend.ts`