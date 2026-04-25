---
title: Context Window Management
entity_type: concept
summary: A strategy in YAAF for dynamically selecting and injecting relevant information into the LLM's limited context to enable access to large knowledge stores.
related_subsystems:
 - Memory
search_terms:
 - how to manage LLM context
 - fitting more data into prompt
 - agent memory retrieval
 - relevant information selection
 - context stuffing
 - lean context
 - dynamic prompt construction
 - RAG in YAAF
 - MemoryRelevanceEngine
 - selecting relevant memories
 - token budget
 - avoiding context overflow
stub: false
compiled_at: 2026-04-24T17:53:57.792Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/relevance.ts
compiled_from_quality: unknown
confidence: 0.85
---

## What It Is

[Context Window](./context-window.md) Management refers to the set of strategies used to handle the finite input size (the "context window") of a Large Language Model ([LLM](./llm.md)). Since an LLM can only process a limited amount of text at once, an agent with access to a large knowledge base or long-term [Memory](./memory.md) must have a mechanism to select the most pertinent information to include in its prompt for any given task.

In YAAF, this concept is crucial for enabling agents to access extensive memory stores without exceeding token limits. The framework's approach is to keep the context "lean" by dynamically identifying and injecting only the most relevant memories for the current user query, rather than loading the entire memory store [Source 1]. This allows an agent to effectively utilize hundreds of memories while only paying the performance and token cost for a small, relevant subset [Source 1].

## How It Works in YAAF

YAAF implements context window management for memory through a component called the `MemoryRelevanceEngine` [Source 1]. This engine selects the most relevant memories from a larger store before they are passed to the main LLM for a given turn.

The process follows a distinct, multi-step design [Source 1]:

1.  **Load Index:** A central index file, `MEMORY.md`, is always loaded into the [System Prompt](./system-prompt.md) to provide the agent with a high-level overview of its available memories.
2.  **Scan Headers:** The engine scans the headers (specifically, the name and description from the [Frontmatter](./frontmatter.md)) of all available memory files. It does not load the full content of every file.
3.  **LLM-based Selection:** A fast, inexpensive LLM (such as Claude Sonnet) is used to perform a relevance check. It is given the user's query and the list of memory headers and asked to select a small number (five or fewer) of the most relevant memories.
4.  **Inject Content:** Only the full content of the memories selected in the previous step is injected as attachments into the context for the current turn.

This selection step introduces a minor overhead of approximately 200ms in latency and a cost of 1-2 cents per query, which is considered a worthwhile trade-off for the ability to access a large knowledge base [Source 1]. The `MemoryRelevanceEngine` itself is model-agnostic; it requires the developer to provide a function that handles the call to the selection LLM [Source 1].

## Configuration

A developer configures the [Context Management](../subsystems/context-management.md) behavior by instantiating the `MemoryRelevanceEngine` and providing it with a custom LLM adapter function. This function, which conforms to the `RelevanceQueryFn` type, is responsible for making the actual API call to a model that will perform the relevance selection [Source 1].

The following example demonstrates how to create an engine instance and use it to find relevant memories.

```typescript
// Example of configuring and using the MemoryRelevanceEngine

const engine = new MemoryRelevanceEngine(async ({ system, userMessage, maxTokens }) => {
  // Consumer-provided function to call a fast LLM like Sonnet
  const response = await callSonnet({
    system,
    messages: [{ role: 'user', content: userMessage }],
    maxTokens
  });
  return response.text;
});

// 'allHeaders' would be a pre-compiled list of all memory file headers
const memories = await engine.findRelevant(
  'How do I configure the build system?',
  allHeaders,
  signal,
);
```

In this example, `callSonnet` is a placeholder for the user's specific implementation that communicates with their chosen LLM provider [Source 1].

## Sources

[Source 1]: src/memory/relevance.ts