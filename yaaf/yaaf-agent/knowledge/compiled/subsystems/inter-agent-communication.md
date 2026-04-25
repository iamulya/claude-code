---
summary: The YAAF subsystem responsible for enabling communication and coordination between agents, both within a single process and across multiple processes.
primary_files:
 - src/agents/mailbox.ts
title: Inter-Agent Communication
entity_type: subsystem
exports:
 - Mailbox
 - MailboxMessage
 - MailboxConfig
 - IdleNotification
 - ShutdownRequest
 - PermissionRequest
 - PermissionResponse
search_terms:
 - agent to agent communication
 - multi-agent systems
 - agent swarms
 - IPC for agents
 - inter-process communication
 - file-based messaging
 - agent mailbox
 - how do agents talk to each other
 - coordinating multiple agents
 - YAAF mailbox system
 - agent message passing
 - Mailbox class
stub: false
compiled_at: 2026-04-24T18:13:37.799Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/mailbox.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Inter-Agent Communication subsystem provides a messaging system that enables agents to communicate and coordinate without requiring shared [Memory](../concepts/memory.md) [Source 1]. It is designed to support both agents running within the same Node.js process (isolated via `AsyncLocalStorage`) and agents running in separate processes, such as different `tmux` panes or on separate machines [Source 1]. The subsystem's primary goal is to offer a unified communication protocol that functions consistently across these different deployment scenarios [Source 1].

## Architecture

The subsystem is implemented as a file-based "mailbox" system. This architectural choice was made for several reasons [Source 1]:
- **Cross-Process Compatibility**: It works across process boundaries without modification.
- **Persistence**: Messages persist on disk, allowing them to survive agent restarts.
- **Simplicity**: It avoids the need for a dedicated message broker or shared server.
- **Concurrency**: It uses a simple, file-lock-based concurrency model to manage access.

Each agent is assigned a dedicated inbox file, which is a JSON file containing an array of messages. The location of this file follows a standardized path structure: `{baseDir}/{teamName}/inboxes/{agentName}.json` [Source 1].

The communication flow is as follows:
1. A sending agent appends a new message object to the recipient agent's inbox file array.
2. The recipient agent periodically polls its inbox file to check for new, unread messages [Source 1].

## Key APIs

The central component of this subsystem is the `Mailbox` class, which provides the primary interface for sending and receiving messages [Source 1].

### `Mailbox` Class
This class manages all file system operations for reading from and writing to agent inboxes.

**Example Usage:**
```typescript
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
[Source 1]

### Message Types
The subsystem defines several structured message types for different communication purposes.

- **`MailboxMessage`**: The base message type. It includes fields for the sender (`from`), content (`text`), a timestamp, and a `read` status flag. It can also contain optional fields for UI display (`color`) and a `summary` [Source 1].

- **`IdleNotification`**: A specialized message used by an agent to broadcast its status, such as being available, interrupted, or having failed a task [Source 1].

- **`ShutdownRequest`**: A message used to request that another agent terminate its operation [Source 1].

- **`PermissionRequest` / `PermissionResponse`**: A request/response pair used to manage permissions for [Tool Use](../concepts/tool-use.md). An agent can send a `PermissionRequest` to another agent (e.g., a human operator or a manager agent) to get approval before executing a tool. The other agent replies with a `PermissionResponse` [Source 1].

## Configuration

The behavior of the `Mailbox` system is configured via the `MailboxConfig` object provided during instantiation.

- **`baseDir`** (string): The root directory on the file system where all team mailboxes and inbox files will be stored [Source 1].
- **`defaultTeam`** (string, optional): The team name to use for operations if one is not explicitly specified [Source 1].
- **`pollIntervalMs`** (number, optional): The interval, in milliseconds, at which an agent polls its inbox for new messages. The default is 500ms [Source 1].

## Sources

[Source 1]: src/agents/mailbox.ts