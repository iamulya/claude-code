---
summary: A class that uses an LLM to select the most relevant memories from a store based on a user query.
export_name: MemoryRelevanceEngine
source_file: src/memory/relevance.ts
category: class
title: MemoryRelevanceEngine
entity_type: api
stub: false
compiled_at: 2026-04-16T14:29:56.289Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/relevance.ts
confidence: 1
---

## Overview
The `MemoryRelevanceEngine` is a utility designed to manage context window efficiency by filtering a large corpus of memories down to a relevant subset for a specific user query. Instead of injecting all available memories into an LLM prompt, the engine performs a two-step selection process:

1.  **Index Scanning**: It loads a central index (`MEMORY.md`) and scans the headers (name and description from frontmatter) of all available memory files.
2.  **LLM Selection**: It uses a fast LLM (such as Claude 3.5 Sonnet) to analyze the headers and select a maximum of five relevant memories.

This architecture allows an agent to have access to hundreds of memories while keeping the primary conversation context lean. The selection step is optimized for performance, typically adding approximately 200ms of latency.

## Signature / Constructor

### RelevanceQueryFn
The engine requires a provider-agnostic LLM adapter function to perform the selection.

```typescript
export type RelevanceQueryFn = (params: {
  system: string
  userMessage: string
  maxTokens: number
  signal?: AbortSignal
}) => Promise<string>
```

### Constructor
```typescript
export class MemoryRelevanceEngine {
  constructor(queryFn: RelevanceQueryFn)
}
```

### Supporting Types
```typescript
export type RelevantMemory = {
  path: string
  mtimeMs: number
  filename: string
}
```

## Methods & Properties

### findRelevant()
The primary method for identifying which memories should be attached to the current turn.

**Signature:**
```typescript
async findRelevant(
  query: string,
  headers: MemoryHeader[],
  signal?: AbortSignal
): Promise<RelevantMemory[]>
```

**Parameters:**
- `query`: The user's input string or the current task description.
- `headers`: An array of `MemoryHeader` objects representing the available memory files.
- `signal`: An optional `AbortSignal` to cancel the LLM request.

**Returns:**
A promise resolving to an array of `RelevantMemory` objects, limited to a maximum of five entries.

## Examples

### Basic Usage
This example demonstrates how to initialize the engine with a custom LLM caller and find relevant memories.

```typescript
import { MemoryRelevanceEngine } from 'yaaf';

// Initialize the engine with an LLM adapter
const engine = new MemoryRelevanceEngine(async ({ system, userMessage, maxTokens }) => {
  // Example using a hypothetical LLM client
  const response = await callSonnet({ 
    system, 
    messages: [{ role: 'user', content: userMessage }], 
    maxTokens 
  });
  return response.text;
});

// Find relevant memories for a specific query
const memories = await engine.findRelevant(
  'How do I configure the build system?',
  allHeaders
);

console.log(`Found ${memories.length} relevant memories.`);
```

## See Also
- `MemoryStore` (The storage layer providing the headers)
- `MemoryHeader` (The metadata structure for memory files)