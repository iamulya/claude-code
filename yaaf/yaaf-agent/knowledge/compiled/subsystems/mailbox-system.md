---
summary: A file-based IPC messaging system that enables agents to communicate across process boundaries without shared memory or a message broker.
primary_files:
  - src/agents/mailbox.ts
title: Mailbox System
entity_type: subsystem
exports:
  - Mailbox
  - MailboxMessage
  - MailboxConfig
stub: false
compiled_at: 2026-04-16T14:13:37.267Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/agents/mailbox.ts
confidence: 1
---

## Purpose
The Mailbox System provides a robust Inter-Process Communication (IPC) mechanism for LLM-powered agents within the YAAF framework. It is designed to facilitate communication in multi-agent swarms where agents may reside in the same Node.js process (isolated via `AsyncLocalStorage`) or in entirely separate processes (such as different tmux panes or separate machines).

The system addresses several architectural requirements:
*   **Process Independence**: Agents can communicate without shared memory.
*   **Persistence**: Messages are stored on disk, allowing communication to survive agent restarts.
*   **Simplicity**: It eliminates the need for external message brokers or centralized servers.
*   **Concurrency**: It manages simultaneous file access using lock-based concurrency.

## Architecture
The Mailbox System is built on a file-based protocol where each agent is assigned a specific inbox file on the local or network filesystem.

### Storage Structure
Inboxes are organized by team and agent name within a base directory:
`{baseDir}/{teamName}/inboxes/{agentName}.json`

Each inbox file contains a JSON array of `MailboxMessage` objects. When an agent sends a message, the system appends the message to the recipient's inbox file.

### Concurrency and Locking
To prevent data corruption during concurrent writes, the system utilizes `proper-lockfile` with a retry mechanism. This ensures that when multiple agents attempt to message the same recipient simultaneously, the file operations are serialized correctly.

### Message Delivery Model
The system follows a polling-based delivery model. Recipients are responsible for checking their own inbox files for unread messages at a configurable interval (defaulting to 500ms).

## Key APIs
The primary interface for the subsystem is the `Mailbox` class.

### Mailbox Class
The `Mailbox` class handles the lifecycle of message transmission and retrieval.

*   `send(recipient, message, team)`: Appends a new message to a specific agent's inbox.
*   `readUnread(agentName, team)`: Retrieves all messages in an agent's inbox where the `read` flag is set to `false`.
*   `markAllRead(agentName, team)`: Updates the inbox file to mark all existing messages as read.

### Data Structures
The system defines several message types to support different interaction patterns:

| Type | Description |
| :--- | :--- |
| `MailboxMessage` | The standard message format containing sender, text, timestamp, and read status. |
| `IdleNotification` | Used by agents to signal they have completed a task or are available for work. |
| `ShutdownRequest` | A control message used to request that an agent terminate its process. |
| `PermissionRequest` | Used when an agent requires authorization to execute a specific tool. |
| `PermissionResponse` | The response to a permission request, indicating success or failure. |

### Usage Example
```typescript
const mailbox = new Mailbox({ baseDir: '/tmp/agent-teams' });

// Agent "researcher" sends to "coordinator"
await mailbox.send('coordinator', {
  from: 'researcher',
  text: 'Found 3 relevant papers on RAG optimization',
  summary: 'RAG papers found',
  timestamp: new Date().toISOString(),
  read: false
}, 'my-team');

// Coordinator reads their inbox
const unread = await mailbox.readUnread('coordinator', 'my-team');

// Mark all as read
await mailbox.markAllRead('coordinator', 'my-team');
```

## Configuration
The subsystem is configured via the `MailboxConfig` object:

*   **`baseDir`**: The root directory on the filesystem where all team and inbox data is stored.
*   **`defaultTeam`**: (Optional) The default team name to use if one is not provided during API calls.
*   **`pollIntervalMs`**: (Optional) The frequency in milliseconds at which agents check for new messages. Defaults to `500`.