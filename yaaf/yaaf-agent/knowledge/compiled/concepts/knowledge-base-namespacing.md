---
summary: The system in YAAF's Federated Knowledge Base that prefixes document IDs and search results with their source Knowledge Base identifier to prevent collisions and provide attribution.
title: Knowledge Base Namespacing
entity_type: concept
related_subsystems:
 - knowledge
see_also:
 - "[docId](./doc-id.md)"
search_terms:
 - federated knowledge base
 - multiple knowledge bases
 - combine KBs
 - document ID collision
 - namespaced docId
 - how to merge knowledge bases
 - source attribution for documents
 - unified search across KBs
 - qualified document ID
 - preventing ID conflicts in KB
 - cross-KB search
 - merged index
stub: false
compiled_at: 2026-04-25T00:20:23.679Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/federation.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Knowledge Base Namespacing is a mechanism within YAAF's `FederatedKnowledgeBase` that assigns a unique prefix to all documents originating from a specific `KnowledgeBase` instance. This system solves two primary problems that arise when combining multiple knowledge sources:

1.  **ID Collisions**: Different knowledge bases might contain documents with the same identifier (e.g., `concepts/overview`). Namespacing prevents these conflicts by creating a globally unique ID.
2.  **Attribution**: It provides a clear and consistent way to identify the source of any piece of information, which is crucial for grounding, debugging, and providing citations in agent responses.

By enforcing namespacing, YAAF allows an agent to interact with a unified, merged index of information from disparate sources as if it were a single, coherent knowledge base [Source 1].

## How It Works in YAAF

The `FederatedKnowledgeBase` class is responsible for implementing namespacing. When multiple `KnowledgeBase` instances are combined, each is assigned a namespace, which is typically the key used when configuring the federation [Source 1].

This namespace is then used as a prefix for the document's original [docId](./doc-id.md), separated by a colon, to create a `qualifiedId`. For example, a document with the [docId](./doc-id.md) `concepts/attention` from a knowledge base registered with the namespace `ml` would have the `qualifiedId` `ml:concepts/attention` [Source 1].

This namespacing is applied consistently across all relevant data structures within the federated system:

*   **`NamespacedDocument`**: A compiled document that includes `namespace` and `qualifiedId` properties.
*   **`NamespacedSearchResult`**: A search result object that is tagged with the `namespace` and `qualifiedId` of the source document.
*   **`NamespacedIndexEntry`**: An entry in the federated index that contains the `namespace` and `qualifiedId`.

When an agent uses tools provided by the `FederatedKnowledgeBase`, such as `search_kb`, it queries across all member knowledge bases simultaneously. The results are returned with their respective namespaces, allowing the agent to see the origin of each piece of information. Conversely, when fetching a specific document via a tool like `fetch_kb_document`, the agent must provide the full, namespaced `qualifiedId` [Source 1].

## Configuration

Namespacing is configured during the instantiation of a `FederatedKnowledgeBase`. The keys of the configuration object provided to the `FederatedKnowledgeBase.from()` method become the namespaces for the corresponding `KnowledgeBase` instances [Source 1].

```typescript
import { KnowledgeBase, FederatedKnowledgeBase } from 'yaaf/knowledge';

// Load two separate KnowledgeBase instances
const ml = await KnowledgeBase.load('./kb-ml');
const tools = await KnowledgeBase.load('./kb-tools');

// Create a federated KB. 'ml' and 'tools' become the namespaces.
const federated = FederatedKnowledgeBase.from({
  ml,
  tools,
});

// A document with docId 'intro' from the 'ml' KB will now have the
// qualifiedId 'ml:intro'.
```

The configuration can also be an object of type `FederatedKBEntry`, which allows for setting additional namespace-specific properties like a human-readable `label` or a `trustWeight` to influence search result scoring [Source 1].

## See Also

*   [docId](./doc-id.md)

## Sources

[Source 1]: src/knowledge/store/federation.ts