---
summary: Defines the types of file edit operations (create, modify, delete, rename).
export_name: EditType
source_file: src/context/contentReplacement.ts
category: type
title: EditType
entity_type: api
search_terms:
 - file edit types
 - create modify delete rename
 - file operation enumeration
 - content replacement tracker
 - tracking file changes
 - what are the possible file edits
 - FileEdit type property
 - string literal for file operations
 - agent file system actions
 - code modification types
 - YAAF file manipulation
stub: false
compiled_at: 2026-04-24T17:03:50.452Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/contentReplacement.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`EditType` is a TypeScript string literal union type that enumerates the possible kinds of file modifications an agent can perform [Source 1]. It is used to categorize file operations within the framework, particularly for tracking changes over time.

This type is a key component of the `FileEdit` interface, where it specifies the nature of a recorded change. The `ContentReplacementTracker` class uses this information to maintain a summary of file edits, which is crucial for preserving an agent's [Memory](../concepts/memory.md) of its actions across [Context Compaction](../concepts/context-compaction.md) events [Source 1].

The four possible values for `EditType` are:
- `"create"`: A new file was created.
- `"modify"`: An existing file was changed.
- `"delete"`: A file was removed.
- `"rename"`: A file was renamed.

## Signature

`EditType` is defined as a string literal union type [Source 1].

```typescript
export type EditType = "create" | "modify" | "delete" | "rename";
```

It is used as a property within the `FileEdit` type to classify the operation performed [Source 1]:

```typescript
export type FileEdit = {
  type: EditType;
  summary: string;
  timestamp: number;
  editCount: number;
};
```

## Examples

The following example demonstrates how `EditType` is used [when](./when.md) creating `FileEdit` objects to record different kinds of file system operations.

```typescript
import { EditType, FileEdit } from 'yaaf';

// Example of recording a file creation
const creationRecord: FileEdit = {
  type: 'create', // This value is of type EditType
  summary: 'Added new configuration file for the database connection.',
  timestamp: Date.now(),
  editCount: 1,
};

// Example of recording a file modification
const modificationRecord: FileEdit = {
  type: 'modify', // This value is of type EditType
  summary: 'Updated database host in the configuration file.',
  timestamp: Date.now(),
  editCount: 2,
};
```

## See Also

- `FileEdit`: The interface that uses `EditType` to structure information about a single file change.
- `ContentReplacementTracker`: The class that consumes `FileEdit` objects to track a history of file modifications.

## Sources

[Source 1]: src/context/contentReplacement.ts