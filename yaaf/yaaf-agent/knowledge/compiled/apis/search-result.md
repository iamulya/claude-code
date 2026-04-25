---
summary: Represents a single result from a Knowledge Base search query, including relevance score and excerpt.
export_name: SearchResult
source_file: src/knowledge/store/store.ts
category: type
title: SearchResult
entity_type: api
search_terms:
 - knowledge base search result
 - KB query result
 - document relevance score
 - search excerpt
 - find documents in KB
 - how to interpret search results
 - KBSearchResult type
 - search result object structure
 - document metadata from search
 - querying the knowledge store
 - search result score
 - matching text snippet
stub: false
compiled_at: 2026-04-24T17:35:56.212Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `SearchResult` type defines the structure of a single item returned from a search query against a YAAF Knowledge Base (KB). It encapsulates not only the identity of the matched document but also metadata specific to the search context, such as a relevance score and a matching text excerpt.

This type is used by `KBSearchAdapter` plugins to return a standardized list of results to the `KBStore`, which then passes them to the consumer. Each `SearchResult` object provides a concise summary of a matched document, allowing applications to display ranked results with relevant context without needing to load the full document body immediately.

The inclusion of the document's `Frontmatter` allows for advanced use cases, such as performing staleness checks at query time [Source 1].

## Signature

`SearchResult` is a TypeScript type alias.

```typescript
export type SearchResult = {
  docId: string;
  title: string;
  entityType: string;
  isStub: boolean;
  /** Relevance score (0-1) */
  score: number;
  /** Matching excerpt */
  excerpt: string;
  /** Raw Frontmatter — used for staleness checks at query time (1.1) */
  [[Frontmatter]]: Record<string, unknown>;
};
```
[Source 1]

### Fields

| Field        | Type                     | Description                                                                                             |
|--------------|--------------------------|---------------------------------------------------------------------------------------------------------|
| `docId`      | `string`                 | The unique identifier for the document (e.g., "concepts/attention-mechanism").                          |
| `title`      | `string`                 | The canonical title of the article.                                                                     |
| `entityType` | `string`                 | The [Entity Type](../concepts/entity-type.md) of the document as defined in the [Ontology](../concepts/ontology.md) (e.g., "api", "concept").                    |
| `isStub`     | `boolean`                | A flag indicating if the document is a stub or placeholder article.                                     |
| `score`      | `number`                 | A numerical score between 0 and 1 indicating the relevance of the result to the search query.           |
| `excerpt`    | `string`                 | A snippet of text from the document body that is most relevant to the search query.                     |
| `[[Frontmatter]]`| `Record<string, unknown>`| The raw, parsed key-value pairs from the document's YAML [Frontmatter](../concepts/frontmatter.md).                                   |

## Examples

The following example demonstrates the typical structure of an array of `SearchResult` objects as returned by a search method.

```typescript
import { KBStore } from 'yaaf';
import type { SearchResult } from 'yaaf';

// Assume kbStore is an initialized instance of KBStore
async function findRelevantDocuments(kbStore: KBStore, query: string): Promise<void> {
  const results: SearchResult[] = await kbStore.search(query, { topK: 2 });

  console.log(`Found ${results.length} results for "${query}":`);

  for (const result of results) {
    console.log(`
      - Doc ID: ${result.docId}
      - Title: "${result.title}"
      - Score: ${result.score.toFixed(2)}
      - Excerpt: "${result.excerpt}..."
    `);
  }
}

/*
Example Output:

Found 2 results for "agent memory":

  - Doc ID: concepts/short-term-memory
  - Title: "Short-Term Memory"
  - Score: 0.87
  - Excerpt: "The agent memory model includes a short-term buffer for recent interactions..."

  - Doc ID: guides/configuring-memory
  - Title: "Guide: Configuring Agent Memory"
  - Score: 0.65
  - Excerpt: "To configure the agent memory, you can specify the buffer size..."
*/
```

## See Also

*   `KBStore`: The class that provides the search functionality and returns `SearchResult` objects.
*   `KBSearchAdapter`: The plugin interface that search implementations (like [TF-IDF](../concepts/tf-idf.md)) must adhere to, which defines the contract for returning `SearchResult` arrays.

## Sources

[Source 1]: src/knowledge/store/store.ts