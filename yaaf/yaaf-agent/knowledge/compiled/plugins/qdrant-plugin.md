---
summary: A plugin for integrating with Qdrant, a vector similarity search engine, to provide vector storage and search capabilities.
title: QdrantPlugin
entity_type: plugin
capabilities:
 - vectorstore
built_in: false
search_terms:
 - vector database integration
 - qdrant vector store
 - semantic search with qdrant
 - how to use qdrant with yaaf
 - production vector search
 - external vector database
 - VectorStoreAdapter implementation
 - qdrant client
 - persistent vector memory
 - similarity search engine
stub: false
compiled_at: 2026-04-25T00:27:32.695Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `QdrantPlugin` is a community-provided plugin that integrates YAAF with the Qdrant vector similarity search engine. It implements the [VectorStoreAdapter](../apis/vector-store-adapter.md) interface, offering a production-grade solution for managing vector embeddings and performing semantic searches on large-scale datasets [Source 1].

This plugin serves as an alternative to the built-in [VectorMemoryPlugin](./vector-memory-plugin.md), which is designed for smaller corpora. For production environments or applications with a large number of documents, community plugins like `QdrantPlugin`, [ChromaPlugin](./chroma-plugin.md), or [PgvectorPlugin](./pgvector-plugin.md) are recommended [Source 1].

## Installation

As a community plugin, `QdrantPlugin` is not included in the core `yaaf` package and must be installed separately. The installation typically requires both the plugin package and the official Qdrant client library as a peer dependency.

```bash
# Example installation commands (package names are illustrative)
npm install @yaaf/qdrant-plugin @qdrant/js-client-rest
```

Once installed, the plugin can be imported from its package:

```typescript
import { QdrantPlugin } from '@yaaf/qdrant-plugin';
```

## Configuration

The plugin is configured by passing connection details for the Qdrant instance to its constructor. This typically includes the server URL and any necessary authentication credentials.

The following is a representative example of how the plugin might be configured. The exact constructor options are not specified in the available source material.

```typescript
import { PluginHost } from 'yaaf';
import { QdrantPlugin } from '@yaaf/qdrant-plugin';

// Configuration for the Qdrant client
const qdrantConfig = {
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY, // optional
};

const host = new PluginHost();

// Register the plugin with the host
await host.register(new QdrantPlugin({
  clientConfig: qdrantConfig,
  collectionName: 'yaaf-agent-memory',
}));

// The agent's memory retrieval now uses Qdrant for semantic search.
```

## Capabilities

`QdrantPlugin` implements the `vectorstore` capability.

### vectorstore

By implementing the [VectorStoreAdapter](../apis/vector-store-adapter.md) interface, the plugin provides the agent with long-term semantic memory backed by a Qdrant database. This enables the agent to perform the following operations against an external vector store [Source 1]:

*   **`upsert(id, text, metadata)`**: Creates or updates a vector embedding for a given text and stores it in the configured Qdrant collection.
*   **`search(query, topK, filter)`**: Searches the Qdrant collection for the `topK` most semantically similar documents to the query text.
*   **`delete(id)`**: Removes a document and its corresponding vector from the collection.
*   **`clear()`**: Deletes all entries from the collection.
*   **`size()`**: Returns the total number of vectors in the collection.

## Sources

[Source 1]: src/memory/vectorMemory.ts