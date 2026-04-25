---
title: Memory Relevance
entity_type: concept
summary: A mechanism in YAAF that uses a fast LLM to select the most relevant memories from a large store to include in the current context for a given query.
related_subsystems:
 - Memory Subsystem
search_terms:
 - how to select relevant memories
 - agent memory management
 - context window optimization
 - LLM memory retrieval
 - reducing context size
 - fast memory selection
 - MemoryRelevanceEngine
 - RelevanceQueryFn
 - keeping context lean
 - dynamic memory injection
 - memory store filtering
 - what is memory relevance
stub: false
compiled_at: 2026-04-24T17:58:31.633Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/relevance.ts
compiled_from_quality: unknown
confidence: 0.85
---

## What It Is
[Memory](./memory.md) Relevance is the process within YAAF for dynamically selecting the most pertinent memories from a large memory store in response to a specific user query [Source 1]. This mechanism addresses the challenge of providing an agent with access to a vast knowledge base (potentially hundreds of memories) while respecting the size, cost, and latency constraints of an [LLM](./llm.md)'s [Context Window](./context-window.md). By injecting only the most relevant information for the current task, it keeps the context lean and efficient [Source 1].

## How It Works in YAAF
The Memory Relevance process is orchestrated by the `MemoryRelevanceEngine` class. The design follows a multi-step approach to identify and load relevant information [Source 1]:

1.  **Index Loading**: A central index file, `MEMORY.md`, is always loaded into the [System Prompt](./system-prompt.md) to provide a high-level overview of available memories.
2.  **Header Scanning**: The engine scans the headers (specifically, the name and description from the [Frontmatter](./frontmatter.md)) of all available memory files. This avoids loading the full content of every memory.
3.  **LLM-based Selection**: A fast, inexpensive LLM is invoked to analyze the user's query against the scanned memory headers. This model is tasked with selecting a small number of relevant memories (typically five or fewer).
4.  **Context Injection**: The full content of only the selected memories is injected as attachments into the context for the current turn.

This selection step introduces a minor performance trade-off, adding approximately 200ms of latency and a cost of 1-2 cents per query, in exchange for significantly more efficient context utilization [Source 1].

To remain provider-agnostic, the framework does not implement the [LLM Call](./llm-call.md) directly. Instead, it defines a `RelevanceQueryFn` function signature. Developers inject their own LLM adapter that conforms to this signature [when](../apis/when.md) instantiating the `MemoryRelevanceEngine`, allowing them to use any model provider for the relevance check [Source 1].

## Configuration
A developer configures the Memory Relevance mechanism by instantiating the `MemoryRelevanceEngine` and providing a concrete implementation for the `RelevanceQueryFn`. This function encapsulates the logic for calling a specific LLM endpoint [Source 1].

The following example demonstrates how to configure the engine using a hypothetical `callSonnet` function to perform the relevance check:

```typescript
const engine = new MemoryRelevanceEngine(async ({ system, userMessage, maxTokens }) => {
  const response = await callSonnet({ 
    system, 
    messages: [{ role: 'user', content: userMessage }], 
    maxTokens 
  });
  return response.text;
});

const allHeaders = [/* ... array of MemoryHeader objects ... */];
const signal = new AbortController().signal;

const memories = await engine.findRelevant(
  'How do I configure the build system?',
  allHeaders,
  signal,
);
```

## Sources
[Source 1]: src/memory/relevance.ts