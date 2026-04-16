---
title: KBStore
entity_type: api
summary: A filesystem-backed store for reading compiled Knowledge Base articles and performing keyword searches.
export_name: KBStore
source_file: src/knowledge/store/store.ts
category: class
stub: false
compiled_at: 2026-04-16T14:29:23.201Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/store.ts
confidence: 0.98
---

## Overview
`KBStore` provides read-only access to a Knowledge Base (KB) that has been processed into a compiled format. It serves as the runtime counterpart to the `KBCompiler`, allowing applications and agents to retrieve markdown documents, metadata, and token estimates from the filesystem.

The store is designed to support:
- Retrieval of individual compiled documents by their unique identifiers.
- Generation of a `KBIndex`, similar in structure to `llms.txt`, for automated discovery.
- Keyword-based searching across the KB with relevance scoring.
- Access to the underlying ontology and concept registry.

## Signature / Constructor

```typescript
export class KBStore {
  // Implementation details are filesystem-backed
}
```

### Supporting Types

#### CompiledDocument
The primary data structure returned when retrieving an article.
```typescript
export type CompiledDocument = {
  docId: string;           // Unique identifier (e.g. "concepts/attention-mechanism")
  title: string;           // Canonical article title
  entityType: string;      // Entity type from ontology
  body: string;            // Full markdown body (without frontmatter)
  isStub: boolean;         // Whether this is a stub article
  wordCount: number;       // Word count of the body
  tokenEstimate: number;   // Estimated token count
  frontmatter: Record<string, unknown>; // Raw frontmatter key-value pairs
}
```

#### KBIndex
A summary object representing the entire contents of the store.
```typescript
export type KBIndex = {
  domain?: string;              // Domain description from ontology
  totalDocuments: number;       // Total number of documents
  totalTokenEstimate: number;   // Total estimated tokens across all documents
  entries: KBIndexEntry[];      // Index entries grouped by entity type
}
```

#### SearchResult
The result of a keyword search operation.
```typescript
export type SearchResult = {
  docId: string;
  title: string;
  entityType: string;
  isStub: boolean;
  score: number;    // Relevance score (0-1)
  excerpt: string;  // Matching excerpt from the document
}
```

## Methods & Properties
Based on the provided source, `KBStore` exposes functionality to interact with the compiled KB:

- **Document Retrieval**: Reads a `CompiledDocument` from the filesystem using its `docId`.
- **Indexing**: Aggregates all documents into a `KBIndex`, providing a high-level overview of the knowledge base including token counts and summaries.
- **Search**: Performs keyword searches over the compiled documents, returning `SearchResult` objects with relevance scores and text excerpts.
- **Token Estimation**: Utilizes internal utilities to provide token counts for documents, assisting in LLM context window management.

## Examples

### Initializing and Searching the Store
```typescript
import { KBStore } from 'yaaf/knowledge';

const store = new KBStore('/path/to/compiled/kb');

// Perform a keyword search
const results = await store.search('attention mechanism');

if (results.length > 0) {
  const topResult = results[0];
  console.log(`Found: ${topResult.title} (Score: ${topResult.score})`);
  
  // Retrieve the full document
  const doc = await store.getDocument(topResult.docId);
  console.log(doc.body);
}
```

### Generating a KB Index
```typescript
const index = await store.getIndex();

console.log(`KB Domain: ${index.domain}`);
console.log(`Total Documents: ${index.totalDocuments}`);
console.log(`Total Tokens: ${index.totalTokenEstimate}`);

index.entries.forEach(entry => {
  console.log(`- [${entry.entityType}] ${entry.title}: ${entry.summary}`);
});
```

## See Also
- `KBCompiler` (The compile-time counterpart for generating the data used by `KBStore`)