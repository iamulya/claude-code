---
summary: The subsystem responsible for managing conversation state, persistence, and recovery across agent runs.
primary_files:
 - src/session.ts
 - src/plugin/types.ts
title: Session Management
entity_type: subsystem
exports:
 - Session
 - SessionLike
 - listSessions
 - pruneSessionArchives
search_terms:
 - conversation history
 - agent state persistence
 - how to save agent conversations
 - resume agent after crash
 - session recovery
 - JSONL session file
 - SessionAdapter plugin
 - database session storage
 - Redis session backend
 - Postgres session backend
 - prune old sessions
 - conversation compaction
 - long-term agent memory
stub: false
compiled_at: 2026-04-24T18:19:31.923Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/session.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Session Management subsystem provides conversation persistence and crash recovery for YAAF agents [Source 1]. Its primary function is to save the state of a conversation, including the full message history, so that an agent can be restarted and continue exactly where it left off. This ensures that interactions are durable and not lost due to application restarts or failures [Source 1].

## Architecture

The core of the subsystem is the `Session` class, which encapsulates the state and persistence logic for a single conversation [Source 1].

By default, the Session Management subsystem uses the local filesystem for persistence. It serializes the entire conversation history into a `.jsonl` file, where each line is a distinct JSON object representing a message or other session record. This file is typically stored in a `.yaaf/sessions` directory within the current working directory [Source 1].

The architecture is designed to be extensible through a plugin model. [when](../apis/when.md) a `SessionAdapter` plugin is provided (e.g., for Redis, Postgres, or DynamoDB), all persistence operations are delegated to that adapter instead of the local filesystem. This allows developers to use production-grade databases for session storage [Source 1].

The `SessionLike` interface defines a shared contract for session objects, ensuring that both the native filesystem-backed `Session` and any adapter-bridged session implementation have a consistent API surface [Source 1].

The subsystem also supports two key lifecycle features:
1.  **Plan Persistence**: A string-based plan can be saved to the session using `setPlan()`. This plan survives both crash recovery and session compaction, allowing agents to track long-term goals across multiple interactions [Source 1].
2.  **Compaction**: A session's history can be compacted by replacing a series of messages with a summary. When using the filesystem backend, this process creates an archive file (`.archive-<uuid>.jsonl`) containing the original messages [Source 1].

## Integration Points

The Session Management subsystem is primarily used by the agent's main execution runner, which is responsible for creating, resuming, and appending messages to a session during a conversation.

It integrates with the YAAF [Plugin System](./plugin-system.md) to discover and utilize `SessionAdapter` plugins. The plugin host provides the configured adapter, which the `Session` class then uses to delegate all storage operations [Source 1].

## Key APIs

The main public APIs are exposed through the `Session` class and standalone utility functions.

### Session Lifecycle
*   `Session.create(id, owner?, adapter?)`: Creates a new session. Can be backed by the filesystem or a provided `SessionAdapter` [Source 1].
*   `Session.resume(id, owner?, adapter?)`: Loads a previously created session from storage, enabling the agent to continue a conversation [Source 1].
*   `session.delete()`: Permanently deletes the session and its associated data [Source 1].

```typescript
// First run — creates a new session (filesystem)
const session = Session.create('my-agent');

// With an adapter plugin
const adapter = pluginHost.getSessionAdapter()
const session = await Session.create('my-agent', undefined, adapter);

// Resume — works with either backend
const session = await Session.resume('my-agent');
```
[Source 1]

### Conversation Management
*   `session.append(messages)`: Appends one or more `ChatMessage` objects to the session's history [Source 1].
*   `session.getMessages()`: Returns the current list of messages in the conversation history [Source 1].
*   `session.compact(summary)`: Replaces the existing message history with a new summary message to manage context length [Source 1].

### Plan Management
*   `session.setPlan(plan)`: Saves or updates a plan string within the session. Only the most recent plan is retained [Source 1].
*   `session.getPlan()`: Retrieves the currently stored plan, or `null` if none exists [Source 1].

### Utility Functions
*   `listSessions(dir?, adapter?)`: Lists all available session IDs, either from a directory or a `SessionAdapter` [Source 1].
*   `pruneSessionArchives(maxAgeMs, dir?)`: Deletes old session archive files created during compaction to prevent them from accumulating indefinitely [Source 1].

## Configuration

The primary configuration for this subsystem is the selection of a persistence backend.
*   **Default Filesystem Backend**: If no `SessionAdapter` is provided during session creation or resumption, the system defaults to using `.jsonl` files on the local filesystem. The directory can be specified, but defaults to `.yaaf/sessions` in the current working directory [Source 1].
*   **Plugin-Based Backend**: To use a database or other remote storage, a developer must configure and provide an implementation of the `SessionAdapter` interface. This adapter is then passed to the `Session.create` or `Session.resume` methods [Source 1].

## Extension Points

The main extension point is the `SessionAdapter` interface defined in `src/plugin/types.ts`. By implementing this interface, developers can create plugins that allow YAAF to store session data in any backend, such as:
*   Relational databases (Postgres, MySQL)
*   NoSQL databases (MongoDB, DynamoDB)
*   In-[Memory](../concepts/memory.md) stores (Redis)
*   Cloud storage services (S3, Google Cloud Storage)

The adapter is responsible for handling the low-level details of creating, reading, updating, and deleting session records in the target [Storage System](./storage-system.md) [Source 1].

## Sources
[Source 1]: src/session.ts