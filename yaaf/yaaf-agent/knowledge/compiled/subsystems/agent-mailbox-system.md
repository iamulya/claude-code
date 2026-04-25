---
summary: A file-based inter-process communication (IPC) system for multi-agent swarms, enabling agents to communicate without shared memory across process boundaries.
primary_files:
 - src/agents/mailbox.ts
title: Agent Mailbox System
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
 - inter-agent communication
 - agent swarm messaging
 - file-based IPC
 - how do agents talk to each other
 - multi-agent communication
 - agent inbox
 - asynchronous agent messages
 - persistent agent communication
 - tmux agent communication
 - cross-process agent messaging
 - YAAF IPC
 - agent message queue
stub: false
compiled_at: 2026-04-25T00:27:52.520Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/agents/mailbox.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The Agent Mailbox System provides a messaging infrastructure that enables [Agents](../apis/agent.md) to communicate without relying on shared memory [Source 1]. This is a form of [File-based IPC](../concepts/file-based-ipc.md). It is designed to support both single-process agent swarms (where agents are isolated via `AsyncLocalStorage`) and multi-process deployments, such as agents running in separate `tmux` panes or on different machines [Source 1].

The primary goals of this system are to:
- Provide a unified communication protocol for both in-process and multi-process agent collaboration.
- Ensure message persistence, allowing communication to survive agent restarts.
- Eliminate the need for a dedicated message broker or shared server, simplifying deployment.
- Offer a simple, lock-based concurrency model for safe message handling [Source 1].

## Architecture

The system's architecture is centered around a file-based message queue for each agent. Every agent is assigned a dedicated inbox file on the filesystem [Source 1].

- **Inbox Structure**: An agent's inbox is a JSON file located at a path following the pattern `{baseDir}/{teamName}/inboxes/{agentName}.json`. This file contains an array of [MailboxMessage](../apis/mailbox-message.md) objects [Source 1].
- **Message Delivery**: To send a message, an agent appends a new message object to the recipient's inbox file array.
- **Message Retrieval**: A recipient agent polls its inbox file periodically to check for new, unread messages.
- **Concurrency**: The system uses a file-locking mechanism (`proper-lockfile` with retry) to prevent race conditions and ensure atomic updates to the inbox files when multiple agents communicate concurrently [Source 1].

This design choice makes the system robust for distributed and asynchronous agent operations, as messages are persisted on disk and do not require a live connection between agents [Source 1].

## Integration Points

The Agent Mailbox System is a core component of [Inter-Agent Communication](./inter-agent-communication.md) and integrates with several other subsystems:

- **[Agent Orchestration System](./agent-orchestration-system.md)**: The orchestrator uses the mailbox to dispatch tasks and receive status updates from worker agents.
- **[Agents](../apis/agent.md)**: Individual agents use the [Mailbox](../apis/mailbox.md) API to send messages to peers and read their own inboxes.
- **[Permission System](./permission-system.md)**: The system facilitates permission workflows through [PermissionRequest](../apis/permission-request.md) and [PermissionResponse](../apis/permission-response.md) messages, likely integrating with the [Async Approvals Gateway](./async-approvals-gateway.md).
- **[Runtime Management](./runtime-management.md)**: The [ShutdownRequest](../apis/shutdown-request.md) message type allows for graceful shutdown of agents, managed by the runtime environment.

## Key APIs

The public interface for this subsystem is exposed through the `Mailbox` class and several data types for messages and configuration.

- **[Mailbox](../apis/mailbox.md)**: The primary class for interacting with the system. It provides methods to send messages, read unread messages, and mark messages as read [Source 1].
- **[MailboxMessage](../apis/mailbox-message.md)**: The fundamental data structure for a message, containing the sender, content, timestamp, and read status [Source 1].
- **[MailboxConfig](../apis/mailbox-config.md)**: The configuration object used to initialize a `Mailbox` instance, specifying the base directory and polling interval [Source 1].
- **Specialized Message Types**: The system defines several structured message types for specific protocols:
    - [IdleNotification](../apis/idle-notification.md): Used by agents to signal their availability or task completion status.
    - [ShutdownRequest](../apis/shutdown-request.md): A message to request a graceful agent shutdown.
    - [PermissionRequest](../apis/permission-request.md): Sent to request authorization for a specific tool use.
    - [PermissionResponse](../apis/permission-response.md): The reply to a `PermissionRequest`, indicating approval or denial [Source 1].

### Example Usage

The following example demonstrates sending a message from a "researcher" agent to a "coordinator" agent and the coordinator reading its inbox.

```ts
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

## Configuration

The Agent Mailbox System is configured via the [MailboxConfig](../apis/mailbox-config.md) object when instantiating the `Mailbox` class.

- `baseDir` (string): The root directory on the filesystem where all team mailboxes and agent inboxes will be stored. This is a required field.
- `defaultTeam` (string, optional): A default team name to use for operations if one is not explicitly provided.
- `pollIntervalMs` (number, optional): The interval in milliseconds at which an agent polls its inbox for new messages. The default is 500ms [Source 1].

## Sources

[Source 1]: src/agents/mailbox.ts