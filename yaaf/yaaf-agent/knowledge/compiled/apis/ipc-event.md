---
summary: Defines the structure of observability events emitted by YAAF's Inter-Process Communication (IPC) system.
export_name: IPCEvent
source_file: src/integrations/inProcessIPC.ts
category: type
title: IPCEvent
entity_type: api
search_terms:
 - inter-agent communication events
 - IPC observability
 - dead letter queue event
 - message failure notification
 - ipc:dlq event type
 - agent message monitoring
 - YAAF event system
 - how to listen for IPC events
 - backpressure event
 - TTL expired event
 - agent communication monitoring
 - InProcessIPCPlugin events
 - message queue events
stub: false
compiled_at: 2026-04-24T17:14:47.140Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/inProcessIPC.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`IPCEvent` is a TypeScript union type that defines the shape of [Observability Events](../concepts/observability-events.md) emitted by the YAAF [Inter-Process Communication](../concepts/inter-process-communication.md) (IPC) subsystem. These events provide insights into the health and status of message passing between agents, enabling monitoring, debugging, and automated responses to communication failures [Source 1].

The primary use of `IPCEvent` is for typing event listeners that subscribe to IPC-related events from an agent's event emitter. By handling these events, developers can implement custom logic for logging, alerting, or metrics collection related to message delivery [Source 1].

The source material defines one event type within `IPCEvent`:
*   `ipc:dlq`: Fired [when](./when.md) a message is moved to a dead-letter queue after failing delivery [Source 1].

Documentation comments for the `InProcessIPCPlugin` also mention `ipc:backpressure` and `ipc:ttl_expired` as potential [Observability Events](../concepts/observability-events.md). However, these are not included in the `IPCEvent` type definition provided in the source file [Source 1].

## Signature

`IPCEvent` is a union type. The following is the definition from the source code [Source 1].

```typescript
export type IPCEvent =
  | { type: "ipc:dlq"; inbox: string; messageId: string; reason: string };
```

### Event Payloads

#### `ipc:dlq`

This event is emitted when a message is sent to the dead-letter queue.

*   `type`: The literal string `"ipc:dlq"`.
*   `inbox`: The name of the inbox where the message failed delivery.
*   `messageId`: The unique identifier of the dead-lettered message.
*   `reason`: A string explaining why the message was moved to the DLQ.

## Examples

The following example demonstrates how to create an event handler function that is correctly typed to receive `IPCEvent` objects.

```typescript
import type { IPCEvent } from 'yaaf';

// A hypothetical agent instance with an event emitter
declare const agent: {
  on(event: 'ipcEvent', listener: (event: IPCEvent) => void): void;
};

// Define a listener to handle IPC events
const handleIPCEvents = (event: IPCEvent) => {
  switch (event.type) {
    case 'ipc:dlq':
      console.error(
        `Message ${event.messageId} sent to DLQ for inbox '${event.inbox}'. Reason: ${event.reason}`
      );
      // Here you might trigger an alert or increment a metric
      break;
    // Add cases for other IPCEvent types as they are defined
    default:
      console.log('Received an unknown IPC event type');
  }
};

// Subscribe the listener to the agent's IPC events
agent.on('ipcEvent', handleIPCEvents);
```

## See Also

*   `InProcessIPCPlugin`: An in-[Memory](../concepts/memory.md) IPC implementation that emits these events.
*   `IPCAdapter`: The interface that defines the standard contract for IPC plugins in YAAF.

## Sources

[Source 1]: src/[Integrations](../subsystems/integrations.md)/inProcessIPC.ts