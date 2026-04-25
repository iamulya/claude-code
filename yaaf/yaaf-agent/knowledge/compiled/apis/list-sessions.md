---
title: listSessions
entity_type: api
summary: Lists all available session IDs, either from the local filesystem or via a provided `SessionAdapter`.
export_name: listSessions
source_file: src/session.ts
category: function
search_terms:
 - find all sessions
 - get session list
 - enumerate sessions
 - session management
 - list session IDs
 - how to see active conversations
 - filesystem session discovery
 - adapter session listing
 - SessionAdapter list
 - discover persisted sessions
 - query for sessions
 - session persistence
stub: false
compiled_at: 2026-04-24T17:17:56.149Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/session.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `listSessions` function is a utility for discovering all persisted conversation sessions. It returns an array of session ID strings [Source 2].

This function operates in two modes:
1.  **Filesystem Mode**: [when](./when.md) a directory path is provided, it scans that directory for session folders and returns their names as session IDs. This is the default behavior for agents that persist sessions locally [Source 1].
2.  **Adapter Mode**: When a `SessionAdapter` instance is provided, the function delegates the request to the adapter. This allows listing sessions stored in external systems like Redis, Postgres, or DynamoDB [Source 2].

It is commonly used for [Session Management](../subsystems/session-management.md) tasks, such as displaying a list of past conversations to a user or for administrative scripts that need to operate on multiple sessions [Source 1].

## Signature

The function is an `async` function that takes an optional directory path and an optional `SessionAdapter` and returns a promise that resolves to an array of strings [Source 2].

```typescript
export async function listSessions(
  dir?: string,
  adapter?: SessionAdapter
): Promise<string[]>;
```

**Parameters:**

*   `dir` (optional `string`): The path to the directory containing session data. Used when operating in filesystem mode.
*   `adapter` (optional `SessionAdapter`): An instance of a session adapter plugin. If provided, the function will list sessions from the backend managed by the adapter.

**Returns:**

*   `Promise<string[]>`: A promise that resolves to an array of session ID strings.

## Examples

### Listing Sessions from the Filesystem

This example shows how to list all session IDs stored in a local directory.

```typescript
import { listSessions } from 'yaaf';

async function showAllSessions() {
  try {
    // Assumes sessions are stored in './.sessions'
    const sessionIds = await listSessions('./.sessions');
    console.log('Available session IDs:', sessionIds);
    // Example output: ['my-bot', 'other-bot', 'user-123-chat']
  } catch (error) {
    console.error('Failed to list sessions:', error);
  }
}

showAllSessions();
```

### Listing Sessions via an Adapter

This example demonstrates how to list sessions when using a `SessionAdapter` plugin for persistence.

```typescript
import { listSessions } from 'yaaf';
import type { SessionAdapter } from 'yaaf';

// Assume 'myAdapter' is an initialized SessionAdapter instance
// (e.g., from a Redis or Postgres plugin)
declare const myAdapter: SessionAdapter;

async function showAdapterSessions() {
  try {
    const sessionIds = await listSessions(undefined, myAdapter);
    console.log('Available session IDs from adapter:', sessionIds);
  } catch (error) {
    console.error('Failed to list sessions via adapter:', error);
  }
}

showAdapterSessions();
```

### Session Management Script

The `listSessions` function can be used alongside other [Utilities](../subsystems/utilities.md) like `pruneOldSessions` for maintenance tasks [Source 1].

```typescript
import { listSessions, pruneOldSessions } from 'yaaf';

const SESSIONS_DIR = './.sessions';

async function manageSessions() {
  const sessions = await listSessions(SESSIONS_DIR);
  console.log(`Found ${sessions.length} sessions.`);

  const prunedCount = await pruneOldSessions(SESSIONS_DIR, {
    olderThanDays: 30,
  });
  console.log(`Removed ${prunedCount} old sessions.`);
}

manageSessions();
```
*Note: One source provides an example where `listSessions` returns an array of objects with session metadata (`[{ id: 'my-bot', ... }]`) [Source 1]. However, the definitive function signature from the source code specifies a return type of `Promise<string[]>` [Source 2]. The examples above follow the source code signature.*

## See Also

*   `Session` class: For creating, resuming, and managing individual sessions.
*   `pruneOldSessions` function: For cleaning up sessions that have not been modified recently.
*   `SessionAdapter` interface: The plugin interface for implementing custom [Session Persistence](../concepts/session-persistence.md) backends.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/session.ts