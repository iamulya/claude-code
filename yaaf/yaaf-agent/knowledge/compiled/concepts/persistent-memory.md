---
summary: The concept of long-term, durable storage for an agent's knowledge, implemented as a file-based system with structured markdown entries and a defined taxonomy.
title: Persistent Memory
entity_type: concept
related_subsystems:
 - "[Memory System](../subsystems/memory-system.md)"
see_also:
 - "[Memory](./memory.md)"
 - "[MemoryStore](../apis/memory-store.md)"
 - "[Relevance Engine](./relevance-engine.md)"
 - "[Two-Directory Memory Model](./two-directory-memory-model.md)"
search_terms:
 - long term agent memory
 - how does yaaf remember things
 - agent knowledge storage
 - file-based memory
 - markdown memory files
 - MemoryStore class
 - memory taxonomy
 - user preferences storage
 - project memory
 - feedback memory
 - durable agent state
 - agent session persistence
stub: false
compiled_at: 2026-04-25T00:22:40.569Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/memoryStore.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Persistent Memory is a component of the YAAF [Memory System](../subsystems/memory-system.md) that provides agents with long-term, durable storage for knowledge that persists across sessions and restarts [Source 1]. It solves the problem of agent amnesia, allowing an agent to learn from past interactions, retain user preferences, and maintain context on long-running projects.

In YAAF, this is implemented as a file-based system. A key design principle is that Persistent Memory stores information that is *not* derivable from the current project state, such as code patterns or git history. This prevents the memory from becoming a stale cache of the codebase and ensures it holds unique, high-value information [Source 1].

## How It Works in YAAF

The primary implementation of Persistent Memory is the [MemoryStore](../apis/memory-store.md) class, which manages a file-based storage system [Source 1].

### Storage Format

Memories are stored as individual markdown files with YAML [Frontmatter](./frontmatter.md). This structure makes memories human-readable and easy to manage [Source 1].

An example memory file:
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

### Memory Taxonomy

YAAF defines a closed, four-type taxonomy for memories to ensure consistent organization [Source 1]:

| Type        | Scope    | Description                                    |
|-------------|----------|------------------------------------------------|
| `user`      | private  | User role, goals, preferences, knowledge       |
| `feedback`  | flexible | Corrections AND confirmations of approach      |
| `project`   | team     | Ongoing work, goals, deadlines, decisions     |
| `reference` | team     | Pointers to external systems and resources     |

The system uses separate directories for private (`user`) and team-scoped (`project`, `reference`) memories, a pattern detailed in the [Two-Directory Memory Model](./two-directory-memory-model.md) concept [Source 1].

### Retrieval Mechanism

A special index file, `MEMORY.md`, acts as a lightweight table of contents. Its contents are loaded into every conversation context to give the agent a high-level overview of its available knowledge. The full content of individual memory files is surfaced on-demand by the [Relevance Engine](./relevance-engine.md) when deemed relevant to the current task [Source 1].

## Configuration

A developer configures Persistent Memory by instantiating the [MemoryStore](../apis/memory-store.md) class and providing paths to the directories where private and team memories should be stored [Source 1].

```typescript
import { MemoryStore } from 'yaaf-agent';

const mem = new MemoryStore({
  privateDir: '/home/user/.agent/memory',
  teamDir: '/home/user/project/.agent/memory/team',
});

await mem.save({
  name: 'User prefers terse output',
  description: 'Skip summaries, let diffs speak',
  type: 'feedback',
  content: 'No trailing summaries.\n**Why:** "I can read the diff"',
  scope: 'private',
});

const index = await mem.getIndex(); // MEMORY.md contents
```

## See Also

- [Memory](./memory.md): The broader concept of an agent's working and long-term knowledge.
- [Memory System](../subsystems/memory-system.md): The subsystem responsible for all memory-related operations.
- [MemoryStore](../apis/memory-store.md): The API for interacting with the file-based persistent memory.
- [Relevance Engine](./relevance-engine.md): The concept for how relevant memories are surfaced from storage.
- [Two-Directory Memory Model](./two-directory-memory-model.md): The pattern for separating private and shared agent memories.

## Sources

[Source 1]: src/memory/memoryStore.ts