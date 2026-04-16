---
summary: Represents a metadata record for a memory identified as relevant to a query.
export_name: RelevantMemory
source_file: src/memory/relevance.ts
category: type
title: RelevantMemory
entity_type: api
stub: false
compiled_at: 2026-04-16T14:29:57.557Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/relevance.ts
confidence: 1
---

## Overview
`RelevantMemory` is a metadata structure used by the `MemoryRelevanceEngine` to identify specific memory files that should be injected into an agent's context. It contains the file system information required to locate and retrieve the content of a memory after it has been selected by the relevance selection process.

This type is part of the YAAF memory relevance system, which aims to keep context windows lean by selecting a subset of memories (typically $\le 5$) from a larger store based on a user's query.

## Signature / Constructor
```typescript
export type RelevantMemory = {
  path: string
  mtimeMs: number
  filename: string
}
```

## Methods & Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `path` | `string` | The relative or absolute path to the memory file. |
| `mtimeMs` | `number` | The last modification time of the memory file in milliseconds. |
| `filename` | `string` | The name of the file, typically including the extension (e.g., `.md`). |

## Examples
### Basic Usage
The `RelevantMemory` type is typically returned as an array from the `MemoryRelevanceEngine.findRelevant` method.

```typescript
import { RelevantMemory } from 'yaaf/memory';

const selectedMemories: RelevantMemory[] = [
  {
    path: 'memories/build-system.md',
    mtimeMs: 1715684400000,
    filename: 'build-system.md'
  },
  {
    path: 'memories/deployment-guide.md',
    mtimeMs: 1715684500000,
    filename: 'deployment-guide.md'
  }
];
```

## See Also
- `MemoryRelevanceEngine`
- `RelevanceQueryFn`