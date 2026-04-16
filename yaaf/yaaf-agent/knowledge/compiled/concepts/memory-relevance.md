---
summary: A design pattern in YAAF that uses a two-step process (index scan + LLM selection) to manage large memory sets within finite context windows.
title: Memory Relevance
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:29:55.148Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/relevance.ts
confidence: 0.9
---

---
title: Memory Relevance
entity_type: concept
summary: A design pattern in YAAF that uses a two-step process (index scan + LLM selection) to manage large memory sets within finite context windows.
related_subsystems:
  - Memory System

## What It Is
Memory Relevance is a design pattern and architectural component in YAAF used to manage large volumes of stored information within the constraints of an LLM's context window. As an agent accumulates memories, it becomes impossible to include all historical data in every prompt without exceeding token limits or increasing latency and costs.

The Memory Relevance engine solves this by acting as a filtering layer. It ensures that the agent remains "context-aware" of hundreds of potential memories while only consuming the token budget required for the most pertinent information.

## How It Works in YAAF
The relevance mechanism in YAAF follows a specific four-step lifecycle managed by the `MemoryRelevanceEngine` class:

1.  **Index Loading**: The system always loads a primary index file, typically `MEMORY.md`, into the system prompt to provide a high-level map of available knowledge.
2.  **Header Scanning**: The engine scans the headers of all available memory files. It specifically extracts the name and description from the frontmatter of each file (defined in the `MemoryHeader` type).
3.  **LLM Selection**: The engine uses a fast, cost-effective model (such as Claude 3 Sonnet) to evaluate the user's current query against the scanned headers. The model is tasked with selecting a maximum of five relevant memories.
4.  **Context Injection**: Only the selected memories are injected as attachments into the current conversation turn.

This approach is designed to be performant and cost-effective. According to the source implementation, the selection step typically adds approximately 200ms of latency and costs between 1 and 2 cents per query, depending on the provider used.

### Technical Components
- **`MemoryRelevanceEngine`**: The primary class responsible for executing the selection logic.
- **`RelevanceQueryFn`**: A function signature that allows developers to inject their own LLM adapter. This ensures the framework remains provider-agnostic, allowing the relevance check to be performed by any supported model.
- **`RelevantMemory`**: A type representing the metadata of a selected memory, including its file path, filename, and last modification time (`mtimeMs`).

## Configuration
Developers configure the relevance engine by providing a concrete implementation of the `RelevanceQueryFn`. This implementation defines which model is used to perform the selection and how the request is formatted.

```typescript
import { MemoryRelevanceEngine } from './memory/relevance.js';

const engine = new MemoryRelevanceEngine(async ({ system, userMessage, maxTokens }) => {
  // Example using a hypothetical provider adapter
  const response = await callSonnet({ 
    system, 
    messages: [{ role: 'user', content: userMessage }], 
    maxTokens 
  });
  return response.text;
});

// Finding relevant memories among a collection of headers
const memories = await engine.findRelevant(
  'How do I configure the build system?',
  allHeaders,
  signal,
);
```

## Sources
- `src/memory/relevance.ts`