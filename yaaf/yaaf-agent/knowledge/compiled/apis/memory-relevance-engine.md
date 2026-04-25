---
title: MemoryRelevanceEngine
entity_type: api
summary: Selects the most relevant memories from a memory store for a given user query using an LLM.
export_name: MemoryRelevanceEngine
source_file: src/memory/relevance.ts
category: class
search_terms:
 - find relevant memories
 - memory selection
 - context optimization
 - LLM-based memory retrieval
 - how to select memories for prompt
 - reduce context window size
 - relevance filtering
 - agent memory access
 - dynamic context injection
 - query-based memory lookup
 - RelevanceQueryFn
 - memory store search
 - lean context
stub: false
compiled_at: 2026-04-24T17:21:32.797Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/relevance.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `[[[[[[[[Memory]]]]]]]]RelevanceEngine` is a class responsible for selecting the most relevant memories from a Memory store based on a user's query [Source 1]. It uses a Language Learning Model ([LLM](../concepts/llm.md)) to perform this selection, ensuring that the agent's context remains lean while still providing access to a potentially large number of memories [Source 1].

The design follows a specific process [Source 1]:
1. It always loads the `MEMORY.md` file (the memory index) into the [System Prompt](../concepts/system-prompt.md).
2. It scans the headers (name and description from [Frontmatter](../concepts/frontmatter.md)) of all available memory files.
3. It queries a fast LLM (e.g., Claude Sonnet) to choose five or fewer relevant memories based on the headers and the user query.
4. It injects only the content of these selected memories as attachments for the current processing turn.

This approach is a trade-off that adds a small amount of latency (approximately 200ms) and cost per query to keep the primary [Context Window](../concepts/context-window.md) small and focused, which can improve performance and reduce costs for the main [LLM Call](../concepts/llm-call.md) [Source 1].

## Constructor

The `MemoryRelevanceEngine` is instantiated with a `RelevanceQueryFn`, which is a function that wraps an LLM call. This design keeps the framework model-agnostic by allowing the consumer to inject their own LLM adapter [Source 1].

```typescript
import type { RelevanceQueryFn } from 'yaaf';

export class MemoryRelevanceEngine {
  constructor(queryFn: RelevanceQueryFn);
}
```

### `RelevanceQueryFn`

This is the function signature for the LLM call used by the engine [Source 1].

```typescript
export type RelevanceQueryFn = (params: {
  system: string;
  userMessage: string;
  maxTokens: number;
  signal?: AbortSignal;
}) => Promise<string>;
```

## Methods & Properties

### `findRelevant`

This method executes the relevance search. It takes a user query, a list of all available memory headers, and an optional `AbortSignal`, and returns a promise that resolves to an array of `RelevantMemory` objects [Source 1].

```typescript
import type { MemoryHeader } from 'yaaf';
import type { RelevantMemory } from 'yaaf';

public async findRelevant(
  query: string,
  allHeaders: MemoryHeader[],
  signal?: AbortSignal
): Promise<RelevantMemory[]>;
```

#### Related Types

**`RelevantMemory`**

An object representing a memory that has been selected as relevant [Source 1].

```typescript
export type RelevantMemory = {
  path: string;
  mtimeMs: number;
  filename: string;
};
```

**`MemoryHeader`**

An object containing the metadata from a memory file's frontmatter. The `MemoryRelevanceEngine` uses this information to make its selection [Source 1].

```typescript
// Defined in src/memory/memoryStore.ts
export type MemoryHeader = {
  name: string;
  description: string;
  path: string;
  mtimeMs: number;
  filename: string;
};
```

## Examples

The following example demonstrates how to instantiate the `MemoryRelevanceEngine` with a custom LLM call function and then use it to find relevant memories [Source 1].

```typescript
import { MemoryRelevanceEngine } from 'yaaf';
import type { MemoryHeader } from 'yaaf';

// Assume `callSonnet` is a function that calls the Claude Sonnet model.
// Assume `allHeaders` is an array of MemoryHeader objects from a MemoryStore.

const engine = new MemoryRelevanceEngine(async ({ system, userMessage, maxTokens }) => {
  const response = await callSonnet({
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens
  });
  return response.text;
});

const signal = new AbortController().signal;

const memories = await engine.findRelevant(
  'How do I configure the build system?',
  allHeaders,
  signal,
);

console.log(memories);
// [
//   {
//     path: 'path/to/build-config.md',
//     mtimeMs: 1678886400000,
//     filename: 'build-config.md'
//   }
// ]
```

## Sources

[Source 1]: src/memory/relevance.ts