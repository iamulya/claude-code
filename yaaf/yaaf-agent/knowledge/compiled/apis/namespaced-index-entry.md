---
summary: An extension of KBIndexEntry that includes namespace and qualified ID information for index entries within a FederatedKnowledgeBase.
export_name: NamespacedIndexEntry
source_file: src/knowledge/store/federation.ts
category: type
title: NamespacedIndexEntry
entity_type: api
search_terms:
 - federated knowledge base index
 - multi-KB search entry
 - knowledge base namespace
 - qualified document ID
 - what is a namespaced index entry
 - combining multiple knowledge bases
 - federated search result type
 - KB federation index structure
 - FederatedKnowledgeBase index
 - KBIndexEntry with namespace
 - cross-KB document identifier
 - unique document id across KBs
stub: false
compiled_at: 2026-04-25T00:10:03.508Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/federation.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`NamespacedIndexEntry` is a TypeScript type that represents an entry in the combined index of a `FederatedKnowledgeBase`. It extends the base [KBIndexEntry](./kb-index-entry.md) type by adding properties to identify which source [Knowledge Base](../subsystems/knowledge-base.md) the entry belongs to [Source 1].

This type is essential for managing documents from multiple knowledge bases, as it provides a mechanism to disambiguate entries that might have the same `docId` but originate from different sources. The `namespace` and `qualifiedId` properties ensure that every document in the federated index has a unique, addressable identifier [Source 1].

## Signature

`NamespacedIndexEntry` is an intersection type that combines all properties of [KBIndexEntry](./kb-index-entry.md) with two additional fields for federation [Source 1].

```typescript
import type { KBIndexEntry } from './store.js';

export type NamespacedIndexEntry = KBIndexEntry & {
  /** Namespace this entry belongs to */
  namespace: string;
  /** Fully qualified docId: `namespace:docId` */
  qualifiedId: string;
};
```

### Properties

- **`namespace: string`**: The identifier for the source [Knowledge Base](../subsystems/knowledge-base.md) from which this index entry originates. This corresponds to the key provided in the `FederatedKBConfig` [Source 1].
- **`qualifiedId: string`**: A globally unique identifier for the document within the federation, constructed by prefixing the original `docId` with its `namespace` (e.g., `ml:concepts/attention`) [Source 1].

All properties from [KBIndexEntry](./kb-index-entry.md) are also present, such as `docId`, `title`, `tokenEstimate`, and `tags`.

## Examples

Below is an example of what a `NamespacedIndexEntry` object might look like within the `entries` array of a `FederatedIndex`.

```typescript
// A sample FederatedIndex structure containing NamespacedIndexEntry objects

const federatedIndex = {
  totalDocuments: 150,
  totalTokenEstimate: 75000,
  entries: [
    {
      // Properties from KBIndexEntry
      docId: 'concepts/attention',
      title: 'Attention Mechanism',
      tokenEstimate: 500,
      tags: ['transformer', 'neural-network'],
      
      // Properties added by NamespacedIndexEntry
      namespace: 'ml',
      qualifiedId: 'ml:concepts/attention'
    },
    {
      // Properties from KBIndexEntry
      docId: 'api/agent',
      title: 'Agent Class',
      tokenEstimate: 350,
      tags: ['core', 'api'],

      // Properties added by NamespacedIndexEntry
      namespace: 'yaaf-docs',
      qualifiedId: 'yaaf-docs:api/agent'
    }
  ],
  // ... other FederatedIndex properties
};

const firstEntry: NamespacedIndexEntry = federatedIndex.entries[0];

console.log(firstEntry.namespace);     // "ml"
console.log(firstEntry.qualifiedId); // "ml:concepts/attention"
console.log(firstEntry.title);       // "Attention Mechanism"
```

## See Also

- `FederatedKnowledgeBase`: The class that uses this type to manage a collection of knowledge bases.
- `FederatedIndex`: The type definition for the combined index of a `FederatedKnowledgeBase`, which contains an array of `NamespacedIndexEntry` objects.
- [KBIndexEntry](./kb-index-entry.md): The base type that `NamespacedIndexEntry` extends.
- `NamespacedDocument`: A related type for compiled documents that includes namespace information.
- `NamespacedSearchResult`: A related type for search results that includes namespace information.
- [Knowledge Base](../subsystems/knowledge-base.md): The core subsystem for storing and retrieving information.

## Sources

- [Source 1]: `src/knowledge/store/federation.ts`
- [Source 2]: `src/knowledge/store/index.ts`