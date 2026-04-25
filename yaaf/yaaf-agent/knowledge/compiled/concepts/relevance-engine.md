---
summary: A component within the YAAF memory system that uses a fast LLM to select a small, relevant subset of memories from a larger store to inject into the current context.
title: Relevance Engine
entity_type: concept
related_subsystems:
 - memory
see_also:
 - concept:Memory
 - concept:Context Window Management
 - api:MemoryStore
 - api:MemoryRelevanceEngine
 - api:RelevanceQueryFn
search_terms:
 - how to find relevant memories
 - memory selection
 - context-aware memory retrieval
 - dynamic memory injection
 - LLM for memory search
 - reducing memory context size
 - fast model for relevance
 - what is RelevanceQueryFn
 - memory store search
 - surfacing relevant information
 - on-demand memory
 - contextual memory
stub: false
compiled_at: 2026-04-25T00:23:52.555Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/memoryStore.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/relevance.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

The Relevance Engine is a component within the YAAF memory system responsible for dynamically identifying and surfacing pertinent memories based on the current conversational context or an agent's query [Source 2].

An agent may have access to hundreds of individual [Memory](./memory.md) entries, but including all of them in the [Context Window](./context-window.md) for every [Agent Turn](./agent-turn.md) is inefficient, costly, and can lead to [Context Overflow](./context-overflow.md). The Relevance Engine solves this problem by acting as an intelligent filter. It selects a small subset of the most relevant memories from the [MemoryStore](../apis/memory-store.md) to be included in the prompt, ensuring the agent has the necessary information without being overwhelmed by irrelevant data [Source 2].

## How It Works in YAAF

The Relevance Engine employs a multi-step process that leverages a fast, inexpensive [LLM](./llm.md) to perform the relevance ranking. This keeps the main reasoning model's context lean while still providing access to a large corpus of memories [Source 2].

The process for each turn is as follows:

1.  **Index Loading**: The `MEMORY.md` index file, which acts as a high-level table of contents for all memories, is always loaded into the [System Prompt](./system-prompt.md). This gives the agent a baseline awareness of the available knowledge [Source 1, Source 2].
2.  **Header Scanning**: The engine scans the headers (name and description from the YAML frontmatter) of all individual memory files in the [MemoryStore](../apis/memory-store.md) [Source 2].
3.  **LLM-based Selection**: It then invokes a "fast model" (e.g., Claude Sonnet) through a `[[RelevanceQueryFn]]`. The user query and the list of memory headers are passed to this model, which is prompted to select a small number (e.g., up to five) of the most relevant memories [Source 2].
4.  **Content Injection**: The Relevance Engine parses the fast model's response, which contains the list of selected memory filenames. It then reads the full content of only these selected files and injects them as attachments into the context for the current turn [Source 2].

This approach has a minor trade-off of adding a few hundred milliseconds of latency and a small cost (approximately 1-2 cents per selection) for the relevance check. However, it significantly improves the efficiency and scalability of the agent's memory system [Source 2]. The core logic is implemented in the `[[MemoryRelevanceEngine]]` class, which relies on the `MemoryRelevanceResponseSchema` to safely parse the LLM's JSON output [Source 2].

## Configuration

The Relevance Engine is designed to be model-agnostic. Developers configure it by providing a `[[RelevanceQueryFn]]` during the instantiation of the `[[MemoryRelevanceEngine]]`. This function wraps the call to the desired LLM provider, decoupling the framework from any specific model [Source 2].

```typescript
import { MemoryRelevanceEngine } from 'yaaf-agent';
import { callSonnet } from './my-llm-adapter'; // User-provided LLM adapter

// Instantiate the engine with a function that calls a fast model
const engine = new MemoryRelevanceEngine(async ({ system, userMessage, maxTokens, signal }) => {
  const response = await callSonnet({
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens,
    signal,
  });
  return response.text;
});

// Use the engine to find relevant memories
const allMemoryHeaders = await memoryStore.scan();
const relevantMemories = await engine.findRelevant(
  'How do I configure the build system?',
  allMemoryHeaders,
  abortSignal,
);
```
[Source 2]

## See Also

*   [Memory](./memory.md): The core data unit managed by this system.
*   [MemoryStore](../apis/memory-store.md): The persistent storage layer that the Relevance Engine queries.
*   [Context Window Management](./context-window-management.md): The broader problem space that the Relevance Engine helps address.
*   [MemoryRelevanceEngine](../apis/memory-relevance-engine.md): The primary API for this concept.
*   [RelevanceQueryFn](../apis/relevance-query-fn.md): The function signature used to make the engine model-agnostic.

## Sources

*   [Source 1]: `src/memory/memoryStore.ts`
*   [Source 2]: `src/memory/relevance.ts`