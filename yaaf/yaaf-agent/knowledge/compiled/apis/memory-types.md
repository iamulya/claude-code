---
summary: MEMORY_TYPES
title: MEMORY_TYPES
entity_type: api
stub: false
compiled_at: 2026-04-24T17:21:58.370Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/memoryStore.ts
compiled_from_quality: unknown
confidence: 0.95
export_name: "MEMORY_TYPES"
source_file: "src/memory/memoryStore.ts"
category: "constant"
---

## Overview

The `MEMORY_TYPES` constant is a read-only array that defines the closed taxonomy of [Memory](../concepts/memory.md) types used within the YAAF [Memory System](../subsystems/memory-system.md). It ensures that all stored memories are categorized into one of four distinct types, which helps the agent's [Relevance Engine](../concepts/relevance-engine.md) retrieve the correct information at the appropriate time [Source 1].

This taxonomy is designed to store information that is not derivable from the current state of a project's codebase, such as user preferences or high-level project goals. This prevents the memory system from becoming a stale cache of information that already exists in source control [Source 1].

The four memory types are [Source 1]:

| Type        | Scope    | Description                                    |
|-------------|----------|------------------------------------------------|
| `user`      | private  | User roles, goals, preferences, and knowledge. |
| `feedback`  | flexible | Corrections and confirmations of the agent's approach. |
| `project`   | team     | Ongoing work, goals, deadlines, and decisions. |
| `reference` | team     | Pointers to external systems and resources.    |

This constant is also used to derive the `MemoryType` union type, which is used throughout the framework to type-check memory objects [Source 1].

## Signature

`MEMORY_TYPES` is exported as a `const` array of string literals.

```typescript
export const MEMORY_TYPES = ["user", "feedback", "project", "reference"] as const;
```

It is used to define the `MemoryType` union type:

```typescript
export type MemoryType = (typeof MEMORY_TYPES)[number];
// Equivalent to: type MemoryType = "user" | "feedback" | "project" | "reference";
```

## Examples

### Type Validation

The constant can be used to validate if a given string is a valid memory type.

```typescript
import { MEMORY_TYPES, MemoryType } from 'yaaf';

function isValidMemoryType(type: string): type is MemoryType {
  return (MEMORY_TYPES as readonly string[]).includes(type);
}

console.log(isValidMemoryType('feedback')); // true
console.log(isValidMemoryType('ephemeral')); // false
```

### Memory File [Frontmatter](../concepts/frontmatter.md)

Each memory is stored as a markdown file with YAML frontmatter. The `type` field in the frontmatter must be one of the values from `MEMORY_TYPES` [Source 1].

```yaml
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