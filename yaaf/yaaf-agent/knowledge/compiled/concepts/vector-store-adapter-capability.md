---
title: Vector Store Adapter Capability
entity_type: concept
summary: A plugin capability that allows agents to integrate with various vector databases for semantic memory and retrieval.
related_subsystems:
 - plugin_system
 - memory_system
search_terms:
 - semantic memory
 - vector database integration
 - RAG in YAAF
 - retrieval augmented generation
 - how to connect to ChromaDB
 - how to connect to Qdrant
 - how to connect to pgvector
 - pluggable memory backend
 - semantic search plugin
 - VectorStoreAdapter interface
 - TF-IDF memory
 - cosine similarity search
stub: false
compiled_at: 2026-04-24T18:05:01.169Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

The Vector Store Adapter is a plugin capability in YAAF that defines a standardized interface for interacting with vector databases. This abstraction allows agents to perform semantic search and retrieval for [Memory](./memory.md) operations, decoupling the agent's logic from the specific vector store implementation [Source 1].

The primary problem this capability solves is enabling pluggable, production-grade [Semantic Memory](./semantic-memory.md). While YAAF includes a basic in-memory vector store, real-world applications often require more scalable and persistent solutions. By defining a common interface, YAAF allows developers to easily swap the default implementation with external, high-performance vector databases like Chroma, Qdrant, or pgvector without altering the core agent code [Source 1].

## How It Works in YAAF

A plugin provides this capability by implementing the `VectorStoreAdapter` interface and declaring its `capability` property as `"vectorstore"` [Source 1]. The YAAF runtime, specifically the `PluginHost`, can then discover and utilize this plugin for all semantic memory retrieval tasks.

The `VectorStoreAdapter` interface defines the following core methods [Source 1]:

*   `upsert(id: string, text: string, metadata?: Record<string, unknown>): Promise<void>`: Adds or updates a text document in the vector store, associating it with a unique ID and optional metadata.
*   `search(query: string, topK: number, filter?: Record<string, unknown>): Promise<VectorSearchResult[]>`: Searches the store for the `topK` most semantically similar documents to a given query string, with an option to filter results. It returns an array of results containing the document ID, a similarity score, and any associated metadata.
*   `delete(id: string): Promise<void>`: Removes a document from the store by its ID.
*   `clear(): Promise<void>`: Deletes all documents from the store.
*   `size(): number`: Returns the total number of documents in the store.

YAAF provides a default, built-in implementation of this capability called `VectorMemoryPlugin`. This plugin uses an in-process [TF-IDF](./tf-idf.md) (Term Frequency-Inverse Document Frequency) vectorization model with [Cosine Similarity](./cosine-similarity.md) for its search function. It is suitable for smaller applications with up to approximately 10,000 documents and requires no external dependencies. For larger-scale use, it is recommended to replace this with a dedicated vector database plugin [Source 1].

## Configuration

A developer enables a vector store by registering a plugin that implements the `VectorStoreAdapter` capability with the `PluginHost`. The following example shows how to register the default in-memory `VectorMemoryPlugin` [Source 1].

```typescript
import { PluginHost } from 'yaaf'
import { VectorMemoryPlugin } from 'yaaf/memory'

const host = new PluginHost()
await host.register(new VectorMemoryPlugin())

// Memory retrieval within the host's context now uses
// the registered vector store for semantic similarity searches.
```

To use a different vector database, a developer would replace `VectorMemoryPlugin` with another plugin that conforms to the same interface, such as `ChromaPlugin` or `QdrantPlugin` [Source 1].

## Sources

[Source 1]: src/memory/vectorMemory.ts