---
title: Memory System
entity_type: subsystem
summary: Provides persistent, file-based memory with a 4-type taxonomy for YAAF agents.
primary_files:
 - src/memory/memoryStore.ts
 - src/memory/relevance.ts
 - src/memory/vectorMemory.ts
exports:
 - MemoryStore
 - MemoryRelevanceEngine
 - VectorMemoryPlugin
 - VectorStoreAdapter
search_terms:
 - agent memory
 - how to store agent state
 - persistent memory for LLM agents
 - long-term memory for agents
 - memory taxonomy
 - relevance engine
 - semantic search for memory
 - TF-IDF vector store
 - VectorStoreAdapter
 - file-based memory
 - markdown memory files
 - what is MEMORY.md
 - memory retrieval
 - agent knowledge base
stub: false
compiled_at: 2026-04-24T18:16:59.292Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/memoryStore.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/relevance.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The [Memory](../concepts/memory.md) System provides YAAF agents with a persistent, long-term memory store [Source 1, 2]. Its primary purpose is to store information that is not directly derivable from the current state of a project's codebase, such as user preferences, project goals, architectural decisions, and pointers to external resources. This design prevents the memory from becoming a stale cache of the codebase, which can be inspected directly [Source 2]. The system enables agents to recall crucial context across multiple sessions, improving their performance and consistency.

## Architecture

The Memory System is composed of three main components: a file-based storage layer, a relevance-based retrieval engine, and a pluggable vector store for semantic search.

### File-Based Storage (`MemoryStore`)

The core of the system is the `MemoryStore`, which manages memories as individual markdown files with YAML [Frontmatter](../concepts/frontmatter.md). This human-readable format allows for easy inspection and editing [Source 2].

A central index file, `MEMORY.md`, serves as a lightweight table of contents. This index is loaded into every conversation context to give the agent a high-level overview of available memories [Source 2].

Each memory file contains frontmatter and a markdown body:
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
[Source 2]

### [Memory Taxonomy](../concepts/memory-taxonomy.md)

The system employs a closed, four-type taxonomy to categorize memories:

| Type        | Scope    | Description                                    |
|-------------|----------|------------------------------------------------|
| `user`      | private  | User role, goals, preferences, knowledge       |
| `feedback`  | flexible | Corrections AND confirmations of approach      |
| `project`   | team     | Ongoing work, goals, deadlines, decisions     |
| `reference` | team     | Pointers to external systems and resources   |

[Source 2]

### Retrieval Mechanisms

There are two primary mechanisms for retrieving memories:

1.  **[Relevance Engine](../concepts/relevance-engine.md) (`MemoryRelevanceEngine`)**
    This is the default retrieval strategy. It is designed to keep the [Context Window](../concepts/context-window.md) lean while providing access to a large number of memories. The process is as follows:
    1.  The `MEMORY.md` index is always loaded into the [System Prompt](../concepts/system-prompt.md).
    2.  The engine scans the headers (`name` and `description` from the frontmatter) of all memory files.
    3.  A fast, inexpensive [LLM](../concepts/llm.md) (e.g., Sonnet) is queried to select up to five memories most relevant to the current user query.
    4.  The full content of only these selected memories is injected as attachments into the current turn's context.
    This selection step typically adds around 200ms of latency [Source 3].

2.  **Vector-Based Semantic Search (`VectorMemoryPlugin`)**
    For semantic retrieval, the Memory System uses a plugin-based adapter interface called `VectorStoreAdapter`. The default implementation is `VectorMemoryPlugin`, an in-process vector store that uses [TF-IDF](../concepts/tf-idf.md) weighting and [Cosine Similarity](../concepts/cosine-similarity.md). It is suitable for corpora of up to approximately 10,000 documents and has no external dependencies. For larger-scale or production use cases, this default plugin can be replaced by community plugins for dedicated vector databases like Chroma, Qdrant, or Pgvector [Source 4].

## Integration Points

*   **Context Manager**: The Context Manager subsystem is responsible for injecting the relevant memories selected by the `MemoryRelevanceEngine` into the agent's context for the current turn [Source 3].
*   **[Plugin System](./plugin-system.md)**: The `VectorMemoryPlugin` and other vector database adapters are registered with the agent via the Plugin System. Once a `VectorStoreAdapter` is registered, memory retrieval automatically gains semantic search capabilities [Source 4].
*   **LLM Providers**: The `MemoryRelevanceEngine` is model-agnostic. It requires a consumer to inject an LLM adapter function (`RelevanceQueryFn`) to perform the relevance-ranking call, decoupling it from any specific model provider [Source 3].

## Key APIs

*   **`MemoryStore`**: The primary class for interacting with the file-based memory. Key methods include `save()`, `read()`, `scan()` (to get all memory headers), and `getIndex()` (to get the contents of `MEMORY.md`) [Source 2].
*   **`MemoryRelevanceEngine`**: The class used to find relevant memories. Its main method, `findRelevant()`, takes a user query and a list of memory headers and returns the most relevant items [Source 3].
*   **`VectorStoreAdapter`**: An interface that defines the contract for vector store plugins. It includes methods like `upsert()`, `search()`, and `delete()`. Any class implementing this interface can be used for [Semantic Memory](../concepts/semantic-memory.md) search [Source 4].
*   **`VectorMemoryPlugin`**: The default, in-process implementation of the `VectorStoreAdapter` interface [Source 4].

## Configuration

The `MemoryStore` is instantiated with configuration specifying the paths to memory directories:

```ts
const mem = new MemoryStore({
  privateDir: '/home/user/.agent/memory',
  teamDir: '/home/user/.agent/memory/team',
});
```
[Source 2]

The `MemoryRelevanceEngine` is configured by passing a `RelevanceQueryFn` to its constructor. This function wraps the call to the desired LLM for relevance ranking [Source 3].

## Extension Points

The main extension point in the Memory System is the `VectorStoreAdapter` interface. Developers can create their own plugins for different vector databases (e.g., Qdrant, Chroma, Pgvector) by implementing this interface. These plugins can then be registered with the agent's `PluginHost` to replace the default in-process TF-IDF implementation, enabling more powerful or scalable semantic search [Source 4].

## Sources

[Source 1]: src/index.ts
[Source 2]: src/memory/memoryStore.ts
[Source 3]: src/memory/relevance.ts
[Source 4]: src/memory/vectorMemory.ts