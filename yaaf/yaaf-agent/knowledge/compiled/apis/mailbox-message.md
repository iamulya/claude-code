---
title: MailboxMessage
entity_type: api
summary: The type definition for messages exchanged between agents via the YAAF Mailbox subsystem.
export_name: MailboxMessage
source_file: src/agents/mailbox.ts
category: type
search_terms:
 - inter-agent communication
 - agent message format
 - mailbox IPC
 - agent message structure
 - how to send data between agents
 - multi-agent messaging
 - YAAF IPC
 - agent swarm communication
 - message passing
 - asynchronous agent messages
 - file-based messaging
stub: false
compiled_at: 2026-04-24T17:20:36.464Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/mailbox.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

`MailboxMessage` is the fundamental data structure for messages exchanged between agents using the file-based `Mailbox` [Inter-Process Communication](../concepts/inter-process-communication.md) (IPC) system. It enables agents to communicate asynchronously without requiring shared [Memory](../concepts/memory.md), supporting both single-process and multi-process agent architectures [Source 2].

The source materials present two different definitions for the `MailboxMessage` type. The definition from the TypeScript source file (`src/agents/mailbox.ts`) is considered the primary, authoritative structure, while the definition from the documentation (`docs/multi-agent.md`) may represent an alternative or outdated version. Both are documented below for completeness [Source 1, Source 2].

## Signature

This section details the two conflicting definitions found in the source material.

### Definition from `src/agents/mailbox.ts`

This definition is exported from the source code and represents the primary structure for messages stored in an agent's inbox file [Source 2].

```typescript
export type MailboxMessage = {
  /** Sender agent name */
  from: string;
  /** Message content (text or JSON-serialized structured message) */
  text: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Whether the recipient has read this message */
  read: boolean;
  /** Optional sender color for UI display */
  color?: string;
  /** Optional short summary for preview */
  summary?: string;
};
```

### Definition from `docs/multi-agent.md`

This definition is found in the multi-agent documentation and describes a message structure with fields for routing, typing, and metadata like TTL and priority [Source 1].

```typescript
type MailboxMessage = {
  id: string;
  from: string;
  to: string;
  type: string;
  data: unknown;
  timestamp: number;
  ttl?: number;       // Auto-expire in ms
  priority?: number;  // Higher = more urgent
}
```

## Examples

The following examples demonstrate how message objects conforming to each definition are used with the `Mailbox` class.

### Example (based on `src/agents/mailbox.ts`)

This example shows an agent named "researcher" sending a message to "coordinator". The object passed to `mailbox.send` contains fields from the primary `MailboxMessage` definition [Source 2].

```typescript
import { Mailbox } from 'yaaf';

const mailbox = new Mailbox({ baseDir: '/tmp/agent-teams' });

// Agent "researcher" sends to "coordinator"
await mailbox.send('coordinator', {
  from: 'researcher',
  text: 'Found 3 relevant papers on RAG optimization',
  summary: 'RAG papers found',
}, 'my-team');

// Coordinator would then read this message from its inbox
const unread = await mailbox.readUnread('coordinator', 'my-team');
for (const msg of unread) {
  console.log(`${msg.from}: ${msg.text}`);
}
```

### Example (based on `docs/multi-agent.md`)

This example shows a message being sent with a `type` and a `data` payload, corresponding to the second definition [Source 1].

```typescript
import { Mailbox } from 'yaaf';

const mailbox = new Mailbox({
  dir: './.agent-mail',
  agentId: 'researcher-1',
});

// Send a message to another agent
await mailbox.send('writer-1', {
  type: 'research-complete',
  data: { topic: 'quantum computing', findings: '...' },
});

// Receive messages
const messages = await mailbox.receive();
for (const msg of messages) {
  // Assuming `msg` conforms to the second definition
  console.log(`From: ${msg.from}, Type: ${msg.type}`);
  console.log(msg.data);
}
```

## See Also

*   `Mailbox`: The class responsible for sending, receiving, and managing `MailboxMessage` objects.
*   [Multi-Agent Systems](../concepts/multi-agent-systems.md): The architectural concept that relies on [Inter-Agent Communication](../subsystems/inter-agent-communication.md) via mailboxes.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/mailbox.ts