---
title: pruneOldSessions
entity_type: api
summary: A function to delete YAAF sessions older than a specified duration from a directory.
export_name: pruneOldSessions
source_file: src/session.ts
category: function
search_terms:
 - delete old sessions
 - clean up session files
 - session garbage collection
 - manage session history
 - remove stale conversations
 - session lifecycle management
 - how to prune sessions
 - session directory cleanup
 - olderThanDays option
 - session file maintenance
 - yaaf session management
stub: false
compiled_at: 2026-04-24T17:31:04.629Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md
compiled_from_quality: documentation
confidence: 0.95
---

## Overview

The `pruneOldSessions` function is a utility for managing the lifecycle of persisted agent sessions. It scans a specified directory for session data and deletes any sessions that have not been modified within a given time frame. This is useful for routine maintenance to prevent the session storage directory from growing indefinitely with stale conversation data [Source 1].

The function operates on the session directory structure used by the `Session` class, where each session is a subdirectory containing `messages.jsonl` and `metadata.json` files. It determines a session's age based on the last modified timestamp of its subdirectory [Source 1].

## Signature

`pruneOldSessions` is an asynchronous function that takes the path to the sessions directory and an options object specifying the age threshold for pruning. It returns a promise that resolves to the number of sessions that were deleted [Source 1].

```typescript
export declare function pruneOldSessions(
  sessionsDir: string,
  options: { olderThanDays: number }
): Promise<number>;
```

**Parameters:**

*   `sessionsDir` (string): The path to the parent directory containing all session subdirectories (e.g., `./.sessions`).
*   `options` (object): An object containing the pruning criteria.
    *   `olderThanDays` (number): The minimum age in days for a session to be considered for deletion. A session is pruned if its last modification time is more than this many days in the past.

**Returns:**

*   `Promise<number>`: A promise that resolves with the total count of session directories that were successfully removed.

## Examples

The following example demonstrates how to use `pruneOldSessions` to remove all sessions from the `./.sessions` directory that have not been modified in the last 30 days [Source 1].

```typescript
import { pruneOldSessions } from 'yaaf';

// Prune old sessions
const pruned = await pruneOldSessions('./.sessions', {
  olderThanDays: 30,
});

console.log(`Removed ${pruned} old sessions`);
```

## See Also

*   `Session`: The class for creating and managing individual agent sessions.
*   `listSessions`: A function to list all available sessions in a directory.

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/security.md