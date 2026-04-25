---
summary: A communication mechanism where processes exchange messages by reading from and writing to files on a shared filesystem.
title: File-based IPC
entity_type: concept
related_subsystems:
 - Agents
search_terms:
 - agent communication
 - inter-process communication
 - how do YAAF agents talk to each other
 - multi-agent messaging
 - mailbox system
 - persistent agent messages
 - communication across process boundaries
 - asynchronous agent communication
 - YAAF swarm communication
 - file-based messaging
 - agent inbox
 - decoupled agent architecture
stub: false
compiled_at: 2026-04-24T17:55:09.460Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/mailbox.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

File-based [Inter-Process Communication](./inter-process-communication.md) (IPC) is a messaging system in YAAF that enables agents to communicate without relying on shared [Memory](./memory.md) [Source 1]. This mechanism is central to coordinating multi-agent swarms, allowing agents to operate independently while still exchanging information and requests.

The file-based approach was chosen for several key reasons [Source 1]:
*   **Process Agnostic:** It works for agents running within the same Node.js process, in separate processes on the same machine (e.g., different tmux panes), or even on different machines sharing a filesystem.
*   **Persistence:** Messages are written to disk, ensuring they survive agent restarts and can be audited later.
*   **Simplicity:** It avoids the operational overhead of a dedicated message broker or shared server.
*   **Concurrency:** The system uses a simple, robust lock-based concurrency model to manage simultaneous file access.

This design allows for both tightly-coupled (in-process) and loosely-coupled (multi-process) agent architectures using the same underlying communication protocol [Source 1].

## How It Works in YAAF

The primary implementation of this concept is the `Mailbox` class [Source 1]. Each agent is assigned a personal inbox, which is a JSON file on the filesystem. The path to this file follows a standardized structure: `{baseDir}/{teamName}/inboxes/{agentName}.json` [Source 1].

[when](../apis/when.md) one agent sends a message to another, the message object is appended to the recipient's inbox file, which contains an array of messages. The recipient agent periodically polls its inbox file to check for new messages that are marked as unread [Source 1]. A file-locking mechanism (`proper-lockfile`) is used to prevent race conditions when multiple agents read or write to the files concurrently [Source 1].

A standard message, defined by the `MailboxMessage` type, includes fields such as `from`, `text`, `timestamp`, and a `read` flag. YAAF also defines several specialized message types for specific protocol interactions, including `IdleNotification`, `ShutdownRequest`, `PermissionRequest`, and `PermissionResponse` [Source 1].

## Configuration

The behavior of the `Mailbox` system is configured via the `MailboxConfig` object during instantiation. Key parameters include [Source 1]:
*   `baseDir`: The root directory where all team and agent inboxes are stored.
*   `defaultTeam`: A fallback team name to use if one is not specified in a method call.
*   `pollIntervalMs`: The frequency, in milliseconds, at which an agent checks its inbox for new messages. The default is 500ms.

The following example demonstrates how to configure and use the `Mailbox` for sending and receiving messages between two agents, "researcher" and "coordinator" [Source 1].

```typescript
import { Mailbox } from 'path/to/Mailbox';

// Configuration
const mailbox = new Mailbox({ baseDir: '/tmp/agent-teams' });

// Agent "researcher" sends a message to "coordinator" on "my-team"
await mailbox.send('coordinator', {
  from: 'researcher',
  text: 'Found 3 relevant papers on RAG optimization',
  summary: 'RAG papers found',
}, 'my-team');

// Agent "coordinator" reads its unread messages
const unread = await mailbox.readUnread('coordinator', 'my-team');
for (const msg of unread) {
  console.log(`${msg.from}: ${msg.text}`);
}

// After processing, "coordinator" marks all messages as read
await mailbox.markAllRead('coordinator', 'my-team');
```

## Sources
[Source 1] src/agents/mailbox.ts