---
title: How to Use Vector Memory
entity_type: guide
summary: A guide on setting up and utilizing the built-in vector memory in YAAF agents for semantic information retrieval.
difficulty: beginner
search_terms:
 - semantic search in agents
 - how to add memory to agent
 - vector store for LLM
 - TF-IDF memory
 - in-process vector database
 - YAAF memory plugin
 - VectorStoreAdapter implementation
 - semantic information retrieval
 - ChromaDB alternative
 - Qdrant alternative
 - cosine similarity search
 - agent long term memory
 - upsert document into memory
 - search similar documents
stub: false
compiled_at: 2026-04-24T18:07:37.347Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

This guide demonstrates how to add semantic [Memory](../concepts/memory.md) capabilities to a YAAF agent using the built-in `VectorMemoryPlugin`. This plugin provides an in-process vector store that uses a [TF-IDF](../concepts/tf-idf.md) (Term Frequency-Inverse Document Frequency) model and [Cosine Similarity](../concepts/cosine-similarity.md) for information retrieval [Source 1].

By following this guide, you will register the `VectorMemoryPlugin` with the agent's `PluginHost`, enabling the agent to automatically perform semantic searches over a corpus of documents. This setup is suitable for development, testing, and applications with a relatively small number of documents (up to ~10,000) [Source 1].

## Prerequisites

Before you begin, you should have a YAAF project set up with an instantiated `PluginHost`. This guide assumes you are familiar with the basic concept of plugins in YAAF.

## Step-by-Step

Adding vector memory is a straightforward process of registering the provided plugin.

### 1. Import the Plugin

First, import `PluginHost` from the core YAAF package and `VectorMemoryPlugin` from the memory module.

```typescript
import { PluginHost } from 'yaaf';
import { VectorMemoryPlugin } from 'yaaf/memory';
```

### 2. Register the Plugin

Next, create an instance of `PluginHost` and register a new instance of `VectorMemoryPlugin` with it. The registration process is asynchronous, so it must be awaited [Source 1].

```typescript
// Create the central plugin host for your agent
const host = new PluginHost();

// Register the in-process vector memory plugin
await host.register(new VectorMemoryPlugin());

// The host is now equipped with the 'vectorstore' capability.
// Other parts of the YAAF framework can now use it for
// Semantic Memory retrieval automatically.
```

### 3. Understanding the Added Capability

By registering `VectorMemoryPlugin`, you have provided the `PluginHost` with the `vectorstore` capability. The plugin implements the `VectorStoreAdapter` interface, which defines the standard methods for interacting with a vector store [Source 1].

Other YAAF components that require semantic retrieval will now use this implementation automatically. The core methods provided by this interface are [Source 1]:

*   `upsert(id: string, text: string, metadata?: Record<string, unknown>): Promise<void>`: Adds or updates a document in the store.
*   `search(query: string, topK: number, filter?: Record<string, unknown>): Promise<VectorSearchResult[]>`: Searches for the `topK` most similar documents to a given query.
*   `delete(id: string): Promise<void>`: Removes a document by its ID.
*   `clear(): Promise<void>`: Deletes all documents from the store.
*   `size(): number`: Returns the total number of documents in the store.

The framework will call these methods as needed for agent memory operations.

## Common Mistakes

1.  **Using for Large-Scale Production:** The `VectorMemoryPlugin` is designed for smaller datasets (up to a default of 10,000 documents). For larger corpora or production workloads requiring high-performance semantic search, it is recommended to use a dedicated vector database plugin (e.g., for Chroma, Qdrant, or pgvector) [Source 1].
2.  **Forgetting to `await` Registration:** Plugin registration is an asynchronous operation. Forgetting the `await` keyword [when](../apis/when.md) calling `host.register()` will lead to race conditions where the agent may attempt to use the memory capability before it is fully initialized.
3.  **Misunderstanding the Search Method:** This plugin uses TF-IDF and cosine similarity, which is a classical information retrieval technique. It does not use deep learning-based embeddings like those from models such as Sentence-BERT. While effective for keyword and term-based semantic similarity, its understanding of nuanced meaning may differ from embedding-based models.

## Next Steps

After integrating basic vector memory, consider the following:

*   **Explore Production-Grade Vector Stores:** For applications with large amounts of data, investigate community or official plugins that integrate with external vector databases like Chroma, Qdrant, or PostgreSQL with the pgvector extension. These plugins implement the same `VectorStoreAdapter` interface, making them easy to swap in [Source 1].

## Sources

[Source 1] `/Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts`