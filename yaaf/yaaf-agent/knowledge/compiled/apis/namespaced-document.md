---
summary: An extension of CompiledDocument that includes namespace and qualified ID information for documents within a FederatedKnowledgeBase.
export_name: NamespacedDocument
source_file: src/knowledge/store/federation.ts
category: type
title: NamespacedDocument
entity_type: api
search_terms:
 - federated knowledge base document
 - document with namespace
 - qualified document id
 - multi-KB search result
 - how to identify document source in federation
 - combine multiple knowledge bases
 - cross-KB document retrieval
 - namespace:docId format
 - CompiledDocument with namespace
 - FederatedKB document type
 - document origin identifier
stub: false
compiled_at: 2026-04-25T00:10:02.492Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/federation.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/index.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`NamespacedDocument` is a TypeScript type that represents a document retrieved from a `FederatedKnowledgeBase` [Source 1]. It extends the base [CompiledDocument](./compiled-document.md) type by adding properties to identify the document's origin within a federation of multiple [Knowledge Bases](../subsystems/knowledge-base.md) [Source 1].

This type is essential when working with a `FederatedKnowledgeBase`, as it provides a mechanism to disambiguate documents that may have identical `docId`s across different member knowledge bases. The `namespace` property identifies which specific [Knowledge Base](../subsystems/knowledge-base.md) the document belongs to, and the `qualifiedId` provides a unique identifier across the entire federation [Source 1].

## Signature

`NamespacedDocument` is a type alias that intersects [CompiledDocument](./compiled-document.md) with two additional properties for federation [Source 1].

```typescript
import type { CompiledDocument } from 'yaaf';

export type NamespacedDocument = CompiledDocument & {
  /** Namespace this document belongs to */
  namespace: string;
  /** Fully qualified docId: `namespace:docId` */
  qualifiedId: string;
};
```

### Properties

*   **...CompiledDocument:** All properties from the [CompiledDocument](./compiled-document.md) type are included.
*   **`namespace: string`**: The name of the [Knowledge Base](../subsystems/knowledge-base.md) within the federation from which this document originates [Source 1].
*   **`qualifiedId: string`**: A globally unique identifier for the document across the entire federation, constructed by prefixing the document's original `docId` with its `namespace` (e.g., `ml:concepts/attention`) [Source 1].

## Examples

The following example demonstrates how to use the properties of a `NamespacedDocument` to display information about its origin within a federated system.

```typescript
import type { NamespacedDocument } from 'yaaf';

// This is a hypothetical function that might process a document
// fetched from a FederatedKnowledgeBase.
function displayDocumentOrigin(doc: NamespacedDocument) {
  console.log(`Document Title: ${doc.frontmatter.title}`);
  console.log(`Source Knowledge Base: ${doc.namespace}`);
  console.log(`Federated ID: ${doc.qualifiedId}`);
}

// Example usage with a sample NamespacedDocument object:
const sampleDoc: NamespacedDocument = {
  // Properties from CompiledDocument
  docId: 'concepts/attention',
  content: 'Attention is a mechanism...',
  frontmatter: { title: 'Attention Mechanism' },
  tokenCount: 42,
  // Properties added by NamespacedDocument
  namespace: 'ml',
  qualifiedId: 'ml:concepts/attention',
};

displayDocumentOrigin(sampleDoc);

/*
Expected Output:
Document Title: Attention Mechanism
Source Knowledge Base: ml
Federated ID: ml:concepts/attention
*/
```

## See Also

*   **FederatedKnowledgeBase**: The class that manages multiple [Knowledge Bases](../subsystems/knowledge-base.md) and returns `NamespacedDocument` objects.
*   [CompiledDocument](./compiled-document.md): The base type that `NamespacedDocument` extends.
*   **NamespacedSearchResult**: A related type for search results from a `FederatedKnowledgeBase`.
*   [Knowledge Base](../subsystems/knowledge-base.md): The core subsystem for storing and retrieving information.

## Sources

*   [Source 1]: `src/knowledge/store/federation.ts`
*   [Source 2]: `src/knowledge/store/index.ts`