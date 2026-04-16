---
export_name: ContentReplacementTracker
source_file: src/context/contentReplacement.ts
category: class
title: ContentReplacementTracker
entity_type: api
summary: Tracks file modifications across agent session boundaries to preserve context during message compaction.
stub: false
compiled_at: 2026-04-16T14:16:59.937Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/contentReplacement.ts
confidence: 1
---

## Overview
The `ContentReplacementTracker` is a utility class designed to maintain a persistent record of file system modifications performed by an agent. In LLM-powered applications, message histories are frequently "compacted" (truncated or summarized) to stay within token limits. This process often results in the loss of specific details regarding which files were changed and how.

The tracker preserves this knowledge across compaction boundaries. By recording edits as they occur, the system can generate a summary of changes to be re-injected into the LLM's system context, ensuring the agent remains aware of its previous actions even after the original messages describing those actions have been removed from the history.

## Signature / Constructor

```typescript
export class ContentReplacementTracker {
  constructor();
}

export type EditType = 'create' | 'modify' | 'delete' | 'rename';

export type FileEdit = {
  type: EditType;
  summary: string;
  timestamp: number;
  /** Total number of edits to this file. */
  editCount: number;
};

export type ContentReplacementSnapshot = {
  files: Record<string, FileEdit>;
  savedAt: string;
};
```

## Methods & Properties

### recordEdit()
Records a modification to a specific file.
```typescript
recordEdit(filePath: string, edit: { type: EditType; summary: string }): void;
```

### getEditSummary()
Generates a human-readable string summarizing all recorded edits. This is typically used to provide context to the LLM after a history compaction event.
```typescript
getEditSummary(): string;
```

## Examples

### Tracking and Injecting Edits
This example demonstrates how to record a file modification and later retrieve the summary for use in a context manager.

```typescript
const tracker = new ContentReplacementTracker();

// Agent edits a file:
tracker.recordEdit('src/auth.ts', {
  type: 'modify',
  summary: 'Added null check at line 42',
});

// Before compaction, export the state:
const state = tracker.getEditSummary();
// Result: "Files modified this session:\n- src/auth.ts: Added null check at line 42"

// After compaction, inject as system context:
// contextManager.addSection({ content: state, priority: 'medium' });
```

## See Also
* `EditType`
* `FileEdit`
* `ContentReplacementSnapshot`