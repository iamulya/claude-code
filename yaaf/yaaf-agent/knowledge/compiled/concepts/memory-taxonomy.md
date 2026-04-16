---
tags:
  - architecture
  - memory
  - taxonomy
title: Memory Taxonomy
entity_type: concept
summary: A closed four-type classification system used by YAAF to categorize and scope persistent agent memories.
related_subsystems:
  - MemoryStore
stub: false
compiled_at: 2026-04-16T14:29:50.672Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/memoryStore.ts
confidence: 0.97
---

## What It Is
The **Memory Taxonomy** in YAAF is a structured classification system for persistent information that cannot be derived from the current state of a codebase or project. It provides a framework for the agent to distinguish between user preferences, project-specific goals, and external references.

The primary design goal of this taxonomy is to prevent the memory system from becoming a "stale cache" of the codebase. By explicitly excluding derivable data—such as code patterns, architecture, and git history—YAAF ensures that the memory store only contains high-value, non-redundant information that informs the agent's behavior and decision-making process.

## How It Works in YAAF
YAAF implements a closed taxonomy consisting of four distinct types, each with a specific scope and purpose:

| Type | Scope | Description |
| :--- | :--- | :--- |
| `user` | private | Captures the user's specific role, long-term goals, personal preferences, and specialized knowledge. |
| `feedback` | flexible | Stores both corrections and confirmations of the agent's approach (e.g., "User prefers terse output"). |
| `project` | team | Tracks ongoing work, high-level project goals, deadlines, and key architectural decisions. |
| `reference` | team | Contains pointers to external systems, documentation, and resources relevant to the team. |

### Storage Format
Memories are persisted as individual Markdown files. Each file contains a YAML frontmatter block that defines the memory's metadata, followed by the content and rationale.

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

### Retrieval Mechanism
The memory system utilizes a two-tier retrieval strategy:
1.  **Index Loading:** A `MEMORY.md` index file acts as a lightweight table of contents. This index is loaded into every conversation context to provide the agent with a high-level map of available memories.
2.  **On-Demand Surfacing:** Individual topic files are retrieved and injected into the context by a relevance engine only when the specific information is required for the current task.

## Configuration
The taxonomy is enforced by the `MemoryStore` class. When saving a memory, the developer must specify one of the four valid `MemoryType` values.

```typescript
import { MemoryStore } from './memory';

const mem = new MemoryStore({
  privateDir: '/path/to/private/memory',
  teamDir: '/path/to/team/memory',
});

await mem.save({
  name: 'User prefers terse output',
  description: 'Skip summaries, let diffs speak',
  type: 'feedback', // Must be 'user', 'feedback', 'project', or 'reference'
  content: 'No trailing summaries.\n**Why:** "I can read the diff"',
  scope: 'private',
});
```

The `MemoryStore` distinguishes between `privateDir` (for `user` and private `feedback`) and `teamDir` (for `project` and `reference` types) to maintain appropriate data boundaries.