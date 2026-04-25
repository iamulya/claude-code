---
title: VectorSearchResult
entity_type: api
summary: A type representing the structure of a search result from a vector store, including ID, score, and optional metadata.
export_name: VectorSearchResult
source_file: src/memory/vectorMemory.ts
category: type
search_terms:
 - vector search result format
 - vector store query response
 - semantic search result type
 - what does vector search return
 - vector memory output
 - VectorStoreAdapter search result
 - document similarity score
 - retrieved document metadata
 - vector database result object
 - search result id and score
 - topK search results
stub: false
compiled_at: 2026-04-24T17:47:30.652Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/vectorMemory.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`VectorSearchResult` is a TypeScript type alias that defines the standard structure for a single item returned from a vector store search operation [Source 1]. It is a core part of the `[[[[[[[[VectorStoreAdapter]]]]]]]]` interface, ensuring that all vector store implementations, whether the built-in `Vector[[[[[[[[[[Memory]]]]]]]]Plugin]]` or third-party plugins, return search results in a consistent and predictable format.

Each `VectorSearchResult` object contains the unique identifier of the retrieved document, a numerical score indicating its relevance to the query, and an optional metadata object [Source 1].

## Signature

The `VectorSearchResult` type is defined as an object with the following properties [Source 1]:

```typescript
export type VectorSearchResult = {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
};
```

### Properties

-   **`id: string`**
    The unique identifier of the document that was retrieved. This corresponds to the `id` provided [when](./when.md) the document was originally added to the vector store via the `upsert` method.

-   **`score: number`**
    A numerical value representing the similarity or relevance of the document to the search query. The meaning and range of this score depend on the specific vector store implementation (e.g., for [Cosine Similarity](../concepts/cosine-similarity.md), a higher value closer to 1.0 indicates greater similarity).

-   **`metadata?: Record<string, unknown>`**
    An optional object containing any additional data that was associated with the document when it was upserted. This can be used to store auxiliary information like document titles, sources, or timestamps.

## Examples

The following example demonstrates how to handle an array of `VectorSearchResult` objects returned from a `VectorStoreAdapter`'s `search` method.

```typescript
import { VectorStoreAdapter, VectorSearchResult } from 'yaaf';

// Assume 'vectorStore' is an initialized instance of a class
// that implements the VectorStoreAdapter interface.
async function processSearchResults(vectorStore: VectorStoreAdapter) {
  const query = "What is the YAAF agent architecture?";
  const topK = 3;

  // The search method returns a promise that resolves to an array of VectorSearchResult objects
  const results: VectorSearchResult[] = await vectorStore.search(query, topK);

  console.log(`Found ${results.length} relevant documents for "${query}":`);

  for (const result of results) {
    console.log(`- Document ID: ${result.id}`);
    console.log(`  Relevance Score: ${result.score.toFixed(4)}`);
    if (result.metadata) {
      console.log(`  Metadata: ${JSON.stringify(result.metadata)}`);
    }
  }
}
```

## See Also

-   **VectorStoreAdapter**: The interface that defines the contract for all vector store plugins. Its `search` method returns `Promise<VectorSearchResult[]>`.
-   **[VectorMemoryPlugin](../plugins/vector-memory-plugin.md)**: The default, in-Memory vector store implementation provided by YAAF, which uses and returns `VectorSearchResult` objects.

## Sources

[Source 1]: src/memory/vectorMemory.ts