---
summary: An extension of SearchResult that includes namespace and qualified ID information for search results from a FederatedKnowledgeBase.
export_name: NamespacedSearchResult
source_file: src/knowledge/store/federation.ts
category: type
title: NamespacedSearchResult
entity_type: api
search_terms:
 - federated knowledge base search
 - search across multiple KBs
 - identify search result source
 - qualified document ID
 - namespace search result
 - FederatedKnowledgeBase result type
 - what is a qualifiedId
 - how to know which KB a search result came from
 - multi-source knowledge retrieval
 - SearchResult with namespace
 - disambiguate search results
 - cross-KB search
stub: false
compiled_at: 2026-04-25T00:10:22.778Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/federation.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `NamespacedSearchResult` type is a TypeScript interface that extends the base [SearchResult](./search-result.md) type. It is used by the `FederatedKnowledgeBase` class to represent search results originating from a federation of multiple [Knowledge Base](../subsystems/knowledge-base.md) instances [Source 1].

When a search is performed across a `FederatedKnowledgeBase`, the results can come from any of the constituent knowledge bases. `NamespacedSearchResult` adds two properties, `namespace` and `qualifiedId`, to each result. This allows consumers to identify the specific source [Knowledge Base](../subsystems/knowledge-base.md) for each document and provides a globally unique identifier for the document within the federation [Source 1].

## Signature

`NamespacedSearchResult` is a TypeScript type alias that combines the properties of [SearchResult](./search-result.md) with additional fields for federation context [Source 1].

```typescript
import type { SearchResult } from './store.js';

export type NamespacedSearchResult = SearchResult & {
  /** Namespace this result belongs to */
  namespace: string;
  /** Fully qualified docId: `namespace:docId` */
  qualifiedId: string;
};
```

### Properties

*   Inherits all properties from [SearchResult](./search-result.md), such as `docId`, `title`, `score`, and `summary`.
*   **`namespace: string`**: The name of the source [Knowledge Base](../subsystems/knowledge-base.md) within the federation from which this result originated [Source 1].
*   **`qualifiedId: string`**: A globally unique identifier for the document across the entire federation, constructed by prefixing the document's original `docId` with its `namespace` (e.g., `ml:concepts/attention`) [Source 1].

## Examples

The following example demonstrates how to handle `NamespacedSearchResult` objects returned from a `FederatedKnowledgeBase` search method.

```typescript
import { FederatedKnowledgeBase, NamespacedSearchResult } from 'yaaf';
import { KnowledgeBase } from 'yaaf/knowledge';

// Assume 'federatedKb' is an initialized FederatedKnowledgeBase instance
// created from multiple KnowledgeBase instances with namespaces 'ml' and 'tools'.
// const mlKb = await KnowledgeBase.load('./kb-ml');
// const toolsKb = await KnowledgeBase.load('./kb-tools');
// const federatedKb = FederatedKnowledgeBase.from({ ml: mlKb, tools: toolsKb });

async function performFederatedSearch(query: string): Promise<void> {
  // The search method of a FederatedKnowledgeBase returns an array of NamespacedSearchResult.
  const results: NamespacedSearchResult[] = await federatedKb.search(query);

  console.log(`Search results for "${query}":`);
  for (const result of results) {
    console.log(`- Document: ${result.qualifiedId}`);
    console.log(`  - Title: ${result.title}`);
    console.log(`  - Source KB Namespace: ${result.namespace}`);
    console.log(`  - Relevance Score: ${result.score.toFixed(2)}`);
  }
}

// Example usage:
// await performFederatedSearch("attention mechanism");

/*
Example Console Output:

Search results for "attention mechanism":
- Document: ml:concepts/attention
  - Title: The Attention Mechanism in Neural Networks
  - Source KB Namespace: ml
  - Relevance Score: 0.91
- Document: tools:cli/focus-window
  - Title: How to manage window attention
  - Source KB Namespace: tools
  - Relevance Score: 0.65
*/
```

## See Also

*   `FederatedKnowledgeBase`: The class that produces and consumes `NamespacedSearchResult` objects.
*   [SearchResult](./search-result.md): The base type that `NamespacedSearchResult` extends.
*   [Knowledge Base](../subsystems/knowledge-base.md): The core subsystem for storing and retrieving information.

## Sources

*   [Source 1] `src/knowledge/store/federation.ts`
*   [Source 2] `src/knowledge/store/index.ts`