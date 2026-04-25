---
title: Session
entity_type: api
summary: Manages conversation persistence and crash recovery for LLM agents, supporting both local filesystem and pluggable adapters.
export_name: Session
source_file: src/session.ts
category: class
search_terms:
 - conversation history
 - agent state persistence
 - save chat log
 - resume agent after crash
 - session management
 - jsonl message log
 - pluggable session storage
 - redis session adapter
 - postgres session store
 - how to save agent conversations
 - list all sessions
 - delete old sessions
 - prune sessions
 - SessionAdapter
stub: false
compiled_at: 2026-04-24T17:37:30.480Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/session.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `Session` class provides conversation persistence and crash recovery for agents [Source 3]. It serializes the complete history of an agent's conversation, allowing the agent to resume exactly where it left off after a restart [Source 3]. This is an opt-in feature; by default, agent conversations are not persisted [Source 2].

Persistence can be handled in two ways:
1.  **Local Filesystem (Default):** The session is saved to a local directory. Each session gets its own sub-directory containing a `messages.jsonl` file (an append-only log of chat messages) and a `metadata.json` file [Source 2, 3].
2.  **Pluggable Adapters:** [when](./when.md) a `SessionAdapter` plugin (e.g., for Redis, Postgres, DynamoDB) is provided, all persistence operations are delegated to that adapter instead of the local filesystem [Source 3].

The `Session` class and its related functions provide a complete toolkit for managing the lifecycle of agent conversations, from creation and resumption to listing and pruning old sessions [Source 2].

## Signature / Constructor

Instances of the `Session` class are typically created using one of its static factory methods rather than a direct constructor call.

### `Session.resumeOrCreate(id, options)`

This is the most common method for acquiring a session. It attempts to resume an existing session with the given `id`. If no such session exists, it creates a new one [Source 2].

```typescript
static async resumeOrCreate(
  id: string,
  options: {
    dir: string;
  }
): Promise<Session>;
```

### `Session.create(id, dir?, adapter?)`

Explicitly creates a new session. This will fail if a session with the same `id` already exists [Source 3].

```typescript
static async create(
  id: string,
  dir?: string,
  adapter?: SessionAdapter
): Promise<Session>;
```

### `Session.resume(id, dir?, adapter?)`

Resumes an existing session. This will fail if a session with the given `id` cannot be found [Source 3].

```typescript
static async resume(
  id: string,
  dir?: string,
  adapter?: SessionAdapter
): Promise<Session>;
```

## Methods & Properties

The public API of a `Session` instance is defined by the `SessionLike` interface [Source 3].

### Properties

*   `id: string` (readonly): The unique identifier for the session.
*   `filePath: string` (readonly): The path to the session's data file on the filesystem.
*   `messageCount: number` (readonly): The number of messages currently in the session history.
*   `owner: string | undefined` (readonly): The user ID bound to the session, if any.

### Methods

*   `bind(userId: string): void`: Associates the session with a specific user ID.
*   `canAccess(userId: string): boolean`: Checks if a given user ID has access to the session.
*   `getMessages(): readonly ChatMessage[]`: Returns the entire conversation history as an array of `ChatMessage` objects.
*   `append(messages: ChatMessage[]): Promise<void>`: Appends one or more `ChatMessage` objects to the session history and persists them.
*   `compact(summary: string): Promise<void>`: Replaces the existing message history with a single summary message. For the filesystem backend, this creates a `.archive-<uuid>.jsonl` file as a backup [Source 3].
*   `delete(): Promise<void>`: Deletes the session and its associated data.
*   `setPlan(plan: string): Promise<void>`: Saves a plan string to the session, ensuring it survives compaction and restarts. Subsequent calls overwrite the previous plan [Source 3].
*   `getPlan(): string | null`: Retrieves the plan stored in the session, or `null` if no plan has been set [Source 3].

## Examples

### Creating/Resuming a Session and Attaching to an Agent

This example demonstrates the common pattern of resuming a session if it exists or creating a new one, and then passing it to an `Agent`. The session will automatically save the conversation state after each `agent.run()` completes [Source 2].

```typescript
import { Agent, Session } from 'yaaf';

// Resume the session 'my-chatbot' or create it if it doesn't exist.
// Data will be stored in the ./.sessions directory.
const session = await Session.resumeOrCreate('my-chatbot', {
  dir: './.sessions',
});

const agent = new Agent({
  model: 'gpt-4o',
  session: session, // Attach the session to the agent
  // ... other agent configuration
});

// The agent's conversation will now be persisted in the session.
await agent.run('Hello, what can you do?');
```

### Manual Session Operations

You can also interact with the session directly to read or modify its contents [Source 2].

```typescript
import { Session } from 'yaaf';
import type { ChatMessage } from 'yaaf';

const session = await Session.resumeOrCreate('my-chatbot', {
  dir: './.sessions',
});

// Get all messages from the session history
const history: readonly ChatMessage[] = session.getMessages();
console.log(`Session has ${history.length} messages.`);

// Manually append messages to the session
await session.append([
  { role: 'user', content: 'This is a manual entry.' },
  { role: 'assistant', content: 'Acknowledged.' },
]);

// Clear the entire session history
await session.clear();
```

## Related Functions

YAAF also exports several standalone functions for managing sessions in bulk.

### `listSessions`

Lists all sessions in a given directory or from a `SessionAdapter` [Source 3].

```typescript
import { listSessions } from 'yaaf';

// List all sessions stored in the ./.sessions directory
const sessions = await listSessions('./.sessions');

// Example output:
// [
//   { id: 'my-chatbot', messageCount: 42, lastModified: Date },
//   { id: 'another-agent', messageCount: 12, lastModified: Date }
// ]
console.log(sessions);
```
*Note: Source 2 implies a return type of `Promise<{ id: string, ... }[]>` while Source 3 suggests `Promise<string[]>`. The example from Source 2 is shown above.*

### `pruneOldSessions`

Deletes sessions that have not been modified for a specified number of days [Source 2].

```typescript
import { pruneOldSessions } from 'yaaf';

// Delete all sessions in ./.sessions that are older than 30 days
const prunedCount = await pruneOldSessions('./.sessions', {
  olderThanDays: 30,
});

console.log(`Removed ${prunedCount} old sessions.`);
```

### `pruneSessionArchives`

When a session is compacted via `session.compact()`, an archive file is created. This function cleans up old archive files to prevent them from accumulating indefinitely [Source 3].

```typescript
import { pruneSessionArchives } from 'yaaf';

// Delete archive files older than 60 days (converted to milliseconds)
const MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000;
const deletedArchives = await pruneSessionArchives(MAX_AGE_MS, './.sessions');

console.log(`Deleted ${deletedArchives.length} old session archives.`);
```

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/doctor.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
[Source 3]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/session.ts