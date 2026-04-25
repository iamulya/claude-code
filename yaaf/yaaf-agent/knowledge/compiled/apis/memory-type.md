---
summary: MemoryType
title: MemoryType
entity_type: api
stub: false
compiled_at: 2026-04-24T17:21:53.554Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/memoryStore.ts
compiled_from_quality: unknown
confidence: 0.95
export_name: "MemoryType"
source_file: "src/memory/memoryStore.ts"
category: "type"
---

## Overview

`[[[[[[[[Memory]]]]]]]]Type` is a TypeScript union type that defines a closed taxonomy for categorizing persistent memories within the YAAF framework. It ensures that all stored memories are classified into one of four distinct types, which helps the agent's [Relevance Engine](../concepts/relevance-engine.md) retrieve the correct information at the right time [Source 1].

The four allowed Memory types are [Source 1]:

| Type        | Scope    | Description                                    |
|-------------|----------|------------------------------------------------|
| `user`      | private  | User role, goals, preferences, knowledge       |
| `feedback`  | flexible | Corrections AND confirmations of approach      |
| `project`   | team     | Ongoing work, goals, deadlines, decisions    |
| `reference` | team     | Pointers to external systems and resources     |

This classification system is designed to store information that is not derivable from the current state of a project's codebase. Information like code patterns, architecture, and git history are explicitly excluded to prevent the [Memory System](../subsystems/memory-system.md) from becoming a stale cache of the codebase [Source 1].

## Signature

`MemoryType` is a string literal union type derived from the `MEMORY_TYPES` constant [Source 1].

```typescript
export const MEMORY_TYPES = ["user", "feedback", "project", "reference"] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];

// The resulting type is:
// type MemoryType = "user" | "feedback" | "project" | "reference";
```

## Examples

### Usage in MemoryStore

The `MemoryType` is used [when](./when.md) creating and saving new memories with the `MemoryStore` class [Source 1].

```ts
const mem = new MemoryStore({
  privateDir: '/home/user/.agent/memory',
  teamDir: '/home/user/.agent/memory/team',
});

// The 'type' property must be one of the MemoryType values.
await mem.save({
  name: 'User prefers terse output',
  description: 'Skip summaries, let diffs speak',
  type: 'feedback', // 'feedback' is a valid MemoryType
  content: 'No trailing summaries.\n**Why:** "I can read the diff"',
  scope: 'private',
});
```

### Usage in Memory File [Frontmatter](../concepts/frontmatter.md)

When memories are persisted as markdown files, the `type` field in the YAML frontmatter must be a valid `MemoryType` [Source 1].

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