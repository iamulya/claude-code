---
title: Mailbox
entity_type: api
summary: The primary class for sending and receiving messages between agents using a file-based inbox protocol.
export_name: Mailbox
source_file: src/agents/mailbox.ts
category: class
stub: false
compiled_at: 2026-04-16T14:09:32.294Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/multi-agent.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/mailbox.ts
confidence: 1
---

## Overview
The `Mailbox` class provides a file-based Inter-Process Communication (IPC) system for multi-agent swarms. It enables agents to communicate without shared memory, supporting both in-process execution (using `AsyncLocalStorage` isolation) and multi-process execution (such as agents running in separate tmux panes).

The system uses a protocol where each agent is assigned an inbox file located at `{baseDir}/{teamName}/inboxes/{agentName}.json`. Messages are appended to this file, and recipients poll for unread messages. This architecture was chosen to ensure:
*   **Persistence**: Messages survive agent restarts.
*   **Decentralization**: No central message broker or server is required.
*   **Portability**: Communication works across process boundaries and separate machines.
*   **Concurrency**: Simple lock-based concurrency is managed via `proper-lockfile`.

## Signature / Constructor

### Constructor
```typescript
constructor(config: MailboxConfig)
```

### Configuration Types
There is a discrepancy in the source material regarding the configuration object.

**Source Code Definition:**
```typescript
export type MailboxConfig = {
  /** Base directory for all team mailboxes */
  baseDir: string;
  /** Default team name (used when team isn't specified) */
  defaultTeam?: string;
  /** Polling interval in ms (default: 500) */
  pollIntervalMs?: number;
}
```

**Documentation Definition:**
```typescript
type MailboxConfig = {
  /** Directory for mailbox storage */
  dir: string;
  /** Unique identifier for the agent */
  agentId: string;
}
```

## Methods & Properties

### send()
Sends a message to another agent. The signature varies between sources.

**Source Code Signature:**
```typescript
async send(recipient: string, message: Partial<MailboxMessage>, teamName?: string): Promise<void>
```

**Documentation Signature:**
```typescript
async send(agentId: string, message: { type: string; data: unknown }): Promise<void>
```

### Receiving Messages
The API provides methods to retrieve messages from the agent's inbox.

*   **`readUnread(agentName: string, teamName?: string)`**: (Source Code) Retrieves messages that have not yet been marked as read.
*   **`receive()`**: (Documentation) Retrieves messages for the configured `agentId`.

### Acknowledging Messages
Methods to manage the lifecycle of received messages.

*   **`markAllRead(agentName: string, teamName?: string)`**: (Source Code) Marks all messages in the specified inbox as read.
*   **`ack(id: string)`**: (Documentation) Acknowledges a specific message by ID, removing it from the queue.

## Message Formats

### MailboxMessage
The structure of a message within the mailbox system.

**Source Code Version:**
```typescript
export type MailboxMessage = {
  from: string;      // Sender agent name
  text: string;      // Message content
  timestamp: string; // ISO 8601 timestamp
  read: boolean;     // Read status
  color?: string;    // Optional UI display color
  summary?: string;  // Optional short preview
}
```

**Documentation Version:**
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
The framework defines several specialized message schemas for agent coordination:

*   **`IdleNotification`**: Sent when an agent becomes available, fails, or completes a task.
*   **`ShutdownRequest`**: Requests an agent to terminate.
*   **`PermissionRequest`**: Sent by an agent to request authorization to use a specific tool.
*   **`PermissionResponse`**: The response to a tool permission request.

## Examples

### Basic Usage (Source Code Pattern)
```typescript
import { Mailbox } from 'yaaf';

const mailbox = new Mailbox({ baseDir: '/tmp/agent-teams' });

// Agent "researcher" sends to "coordinator"
await mailbox.send('coordinator', {
  from: 'researcher',
  text: 'Found 3 relevant papers on RAG optimization',
  summary: 'RAG papers found',
}, 'my-team');

// Coordinator reads their inbox
const unread = await mailbox.readUnread('coordinator', 'my-team');
for (const msg of unread) {
  console.log(`${msg.from}: ${msg.text}`);
}

// Mark all as read
await mailbox.markAllRead('coordinator', 'my-team');
```

### IPC Usage (Documentation Pattern)
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

// Receive and acknowledge messages
const messages = await mailbox.receive();
for (const msg of messages) {
  console.log(`From: ${msg.from}, Type: ${msg.type}`);
  await mailbox.ack(msg.id);
}
```

## See Also
*   `AgentOrchestrator`
*   `TaskManager`
*   `TeamMemory`