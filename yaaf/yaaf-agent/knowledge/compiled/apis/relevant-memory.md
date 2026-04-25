---
title: RelevantMemory
entity_type: api
summary: A data structure representing a single memory deemed relevant to a user query by the MemoryRelevanceEngine.
export_name: RelevantMemory
source_file: src/memory/relevance.ts
category: type
search_terms:
 - memory selection data type
 - relevant memory object
 - what does MemoryRelevanceEngine return
 - memory path and filename
 - memory modification time
 - identifying a memory file
 - data structure for memory retrieval
 - how to represent a selected memory
 - memory relevance result
 - type for relevant memories
 - memory file metadata
stub: false
compiled_at: 2026-04-24T17:32:13.222Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/relevance.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `Relevant[[[[[[[[Memory]]]]]]]]` type is a data structure that represents a single Memory file identified as relevant to a user's query. It is primarily used as the return type for the `MemoryRelevanceEngine`, which selects a small subset of memories from a larger store to inject into the current context [Source 1].

Each `RelevantMemory` object contains the necessary metadata to locate and identify a specific memory file on the filesystem, including its path, filename, and last modification time [Source 1].

## Signature

`RelevantMemory` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type RelevantMemory = {
  path: string;
  mtimeMs: number;
  filename: string;
};
```

### Properties

*   **`path: string`**
    The full path to the memory file.

*   **`mtimeMs: number`**
    The last modification time of the file, represented as milliseconds since the UNIX epoch. This can be useful for caching or invalidation logic.

*   **`filename: string`**
    The name of the memory file itself (e.g., `build-system-config.md`).

## Examples

The most common use of `RelevantMemory` is to handle the results from a `MemoryRelevanceEngine` instance. The engine returns an array of `RelevantMemory` objects, which can then be used to load the content of the relevant files.

```typescript
import { MemoryRelevanceEngine, RelevantMemory, MemoryHeader } from 'yaaf';
import { my[[[[[[[[LLM]]]]]]]]Adapter } from './myLLMAdapter'; // Hypothetical adapter

// Assume 'engine' is an initialized MemoryRelevanceEngine instance
const engine = new MemoryRelevanceEngine(myLLMAdapter);

// Assume 'allHeaders' is an array of all available memory headers
const allHeaders: MemoryHeader[] = [
  /* ... loaded from memory store ... */
];

async function findAndLogRelevantMemories(query: string): Promise<void> {
  // The findRelevant method returns a promise that resolves to RelevantMemory[]
  const relevantMemories: RelevantMemory[] = await engine.findRelevant(
    query,
    allHeaders,
  );

  console.log(`Found ${relevantMemories.length} relevant memories for query: "${query}"`);

  for (const memory of relevantMemories) {
    console.log(
      `- Filename: ${memory.filename}, Path: ${memory.path}, Modified: ${new Date(memory.mtimeMs).toISOString()}`
    );
    // Here, you might read the file content from memory.path
  }
}

// Example usage
findAndLogRelevantMemories('How do I configure the build system?');
```

## See Also

*   `MemoryRelevanceEngine`: The class that uses an LLM to select relevant memories and returns an array of `RelevantMemory` objects.
*   `MemoryHeader`: The data structure containing metadata about all memories, which is used as input for the relevance selection process.

## Sources

[Source 1]: src/memory/relevance.ts