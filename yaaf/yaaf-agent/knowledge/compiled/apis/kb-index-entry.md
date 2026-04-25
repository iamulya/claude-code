---
summary: Defines an entry within the Knowledge Base index, providing essential metadata for a single document.
export_name: KBIndexEntry
source_file: src/knowledge/store/store.ts
category: type
title: KBIndexEntry
entity_type: api
search_terms:
 - knowledge base index
 - document metadata
 - KB index structure
 - what is in the KB index
 - document summary
 - docId
 - entityType
 - isStub
 - KBStore index entry
 - llms.txt format
 - knowledge base manifest
 - document catalog entry
stub: false
compiled_at: 2026-04-24T17:16:27.055Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `KBIndexEntry` type defines the structure for a single record within the knowledge base index. Each entry represents one document and contains a minimal set of metadata necessary for identification and summarization.

This lightweight representation allows the system to hold information about all documents in [Memory](../concepts/memory.md) without loading their full content, which is crucial for performance and reducing memory footprint [Source 1]. An array of `KBIndexEntry` objects forms the core of the `KBIndex` type, which serves as a complete manifest of the knowledge base.

## Signature

`KBIndexEntry` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type KBIndexEntry = {
  /**
   * A unique identifier for the document.
   * Example: "concepts/attention-mechanism"
   */
  docId: string;

  /**
   * The canonical title of the article.
   */
  title: string;

  /**
   * The entity type of the document, as defined in the ontology.
   * Example: "api", "concept", "guide"
   */
  entityType: string;

  /**
   * A boolean flag indicating whether the document is a stub or placeholder.
   */
  isStub: boolean;

  /**
   * A one-line summary of the document, typically the first sentence of the body.
   */
  summary: string;
};
```

## Examples

The following example shows how `KBIndexEntry` objects are used within a `KBIndex` structure to represent the catalog of a knowledge base.

```typescript
import type { KBIndex, KBIndexEntry } from 'yaaf';

const exampleIndex: KBIndex = {
  domain: "YAAF Agent Framework",
  totalDocuments: 2,
  totalTokenEstimate: 1500,
  entries: [
    {
      docId: "api/Agent",
      title: "Agent",
      entityType: "api",
      isStub: false,
      summary: "The core class for creating and running an LLM-powered agent."
    },
    {
      docId: "concepts/Action",
      title: "Action",
      entityType: "concept",
      isStub: true,
      summary: "An action represents a tool or capability the agent can execute."
    }
  ]
};

// Accessing an individual entry
const firstEntry: KBIndexEntry = exampleIndex.entries[0];
console.log(firstEntry.title); // "Agent"
console.log(firstEntry.summary); // "The core class for creating and running an LLM-powered agent."
```

## See Also

- `KBIndex`: The top-level type for the knowledge base index, which contains an array of `KBIndexEntry` objects.
- `KBStore`: The class that loads and provides access to the knowledge base, including its index.
- `DocumentMeta`: A related type that holds slightly more in-memory metadata about a document than `KBIndexEntry`.

## Sources

[Source 1]: src/knowledge/store/store.ts