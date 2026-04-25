---
export_name: ShutdownRequest
source_file: src/agents/mailbox.ts
category: type
summary: A message type used to request an agent to shut down.
title: ShutdownRequest
entity_type: api
search_terms:
 - agent shutdown message
 - how to stop an agent
 - terminate agent process
 - mailbox shutdown command
 - agent lifecycle management
 - inter-agent communication
 - agent control messages
 - stopping a running agent
 - shutdown_request type
 - agent termination signal
 - graceful agent shutdown
stub: false
compiled_at: 2026-04-24T17:37:40.569Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/mailbox.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ShutdownRequest` type defines the structure for a message sent to an agent to request its graceful termination [Source 1]. It is part of the file-based [Inter-Process Communication](../concepts/inter-process-communication.md) (IPC) protocol used by the agent `Mailbox` system.

This message type is used in [Multi-Agent Systems](../concepts/multi-agent-systems.md) where one agent (e.g., a supervisor or coordinator) needs to signal another agent to stop its operations. The recipient agent is expected to handle this message by cleaning up its resources and exiting its main loop.

`ShutdownRequest` is one of several structured message types used for agent control, alongside others like `IdleNotification` and `PermissionRequest` [Source 1].

## Signature

The `ShutdownRequest` is a TypeScript `type` alias with the following structure [Source 1]:

```typescript
export type ShutdownRequest = {
  /** A literal string identifying the message type. Must be 'shutdown_request'. */
  type: "shutdown_request";

  /** A unique identifier for this specific shutdown request. */
  requestId: string;

  /** The name of the agent sending the request. */
  from: string;

  /** An optional string explaining the reason for the shutdown. */
  reason?: string;

  /** An ISO 8601 timestamp indicating when the request was created. */
  timestamp: string;
};
```

## Examples

### Creating a ShutdownRequest

Here is an example of how to create a `ShutdownRequest` object. This object would typically be serialized to a JSON string and sent as the `text` payload of a `MailboxMessage`.

```typescript
import { ShutdownRequest } from 'yaaf';

// A supervisor agent creates a request to shut down a worker agent.
const shutdownReq: ShutdownRequest = {
  type: 'shutdown_request',
  requestId: `shutdown-${Date.now()}`,
  from: 'supervisor-agent',
  reason: 'The assigned task has been completed by another agent.',
  timestamp: new Date().toISOString(),
};

// This object would then be sent via the Mailbox system.
// For example:
//
// const message = {
//   from: 'supervisor-agent',
//   text: JSON.stringify(shutdownReq),
//   timestamp: shutdownReq.timestamp,
//   read: false,
// };
//
// await mailbox.send('worker-agent-01', message);
```

## See Also

- `Mailbox`: The class that manages sending and receiving agent messages.
- `MailboxMessage`: The generic wrapper type for all messages sent through the mailbox.
- `IdleNotification`: A message type used to signal an agent's idle status.
- `PermissionRequest`: A message type for requesting permission to perform an action, such as using a tool.

## Sources

[Source 1]: src/agents/mailbox.ts