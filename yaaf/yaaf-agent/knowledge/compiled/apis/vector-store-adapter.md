---
title: VectorStoreAdapter
entity_type: api
summary: An interface defining the contract for vector store plugins, enabling semantic memory retrieval.
export_name: VectorStoreAdapter
source_file: src/memory/vectorMemory.ts
category: interface
search_terms:
 - semantic memory
 - vector database plugin
 - how to add a vector store
 - vector search interface
 - ChromaDB plugin
 - Qdrant plugin
 - Pgvector plugin
 - similarity search API
 - document retrieval
 - upsert vector
 - search vectors
 - vector store contract
 - pluggable memory
stub: false
compiled_at: 2026-04-24T17:47:44.144Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `VectorStoreAdapter` is a TypeScript interface that defines the standard contract for vector store plugins within the YAAF framework [Source 1]. Its primary purpose is to enable pluggable, semantic [Memory](../concepts/memory.md) retrieval for agents. Any class that implements this interface can serve as a vector database for storing and searching document embeddings based on semantic similarity [Source 1].

This adapter-based approach allows developers to switch between different vector store implementations without changing their agent's core logic. YAAF provides a default, in-process implementation called `VectorMemoryPlugin`, which is suitable for smaller-scale applications. For production use or larger datasets, developers can use or create plugins for external vector databases like Chroma, Qdrant, or pgvector by implementing the `VectorStoreAdapter` interface [Source 1].

## Signature

The `VectorStoreAdapter` interface is defined as follows, along with its associated `VectorSearchResult` type [Source 1]:

```typescript
export type VectorSearchResult = {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export interface VectorStoreAdapter {
  readonly capability: "vectorstore";
  upsert(id: string, text: string, metadata?: Record<string, unknown>): Promise<void>;
  search(
    query: string,
    topK: number,
    filter?: Record<string, unknown>,
  ): Promise<VectorSearchResult[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
  size(): number;
}
```

## Methods & Properties

### Properties

#### `capability`
- **Signature**: `readonly capability: "vectorstore";`
- **Description**: A read-only property that identifies the plugin's function. For all vector store plugins, this must be the string literal `"vectorstore"` [Source 1].

### Methods

#### `upsert()`
- **Signature**: `upsert(id: string, text: string, metadata?: Record<string, unknown>): Promise<void>`
- **Description**: Adds a new document or updates an existing one in the vector store. The `text` is converted into a vector for semantic search [Source 1].
- **Parameters**:
    - `id`: A unique string identifier for the document.
    - `text`: The string content of the document to be stored and indexed.
    - `metadata` (optional): An object containing arbitrary data to associate with the document.

#### `search()`
- **Signature**: `search(query: string, topK: number, filter?: Record<string, unknown>): Promise<VectorSearchResult[]>`
- **Description**: Performs a semantic similarity search against the documents in the store and returns the top `k` most relevant results [Source 1].
- **Parameters**:
    - `query`: The search text to compare against the stored documents.
    - `topK`: The maximum number of results to return.
    - `filter` (optional): An object used to filter results based on their metadata. The exact filtering capabilities depend on the specific plugin implementation.
- **Returns**: A `Promise` that resolves to an array of `VectorSearchResult` objects, each containing the document's `id`, a similarity `score`, and optional `metadata`.

#### `delete()`
- **Signature**: `delete(id: string): Promise<void>`
- **Description**: Removes a document from the vector store by its unique identifier [Source 1].
- **Parameters**:
    - `id`: The unique identifier of the document to delete.

#### `clear()`
- **Signature**: `clear(): Promise<void>`
- **Description**: Deletes all documents from the vector store, effectively emptying it [Source 1].

#### `size()`
- **Signature**: `size(): number`
- **Description**: Returns the total number of documents currently stored in the vector store [Source 1].

## Examples

### Implementing a Custom Vector Store Plugin

The following example shows the basic structure of a custom plugin that implements the `VectorStoreAdapter` interface to connect to a hypothetical external vector database.

```typescript
import { PluginBase } from 'yaaf';
import { VectorStoreAdapter, VectorSearchResult } from 'yaaf';

// A hypothetical plugin for an external vector database service
class MyExternalVectorDBPlugin extends PluginBase implements VectorStoreAdapter {
  readonly capability = "vectorstore" as const;

  // A placeholder for the external DB client
  private dbClient: any;

  constructor() {
    super();
    // this.dbClient = new ExternalDBClient(...);
  }

  async upsert(id: string, text: string, metadata?: Record<string, unknown>): Promise<void> {
    console.log(`Upserting document ${id} to external DB.`);
    // await this.dbClient.upsert({ id, text, metadata });
  }

  async search(query: string, topK: number, filter?: Record<string, unknown>): Promise<VectorSearchResult[]> {
    console.log(`Searching for "${query}" with topK=${topK}.`);
    // const results = await this.dbClient.search({ query, topK, filter });
    // return results;
    return [
      { id: 'doc1', score: 0.98, metadata: { source: 'file.txt' } }
    ];
  }

  async delete(id: string): Promise<void> {
    console.log(`Deleting document ${id} from external DB.`);
    // await this.dbClient.delete(id);
  }

  async clear(): Promise<void> {
    console.log('Clearing all documents in external DB.');
    // await this.dbClient.clear();
  }

  size(): number {
    // return this.dbClient.count();
    return 1;
  }
}

// Usage with PluginHost
// const host = new PluginHost();
// await host.register(new MyExternalVectorDBPlugin());
```

## Sources

[Source 1] `src/memory/vectorMemory.ts`