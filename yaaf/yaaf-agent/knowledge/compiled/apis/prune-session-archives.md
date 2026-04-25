---
summary: Deletes old session archive files created during compaction to prevent indefinite accumulation.
export_name: pruneSessionArchives
source_file: src/session.ts
category: function
title: pruneSessionArchives
entity_type: api
search_terms:
 - session archive cleanup
 - delete old session files
 - manage session storage
 - prevent disk space usage
 - session compaction artifacts
 - how to clean up .yaaf/sessions
 - prune compact archives
 - session lifecycle management
 - garbage collection for sessions
 - "`.archive-<uuid>.jsonl` files"
 - periodic session maintenance
 - filesystem session backend
stub: false
compiled_at: 2026-04-24T17:31:10.388Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/session.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `pruneSessionArchives` function is a utility for cleaning up old session archive files from the filesystem [Source 1].

[when](./when.md) using the default filesystem backend for sessions, each call to `Session.compact()` creates an archive file with a name like `.archive-<uuid>.jsonl` as a backup of the session state before compaction. Over time, these files can accumulate and consume significant disk space. `pruneSessionArchives` provides a mechanism to delete archives that are older than a specified age, preventing indefinite growth of the session directory [Source 1].

This function should be called periodically as part of application maintenance, similar to how one might prune old, inactive sessions [Source 1]. It operates directly on the session directory and is only relevant when not using a `SessionAdapter` plugin for persistence [Source 1].

## Signature

```typescript
export async function pruneSessionArchives(
  maxAgeMs: number,
  dir?: string
): Promise<string[]>;
```

### Parameters

-   **`maxAgeMs`** `number`
    The maximum age for an archive file, specified in milliseconds. Any archive file with a modification time older than this value will be deleted [Source 1].

-   **`dir`** `string` (optional)
    The path to the session directory. If not provided, it defaults to `.yaaf/sessions` in the current working directory [Source 1].

### Returns

`Promise<string[]>`

A promise that resolves to an array containing the basenames of the archive files that were successfully deleted [Source 1].

## Examples

### Periodic Cleanup of Archives

This example demonstrates how to run `pruneSessionArchives` periodically to delete any archive files older than 30 days.

```typescript
import { pruneSessionArchives } from 'yaaf';

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

async function runCleanup() {
  console.log('Running periodic session archive cleanup...');
  try {
    const deletedFiles = await pruneSessionArchives(THIRTY_DAYS_IN_MS);
    if (deletedFiles.length > 0) {
      console.log(`Successfully pruned ${deletedFiles.length} old archives:`);
      console.log(deletedFiles.join('\n'));
    } else {
      console.log('No old session archives found to prune.');
    }
  } catch (error) {
    console.error('Error during session archive cleanup:', error);
  }
}

// Run cleanup once on startup
runCleanup();

// And then run it once every 24 hours
setInterval(runCleanup, 24 * 60 * 60 * 1000);
```

## See Also

-   `Session`: The class responsible for [Session Management](../subsystems/session-management.md) and persistence.
-   `Session.compact()`: The method that creates the archive files this function cleans up.

## Sources

[Source 1]: src/session.ts