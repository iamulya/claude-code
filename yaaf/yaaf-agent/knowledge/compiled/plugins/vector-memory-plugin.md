---
title: VectorMemoryPlugin
entity_type: plugin
summary: An in-process TF-IDF cosine similarity vector store plugin for semantic memory retrieval.
capabilities:
 - vectorstore
built_in: true
search_terms:
 - in-memory vector store
 - TF-IDF search
 - cosine similarity retrieval
 - semantic memory for agents
 - how to add vector search to yaaf
 - VectorStoreAdapter implementation
 - local vector database
 - no dependency vector search
 - simple semantic search plugin
 - ChromaPlugin alternative
 - QdrantPlugin alternative
 - PgvectorPlugin alternative
 - agent memory retrieval
stub: false
compiled_at: 2026-04-24T18:09:09.357Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `Vector[[Memory]]Plugin` is a built-in, in-process vector store that provides [Semantic Memory](../concepts/semantic-memory.md) retrieval capabilities [Source 1]. It uses Term Frequency-Inverse Document Frequency ([TF-IDF](../concepts/tf-idf.md)) weighting with [Cosine Similarity](../concepts/cosine-similarity.md) to find relevant documents. This implementation has no external dependencies and is suitable for corpora of up to approximately 10,000 documents [Source 1].

This plugin implements the `VectorStoreAdapter` interface, making it a drop-in component for agents that require semantic search. For larger-scale or production applications, the documentation suggests replacing it with a more robust community plugin like `ChromaPlugin`, `QdrantPlugin`, or `PgvectorPlugin`, which implement the same adapter interface [Source 1].

## Installation

As a built-in plugin, `VectorMemoryPlugin` does not require separate installation. It can be imported directly from the `yaaf` package [Source 1].

```typescript
import { VectorMemoryPlugin } from 'yaaf/[[Memory]]';
```

There are no peer dependencies for this plugin.

## Configuration

The plugin is instantiated without any required configuration parameters and registered with a `PluginHost` [Source 1].

```typescript
import { PluginHost } from 'yaaf';
import { VectorMemoryPlugin } from 'yaaf/[[Memory]]';

const host = new PluginHost();
await host.register(new VectorMemoryPlugin());

// Memory retrieval now uses semantic similarity automatically
```

The source material does not specify any constructor parameters for advanced configuration [Source 1].

## Capabilities

`VectorMemoryPlugin` implements the `vectorstore` capability via the `VectorStoreAdapter` interface [Source 1]. This provides the host system with methods for managing and querying a collection of text documents based on semantic similarity.

The `VectorStoreAdapter` interface defines the following methods [Source 1]:

*   `upsert(id: string, text: string, metadata?: Record<string, unknown>): Promise<void>`: Adds or updates a document in the store, associating it with a unique ID and optional metadata.
*   `search(query: string, topK: number, filter?: Record<string, unknown>): Promise<VectorSearchResult[]>`: Searches the store for the `topK` most semantically similar documents to the given query string. An optional filter can be applied.
*   `delete(id: string): Promise<void>`: Removes a document from the store by its ID.
*   `clear(): Promise<void>`: Deletes all documents from the store.
*   `size(): number`: Returns the total number of documents in the store.

## Limitations

The `VectorMemoryPlugin` is designed for small to medium-sized use cases. It is suitable for up to a default maximum of 10,000 documents. For larger corpora or production-grade semantic search, it is recommended to use an external, dedicated vector database plugin [Source 1].

## Sources

[Source 1] src/[Memory](../concepts/memory.md)/vectorMemory.ts