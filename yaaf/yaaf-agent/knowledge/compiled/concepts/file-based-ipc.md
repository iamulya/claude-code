---
summary: A communication pattern in YAAF where agents exchange messages via the filesystem to ensure persistence and cross-process compatibility.
title: File-based IPC
entity_type: concept
related_subsystems:
  - agents
  - mailbox
stub: false
compiled_at: 2026-04-16T14:13:43.819Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/mailbox.ts
confidence: 0.95
---

## What It Is
File-based Inter-Process Communication (IPC) is the primary messaging mechanism used by YAAF to facilitate communication between agents within a swarm. Unlike systems that rely on shared memory or external message brokers (like Redis or RabbitMQ), YAAF utilizes the local filesystem as the transport layer.

This approach solves several architectural challenges:
- **Process Isolation**: It allows agents to communicate whether they are running in the same Node.js process (using `AsyncLocalStorage` isolation) or in entirely separate processes, such as different tmux panes or separate machines sharing a mount.
- **Persistence**: Because messages are stored on disk, the communication state survives agent crashes or restarts.
- **Simplicity**: It removes the requirement for a dedicated server or daemon to manage message routing.
- **Concurrency**: It handles simultaneous access through a lock-based mechanism.

## How It Works in YAAF
The core of this concept is implemented in the `Mailbox` class. Each agent in a team is assigned a specific JSON file that serves as its inbox.

### Directory Structure
Mailboxes are organized hierarchically on the filesystem:
`{baseDir}/{teamName}/inboxes/{agentName}.json`

### Message Exchange
The communication flow follows a poll-based model:
1.  **Sending**: When an agent sends a message, the `Mailbox` class appends a `MailboxMessage` object to the recipient's inbox file.
2.  **Concurrency**: To prevent data corruption during simultaneous writes, YAAF uses `proper-lockfile` with a retry strategy to ensure atomic updates to the JSON files.
3.  **Receiving**: Recipient agents poll their respective inbox files at a configurable interval.
4.  **State Management**: Messages include a `read` boolean flag. Agents can retrieve unread messages and subsequently mark them as read to update the file state.

### Message Types
The system supports several structured message types beyond simple text:
- **MailboxMessage**: The standard wrapper containing sender info, text, timestamps, and metadata.
- **IdleNotification**: Used to signal when an agent has completed a task or is available.
- **ShutdownRequest**: Used to coordinate the termination of agent processes.
- **PermissionRequest/Response**: A specialized flow for human-in-the-loop or supervisor-agent tool authorization.

## Configuration
The behavior of the file-based IPC system is defined via the `MailboxConfig` object. Developers can specify the root directory for storage and the frequency at which agents check for new messages.

```typescript
import { Mailbox } from './mailbox';

const config = {
  baseDir: '/tmp/agent-teams',
  defaultTeam: 'research-group',
  pollIntervalMs: 500 // Frequency of inbox checks
};

const mailbox = new Mailbox(config);

// Example: Sending a structured message
await mailbox.send('coordinator', {
  from: 'researcher',
  text: 'Found 3 relevant papers on RAG optimization',
  summary: 'RAG papers found',
}, 'my-team');

// Example: Reading and processing messages
const unread = await mailbox.readUnread('coordinator', 'my-team');
for (const msg of unread) {
  console.log(`${msg.from}: ${msg.text}`);
}

// Mark messages as processed
await mailbox.markAllRead('coordinator', 'my-team');
```

## Sources
- `src/agents/mailbox.ts`