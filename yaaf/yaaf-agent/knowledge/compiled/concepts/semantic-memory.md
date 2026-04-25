---
title: Semantic Memory
entity_type: concept
summary: The ability of an agent to store and retrieve information based on meaning and context, typically using vector embeddings.
related_subsystems:
 - memory
 - plugin
search_terms:
 - vector search
 - semantic search
 - information retrieval
 - long-term memory for agents
 - how to store knowledge
 - vector store adapter
 - TF-IDF memory
 - cosine similarity search
 - ChromaDB integration
 - Qdrant plugin
 - Pgvector for YAAF
 - embedding-based retrieval
 - knowledge base for agents
stub: false
compiled_at: 2026-04-24T18:01:30.799Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Semantic [Memory](./memory.md) refers to an agent's capability to store, manage, and retrieve information from a long-term knowledge base based on semantic meaning rather than exact keyword matches. This allows an agent to find relevant context or facts by understanding the intent of a query, similar to how humans recall related concepts. It serves as the agent's long-term memory, complementing the short-term memory of the [LLM](./llm.md)'s [Context Window](./context-window.md).

This capability is essential for building agents that can reason about large amounts of information, answer questions from a specific corpus of documents, or maintain knowledge over extended interactions.

## How It Works in YAAF

In YAAF, Semantic Memory is implemented through a provider-agnostic plugin interface called `VectorStoreAdapter` [Source 1]. This interface defines a standard contract for any vector storage and retrieval system, ensuring that different backends can be used interchangeably. The `VectorStoreAdapter` interface defines the `vectorstore` capability and exposes core methods for managing information [Source 1]:

*   `upsert(id, text, metadata)`: Adds or updates a piece of text in the store.
*   `search(query, topK, filter)`: Retrieves the `topK` most semantically similar documents for a given query.
*   `delete(id)`: Removes a document by its ID.
*   `clear()`: Empties the entire store.
*   `size()`: Returns the number of documents in the store.

YAAF includes a default, in-process implementation of this interface called `VectorMemoryPlugin`. This plugin uses a [TF-IDF](./tf-idf.md) (Term Frequency-Inverse Document Frequency) vectorization model with [Cosine Similarity](./cosine-similarity.md) for its search algorithm. It is designed for simplicity and has no external dependencies, making it suitable for development and small-scale applications with up to approximately 10,000 documents [Source 1].

For production use cases or larger document collections, the framework is designed for this default plugin to be replaced by more robust, external vector databases. Community-provided plugins for systems like Chroma, Qdrant, or Pgvector can be used by implementing the same `VectorStoreAdapter` interface [Source 1].

## Configuration

A developer enables semantic memory by registering a plugin that implements the `VectorStoreAdapter` capability with the `PluginHost`. The following example shows how to register the default `VectorMemoryPlugin` [Source 1].

```typescript
import { PluginHost } from 'yaaf'
import { VectorMemoryPlugin } from 'yaaf/memory'

const host = new PluginHost()
await host.register(new VectorMemoryPlugin())
// Memory retrieval now uses semantic similarity automatically
```

Once a vector store plugin is registered, other parts of the YAAF framework can automatically leverage its capabilities for semantic retrieval tasks.

## Sources

[Source 1]: src/memory/vectorMemory.ts