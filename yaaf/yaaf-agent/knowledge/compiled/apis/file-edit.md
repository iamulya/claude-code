---
summary: Represents a single recorded file edit event, including type, summary, and timestamp.
export_name: FileEdit
source_file: src/context/contentReplacement.ts
category: type
title: FileEdit
entity_type: api
search_terms:
 - file modification tracking
 - content replacement state
 - record file changes
 - edit history
 - file edit object
 - EditType
 - what is a FileEdit
 - how to track edits
 - agent file operations
 - compaction-safe edit history
 - file create event
 - file delete event
stub: false
compiled_at: 2026-04-24T17:06:21.749Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/contentReplacement.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `FileEdit` type is a data structure that represents a recorded modification to a single file within the agent's workspace. It is a core component of the content replacement system, which is designed to preserve the history of file edits across [Context Compaction](../concepts/context-compaction.md) events [Source 1].

Each `FileEdit` object contains details about the edit, including its nature (create, modify, delete, or rename), a human-readable summary, the time it occurred, and a running count of total edits for that specific file [Source 1]. These objects are primarily created and managed by the `ContentReplacementTracker` class.

## Signature

`FileEdit` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type EditType = "create" | "modify" | "delete" | "rename";

export type FileEdit = {
  type: EditType;
  summary: string;
  timestamp: number;
  /** Total number of edits to this file. */
  editCount: number;
};
```

### Properties

- **`type: EditType`**: The kind of file operation performed. `EditType` is an alias for the string literal types `"create"`, `"modify"`, `"delete"`, or `"rename"`.
- **`summary: string`**: A human-readable description of the change made to the file.
- **`timestamp: number`**: A Unix timestamp indicating [when](./when.md) the edit was recorded.
- **`editCount: number`**: The total number of edits that have been recorded for this specific file during the session.

## Examples

The following example shows a typical `FileEdit` object representing a modification to a file. In practice, these objects are managed by a `ContentReplacementTracker` instance rather than being created manually.

```typescript
import { FileEdit } from 'yaaf';

const anEdit: FileEdit = {
  type: 'modify',
  summary: 'Added a null check to the authorization logic on line 42.',
  timestamp: Date.now(),
  editCount: 3, // This is the third edit to this file in the session
};

console.log(anEdit);
```

## See Also

- `ContentReplacementTracker`: The class that uses `FileEdit` objects to track file modifications.

## Sources

[Source 1]: src/context/contentReplacement.ts