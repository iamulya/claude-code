---
title: MemoryStore
entity_type: api
summary: A persistent, file-based memory system for storing and retrieving agent knowledge.
export_name: MemoryStore
source_file: src/memory/memoryStore.ts
category: class
search_terms:
 - persistent agent memory
 - file-based knowledge store
 - how to save agent state
 - user preferences storage
 - project context memory
 - agent feedback loop
 - long-term memory for agents
 - memory types
 - private vs team memory
 - MEMORY.md index
 - markdown memory files
 - knowledge persistence
stub: false
compiled_at: 2026-04-24T17:21:52.578Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/memoryStore.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `[[Memory]]Store` class provides a persistent, file-based [Memory System](../subsystems/memory-system.md) for a YAAF agent. Its primary purpose is to store information that is not directly derivable from the current state of a project's codebase, such as user preferences, project goals, or architectural decisions [Source 1]. This design prevents the [Memory](../concepts/memory.md) from becoming a stale cache of information that can be found in the code or git history [Source 1].

Memories are organized using a closed four-type taxonomy [Source 1]:

| Type        | Scope    | Description                                    |
|-------------|----------|------------------------------------------------|
| `user`      | private  | User role, goals, preferences, knowledge       |
| `feedback`  | flexible | Corrections and confirmations of agent approach|
| `project`   | team     | Ongoing work, goals, deadlines, decisions      |
| `reference` | team     | Pointers to external systems and resources     |

Each memory entry is stored as an individual markdown file with YAML [Frontmatter](../concepts/frontmatter.md). An index file, `MEMORY.md`, serves as a lightweight table of contents that is loaded into every conversation context. The individual memory files are surfaced on-demand by a [Relevance Engine](../concepts/relevance-engine.md) [Source 1].

## Constructor

The `MemoryStore` is instantiated with a configuration object specifying the directories for private and team-scoped memories.

```typescript
interface MemoryStoreConfig {
  /**
   * The directory for storing private memories (e.g., 'user' type).
   */
  privateDir: string;

  /**
   * The directory for storing team-shared memories (e.g., 'project', 'reference').
   */
  teamDir: string;
}

export class MemoryStore {
  constructor(config: MemoryStoreConfig);
}
```

## Methods & Properties

The public methods of `MemoryStore` allow for creating, reading, and indexing memories. The following methods are available based on example usage in the source documentation [Source 1].

### save

Saves a new memory entry to the file system.

**Signature**
```typescript
interface MemoryEntry {
  name: string;
  description: string;
  type: 'user' | 'feedback' | 'project' | 'reference';
  content: string;
  scope: 'private' | 'team';
}

save(entry: MemoryEntry): Promise<void>;
```

### getIndex

Reads the contents of the `MEMORY.md` index file.

**Signature**
```typescript
getIndex(): Promise<string>;
```

### scan

Scans the memory directories and returns the headers (frontmatter) of all memory files.

**Signature**
```typescript
interface MemoryHeader {
  name: string;
  description: string;
  type: 'user' | 'feedback' | 'project' | 'reference';
  // ... other frontmatter fields
}

scan(): Promise<MemoryHeader[]>;
```

### read

Reads the full content of a specific memory file.

**Signature**
```typescript
read(filename: string): Promise<MemoryEntry>;
```

## Examples

The following example demonstrates how to instantiate the `MemoryStore` and use its core methods to save and retrieve memories [Source 1].

```typescript
const mem = new MemoryStore({
  privateDir: '/home/user/.agent/memory',
  teamDir: '/home/user/.agent/memory/team',
});

// Create and save a new memory entry
await mem.save({
  name: 'User prefers terse output',
  description: 'Skip summaries, let diffs speak',
  type: 'feedback',
  content: 'No trailing summaries.\n**Why:** "I can read the diff"',
  scope: 'private',
});

// Retrieve the main index file
const index = await mem.getIndex(); // MEMORY.md contents

// Get headers for all memory files
const files = await mem.scan(); // All memory headers

// Read a specific memory file
// Note: The exact filename format is an implementation detail.
const entry = await mem.read('feedback_terse.md');
```

An example of the markdown file format for a memory entry [Source 1]:

```markdown
---
name: User prefers terse output
description: Skip summaries, let diffs speak
type: feedback
---
Lead with the change, don't explain what you did.
**Why:** User said "I can read the diff"
**How to apply:** Never add trailing summaries.
```

## Sources

[Source 1]: src/memory/memoryStore.ts