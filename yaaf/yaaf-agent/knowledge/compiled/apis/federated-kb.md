---
title: FederatedKB
entity_type: api
summary: A specialized knowledge base implementation that aggregates and namespaces multiple underlying knowledge bases.
export_name: FederatedKB
source_file: src/knowledge/store/index.ts
category: class
stub: false
compiled_at: 2026-04-16T14:28:01.522Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/index.ts
confidence: 0.9
---

## Overview
The `FederatedKB` class is a specialized knowledge base implementation designed to aggregate multiple independent knowledge bases into a single, unified interface. It allows for querying across multiple sources simultaneously while maintaining data isolation through namespacing. This is particularly useful in production environments where an agent needs to access disparate information sources (e.g., internal documentation, public wikis, and technical manuals) without merging them into a single physical index.

By using namespacing, `FederatedKB` ensures that documents and search results are tagged with their source of origin, preventing ID collisions and allowing the agent to attribute information to specific knowledge domains.

## Signature / Constructor
The `FederatedKB` is initialized using configuration objects that define the underlying knowledge bases and their respective namespaces.

### Configuration Types
The following types define the structure of the federation:

*   **`FederatedKBOptions`**: The primary configuration object for the class.
*   **`FederatedKBConfig`**: Defines the internal structure and behavior of the federated store.
*   **`FederatedKBEntry`**: Represents an individual knowledge base entry within the federation, typically mapping a unique namespace string to a knowledge base instance.

## Methods & Properties
While the specific implementation details are encapsulated, the API surface interacts with the following namespaced data structures:

*   **`FederatedIndex`**: An aggregated index representing the combined contents of all registered knowledge bases.
*   **`NamespacedDocument`**: A document retrieved from the federation that includes metadata identifying its source namespace.
*   **`NamespacedIndexEntry`**: An entry in the federated index that maintains a reference to its originating knowledge base.
*   **`NamespacedSearchResult`**: A search result object that includes the standard search metadata (such as relevance scores) along with the namespace of the source knowledge base.

## Examples

### Initializing a Federated Knowledge Base
This example demonstrates how to configure a `FederatedKB` to aggregate two separate knowledge sources.

```typescript
import { FederatedKB } from 'yaaf/knowledge';

// Assume documentationKB and wikiKB are already initialized instances
const federatedStore = new FederatedKB({
  entries: [
    {
      namespace: 'official-docs',
      kb: documentationKB
    },
    {
      namespace: 'community-wiki',
      kb: wikiKB
    }
  ]
});
```

### Handling Namespaced Results
When querying a `FederatedKB`, the results are returned as `NamespacedSearchResult` objects, allowing the application to identify the source of each piece of information.

```typescript
// Conceptual search usage
const results = await federatedStore.search("How to configure plugins?");

results.forEach(result => {
  console.log(`Source: ${result.namespace}`);
  console.log(`Content: ${result.document.content}`);
});
```

## See Also
* `KnowledgeBaseOptions`
* `SearchResult`