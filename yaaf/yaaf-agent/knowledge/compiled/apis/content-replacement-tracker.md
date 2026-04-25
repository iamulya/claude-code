---
summary: Tracks file edits across compaction boundaries to preserve knowledge of modifications after context reduction.
export_name: ContentReplacementTracker
source_file: src/context/contentReplacement.ts
category: class
title: ContentReplacementTracker
entity_type: api
search_terms:
 - tracking file edits
 - context compaction
 - preserving edit history
 - context window management
 - long-running agent state
 - how to remember file changes
 - state management across compactions
 - file modification summary
 - ContentReplacementSnapshot
 - FileEdit type
 - agent memory loss
 - re-injecting context
 - edit tracking
stub: false
compiled_at: 2026-04-24T16:57:40.475Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/contentReplacement.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ContentReplacementTracker` class provides a mechanism for tracking file edits made by an agent throughout its session [Source 1]. Its primary purpose is to solve the problem of information loss that occurs during [Context Compaction](../concepts/context-compaction.md). [when](./when.md) an agent's [Context Window](../concepts/context-window.md) becomes full, older messages are often removed to make space. This process can erase the agent's [Memory](../concepts/memory.md) of which files it has created, modified, or deleted [Source 1].

This tracker preserves a summary of these file edits. Before context compaction occurs, this summary can be extracted and then re-injected into the agent's context (e.g., as a system message) afterward. This ensures the agent maintains awareness of its past actions, even in long-running sessions with extensive [Context Management](../subsystems/context-management.md) [Source 1].

## Signature / Constructor

The `ContentReplacementTracker` is instantiated with no arguments.

```typescript
export class ContentReplacementTracker {
  constructor();
  // ... methods
}
```

### Related Types

The tracker uses the following types to represent edits and state snapshots [Source 1].

```typescript
/** The type of file edit performed. */
export type EditType = "create" | "modify" | "delete" | "rename";

/** Represents a single tracked edit on a file. */
export type FileEdit = {
  type: EditType;
  summary: string;
  timestamp: number;
  /** Total number of edits to this file. */
  editCount: number;
};

/** A complete snapshot of the tracker's state. */
export type ContentReplacementSnapshot = {
  files: Record<string, FileEdit>;
  savedAt: string;
};
```

## Methods & Properties

*Note: The source material is a signature-only extract. The methods below are inferred from the provided example usage.* [Source 1]

### recordEdit()

Records a new edit for a specific file.

```typescript
recordEdit(filePath: string, editDetails: { type: EditType; summary: string; }): void;
```

- **`filePath`**: The path to the file that was edited.
- **`editDetails`**: An object describing the edit, including its `type` and a `summary`.

### getEditSummary()

Generates a formatted string summarizing all file edits recorded by the tracker. This string is suitable for injection into an agent's context.

```typescript
getEditSummary(): string;
```

- **Returns**: A string summarizing the edits, e.g., `"Files modified this session:\n- src/auth.ts: Added null check at line 42\n..."`.

## Examples

The following example demonstrates the typical lifecycle of using `ContentReplacementTracker` to preserve edit history across context compaction [Source 1].

```typescript
import { ContentReplacementTracker } from 'yaaf';

// In your agent's initialization logic:
const tracker = new ContentReplacementTracker();

// Sometime later, the agent edits a file:
tracker.recordEdit('src/auth.ts', {
  type: 'modify',
  summary: 'Added null check at line 42',
});

// Before running context compaction:
const state = tracker.getEditSummary();
/*
  state might be:
  "Files modified this session:
  - src/auth.ts: Added null check at line 42"
*/

// After compaction, the state can be re-injected into the context.
// (Assuming a contextManager is available)
contextManager.addSection({ content: state, priority: 'medium' });
```

## Sources

[Source 1]: src/context/contentReplacement.ts