---
summary: Provides the runtime interface for loading, accessing, and searching compiled Knowledge Base documents.
export_name: KBStore
source_file: src/knowledge/store/store.ts
category: class
title: KBStore
entity_type: api
search_terms:
 - knowledge base access
 - search KB articles
 - load compiled documents
 - runtime KB interface
 - filesystem knowledge store
 - document metadata
 - lazy loading documents
 - KB memory optimization
 - how to query knowledge base
 - find document by ID
 - keyword search in docs
 - KBStore vs KBCompiler
stub: false
compiled_at: 2026-04-24T17:16:46.843Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `KBStore` class provides read-only, runtime access to a compiled Knowledge Base (KB) stored on the filesystem [Source 1]. It is responsible for loading compiled documents, building a search index, and enabling keyword searches over the KB's content [Source 1]. This class is the runtime counterpart to the compile-time `KBCompiler` [Source 1].

A key feature of `KBStore` is its [Memory](../concepts/memory.md)-efficient design. During the initial load process, it only parses and holds the [Frontmatter](../concepts/frontmatter.md) metadata for each document in memory. This includes fields like title, [Entity Type](../concepts/entity-type.md), word count, and token estimates. The full bodies of the documents are read once to populate the search adapter's index and then released. [when](./when.md) a specific document is requested via a method like `getDocument()`, its body is loaded from disk and cached in an LRU cache (default size: 200 entries). This lazy-loading strategy significantly reduces the steady-state memory footprint. For a knowledge base with 1,000 articles, this can reduce memory usage from approximately 16MB to 2MB [Source 1].

## Signature / Constructor

The source material provides the class declaration but does not include the constructor signature [Source 1].

```typescript
export class KBStore { /* ... */ }
```

### Associated Data Types

The `KBStore` class operates on several key data structures for representing documents, metadata, and search results [Source 1].

**`DocumentMeta`**
Lightweight metadata held in memory for every document, excluding the full body to conserve memory.

```typescript
export type DocumentMeta = {
  docId: string;
  title: string;
  entityType: string;
  isStub: boolean;
  wordCount: number;
  tokenEstimate: number;
  frontmatter: Record<string, unknown>;
  /** First sentence of the body — stored for index summaries */
  summary: string;
};
```

**`CompiledDocument`**
The full representation of a document, including its body text.

```typescript
export type CompiledDocument = {
  /** Unique document identifier (e.g. "concepts/attention-mechanism") */
  docId: string;
  /** Canonical article title */
  title: string;
  /** Entity type from ontology */
  entityType: string;
  /** Full markdown body (without frontmatter) */
  body: string;
  /** Whether this is a stub article */
  isStub: boolean;
  /** Word count of the body */
  wordCount: number;
  /** Estimated token count */
  tokenEstimate: number;
  /** Raw frontmatter key-value pairs */
  frontmatter: Record<string, unknown>;
};
```

**`KBIndex`**
Represents the top-level index of the entire Knowledge Base.

```typescript
export type KBIndex = {
  /** Domain description from ontology */
  domain?: string;
  /** Total number of documents */
  totalDocuments: number;
  /** Total estimated tokens across all documents */
  totalTokenEstimate: number;
  /** Index entries grouped by entity type */
  entries: KBIndexEntry[];
};
```

**`KBIndexEntry`**
A single entry within the `KBIndex`.

```typescript
export type KBIndexEntry = {
  docId: string;
  title: string;
  entityType: string;
  isStub: boolean;
  /** One-line summary (first sentence of body) */
  summary: string;
};
```

**`SearchResult`**
The structure of a single result returned from a search query.

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
  /** Raw frontmatter — used for staleness checks at query time (1.1) */
  frontmatter: Record<string, unknown>;
};
```

## Methods & Properties

The provided source material is a signature-only extract and does not detail the public methods or properties of the `KBStore` class [Source 1]. Based on the overview, the class includes functionality for loading the KB (e.g., a `load()` method) and retrieving individual documents (e.g., a `getDocument()` method) [Source 1].

## Examples

No code examples are available in the source material [Source 1].

## See Also

*   `KBCompiler`: The compile-time utility that prepares the knowledge base for use by `KBStore`.
*   `KBSearchAdapter`: The plugin interface for implementing different search strategies within the `KBStore`.

## Sources

[Source 1] src/knowledge/store/store.ts