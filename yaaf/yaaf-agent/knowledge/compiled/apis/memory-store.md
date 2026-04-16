---
export_name: MemoryStore
source_file: src/memory/memoryStore.ts
category: class
title: MemoryStore
entity_type: api
summary: A persistent, file-based memory system for storing non-derivable agent knowledge using a four-type taxonomy.
stub: false
compiled_at: 2026-04-16T14:29:46.998Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/memoryStore.ts
confidence: 0.98
---

## Overview
`MemoryStore` is a persistent, file-based memory system designed to store information that is not derivable from a project's current state (such as code patterns, architecture, or git history). It organizes knowledge into a closed four-type taxonomy and stores individual entries as Markdown files with YAML frontmatter.

The system utilizes a dual-directory structure to separate `private` (user-specific) and `team` (shared) scopes. A central `MEMORY.md` index file serves as a lightweight table of contents that can be loaded into conversation contexts, while specific topic files are retrieved on-demand.

### Memory Taxonomy
| Type | Scope | Description |
| :--- | :--- | :--- |
| `user` | private | User role, goals, preferences, and knowledge. |
| `feedback` | flexible | Corrections and confirmations of the agent's approach. |
| `project` | team | Ongoing work, goals, deadlines, and decisions. |
| `reference` | team | Pointers to external systems and resources. |

## Signature / Constructor

```typescript
export type MemoryType = 'user' | 'feedback' | 'project' | 'reference';

export class MemoryStore {
  constructor(config: {
    privateDir: string;
    teamDir: string;
  });
}
```

### Configuration Properties
*   `privateDir`: The local filesystem path where private/user-specific memories are stored.
*   `teamDir`: The filesystem path for shared project or reference memories.

## Methods & Properties

### `save()`
Saves a memory entry to the filesystem as a Markdown file with YAML frontmatter.
```typescript
async save(memory: {
  name: string;
  description: string;
  type: MemoryType;
  content: string;
  scope: 'private' | 'team';
}): Promise<void>;
```

### `getIndex()`
Retrieves the contents of the `MEMORY.md` index file, which acts as a table of contents for the store.
```typescript
async getIndex(): Promise<string>;
```

### `scan()`
Scans the memory directories and returns the headers/metadata for all stored memories.
```typescript
async scan(): Promise<any[]>;
```

### `read()`
Reads a specific memory entry by its filename.
```typescript
async read(filename: string): Promise<string>;
```

## Examples

### Basic Usage
This example demonstrates initializing the store and saving a piece of user feedback.

```typescript
const mem = new MemoryStore({
  privateDir: '/home/user/.agent/memory',
  teamDir: '/home/user/.agent/memory/team',
});

// Persisting a user preference
await mem.save({
  name: 'User prefers terse output',
  description: 'Skip summaries, let diffs speak',
  type: 'feedback',
  content: 'No trailing summaries.\n**Why:** "I can read the diff"',
  scope: 'private',
});

// Retrieving memory information
const index = await mem.getIndex();       // Get MEMORY.md contents
const files = await mem.scan();           // Get all memory headers
const entry = await mem.read('feedback_terse.md');
```

### Storage Format
Memories are stored on disk in the following format:

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