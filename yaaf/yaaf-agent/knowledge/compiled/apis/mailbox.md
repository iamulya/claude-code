---
summary: A YAAF API for file-based inter-agent messaging, enabling asynchronous communication.
title: Mailbox
entity_type: api
export_name: Mailbox
source_file: src/agents/mailbox.ts
category: class
search_terms:
 - inter-agent communication
 - agent messaging
 - multi-agent IPC
 - file-based message queue
 - agent swarm communication
 - asynchronous agent messages
 - how to send message between agents
 - persistent agent messages
 - cross-process agent communication
 - mailbox IPC
 - agent inbox
 - decoupled agent architecture
stub: false
compiled_at: 2026-04-24T17:20:27.334Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/mailbox.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/integrations/ipc.backend.ts
compiled_from_quality: unknown
confidence: 0.99
---

## Overview

The `Mailbox` class provides a file-based [Inter-Process Communication](../concepts/inter-process-communication.md) (IPC) system for multi-agent applications in YAAF [Source 2]. It enables agents to communicate asynchronously without relying on shared [Memory](../concepts/memory.md), which is crucial for building robust agent swarms [Source 1, Source 2].

The file-based approach was chosen for several reasons [Source 2]:
*   **Cross-Process Compatibility**: It works for agents running in the same Node.js process as well as for agents running in separate processes (e.g., different tmux panes or on different machines sharing a filesystem).
*   **Persistence**: Messages are stored on disk, allowing them to survive agent restarts.
*   **Simplicity**: It avoids the need for a dedicated message broker or shared server.
*   **Concurrency**: It uses a simple, file-lock-based concurrency model.

Each agent is assigned an inbox file located at `{baseDir}/{teamName}/inboxes/{agentName}.json`. Messages are appended to an array within this JSON file, and recipient agents poll their inbox for new messages [Source 2].

## Signature / Constructor

The `Mailbox` class is instantiated with a configuration object that defines its operational parameters.

```typescript
import { Mailbox, type MailboxConfig } from 'yaaf';

const mailbox = new Mailbox({
  baseDir: './.agent-mail',
  defaultTeam: 'default-team',
  pollIntervalMs: 500,
});
```

### Configuration

The constructor accepts a `MailboxConfig` object with the following properties [Source 2]:

```typescript
export type MailboxConfig = {
  /** Base directory for all team mailboxes */
  baseDir: string;
  /** Default team name (used [[[[[[[[when]]]]]]]] team isn't specified) */
  defaultTeam?: string;
  /** Polling interval in ms (default: 500) */
  pollIntervalMs?: number;
};
```

## Message Format

The structure of messages sent via the `Mailbox` can vary. Source materials provide different definitions for the message format.

### Standard Message Format

The primary `MailboxMessage` type is defined as follows [Source 2]:

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

### Alternative Message Format

Another source describes a more structured message format with additional fields for metadata like TTL and priority [Source 1].

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

### Specialized Message Types

The framework also defines several specialized message types for specific system interactions [Source 2]:

*   `IdleNotification`: Notifies that an agent is idle and available for tasks.
*   `ShutdownRequest`: Requests an agent to shut down gracefully.
*   `PermissionRequest`: Used when an agent needs to request permission before using a tool.
*   `PermissionResponse`: The response to a `PermissionRequest`.

## Methods & Properties

The public API of the `Mailbox` class facilitates sending and receiving messages. Note that different sources show slightly different method names for reading and acknowledging messages.

### send()

Sends a message to another agent's mailbox.

```typescript
// Signature from Source 2
public async send(
  recipient: string,
  message: Omit<MailboxMessage, 'read' | 'timestamp'>,
  team?: string
): Promise<void>;

// Signature from Source 1
public async send(
  recipient: string,
  message: { type: string; data: unknown }
): Promise<void>;
```

### readUnread()

Reads all unread messages from an agent's inbox. This corresponds to the `receive()` method shown in some documentation [Source 2].

```typescript
public async readUnread(
  agentName: string,
  team?: string
): Promise<MailboxMessage[]>;
```

### markAllRead()

Marks all messages in an agent's inbox as read. This is an alternative to acknowledging messages one by one [Source 2].

```typescript
public async markAllRead(
  agentName: string,
  team?: string
): Promise<void>;
```

### Discrepancies in API

Some documentation shows a `receive()` and `ack(id)` pattern for message handling, which differs from the `readUnread()` and `markAllRead()` methods found in the source code extracts [Source 1]. Users should be aware of this potential variation. The `receive()` and `ack()` methods from this documentation are shown below:

*   `receive(): Promise<MailboxMessage[]>`: Fetches messages from the agent's inbox.
*   `ack(messageId: string): Promise<void>`: Acknowledges a single message, removing it from the queue.

## Examples

### Sending and Receiving Messages (Pattern 1)

This example demonstrates sending a structured message, receiving it, and acknowledging it individually [Source 1].

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
  console.log(`From: ${msg.from}, Type: ${msg.type}`);
  console.log(msg.data);
}

// Acknowledge (removes from queue)
if (messages.length > 0) {
  await mailbox.ack(messages[0].id);
}
```

### Sending and Reading Messages (Pattern 2)

This example uses the `readUnread` and `markAllRead` pattern, which is common for polling-based consumption [Source 2].

```typescript
import { Mailbox } from 'yaaf';

const mailbox = new Mailbox({ baseDir: '/tmp/agent-teams' });

// Agent "researcher" sends to "coordinator" on a specific team
await mailbox.send('coordinator', {
  from: 'researcher',
  text: 'Found 3 relevant papers on RAG optimization',
  summary: 'RAG papers found',
}, 'my-team');

// Coordinator reads their inbox for that team
const unread = await mailbox.readUnread('coordinator', 'my-team');
for (const msg of unread) {
  console.log(`${msg.from}: ${msg.text}`);
}

// Mark all messages as read
await mailbox.markAllRead('coordinator', 'my-team');
```

## See Also

*   **AgentOrchestrator**: A higher-level abstraction for spawning and coordinating multiple agents that use mailboxes for communication [Source 1].
*   **TaskManager**: A state machine for managing the lifecycle of tasks distributed among agents [Source 1].
*   **[DistributedIPCBackend](./distributed-ipc-backend.md)**: For deployments requiring communication across multiple server replicas (e.g., in a multi-pod Kubernetes setup), a `DistributedIPCBackend` like one based on Redis can be used as a pluggable transport layer instead of the default file-based system [Source 3].

## Sources

*   [Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/multi-agent.md
*   [Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/mailbox.ts
*   [Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/[Integrations](../subsystems/integrations.md)/ipc.backend.ts