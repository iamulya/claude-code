---
title: KBIndex
entity_type: api
summary: A structured index of all compiled KB documents, including token counts and domain descriptions.
export_name: KBIndex
source_file: src/knowledge/store/store.ts
category: type
stub: false
compiled_at: 2026-04-16T14:29:09.915Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/store/store.ts
confidence: 0.98
---

## Overview
`KBIndex` is a TypeScript type representing the structured manifest of a compiled Knowledge Base. It provides high-level metadata about the entire document collection, such as the total document count and token estimates, alongside a list of individual document entries. 

This type is primarily used by the `KBStore` to provide a runtime overview of available knowledge, similar in purpose to an `llms.txt` file, allowing agents or systems to understand the scope and contents of the KB without loading every full document into memory.

## Signature
```typescript
export type KBIndex = {
  /** Domain description from ontology */
  domain?: string
  /** Total number of documents */
  totalDocuments: number
  /** Total estimated tokens across all documents */
  totalTokenEstimate: number
  /** Index entries grouped by entity type */
  entries: KBIndexEntry[]
}
```

## Properties
The `KBIndex` type contains the following properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `domain` | `string` (optional) | A description of the knowledge domain, typically sourced from the KB ontology. |
| `totalDocuments` | `number` | The total count of compiled documents present in the index. |
| `totalTokenEstimate` | `number` | The aggregate sum of estimated tokens across all documents in the KB. |
| `entries` | `KBIndexEntry[]` | An array of summary objects for every document in the KB. |

### KBIndexEntry
Each entry in the `entries` array follows the `KBIndexEntry` structure:

| Property | Type | Description |
| :--- | :--- | :--- |
| `docId` | `string` | Unique identifier for the document (e.g., "concepts/attention-mechanism"). |
| `title` | `string` | The canonical title of the article. |
| `entityType` | `string` | The category of the entity (e.g., "concept", "api", "guide"). |
| `isStub` | `boolean` | Indicates if the article is a short placeholder or a full document. |
| `summary` | `string` | A one-line summary, usually derived from the first sentence of the document body. |

## Examples
### Basic Index Structure
This example demonstrates a typical `KBIndex` object as returned by a knowledge store.

```typescript
const index: KBIndex = {
  domain: "YAAF Framework Documentation",
  totalDocuments: 2,
  totalTokenEstimate: 1540,
  entries: [
    {
      docId: "api/KBIndex",
      title: "KBIndex",
      entityType: "api",
      isStub: false,
      summary: "A structured index of all compiled KB documents."
    },
    {
      docId: "concepts/knowledge-base",
      title: "Knowledge Base",
      entityType: "concept",
      isStub: true,
      summary: "An overview of the YAAF knowledge management system."
    }
  ]
};
```

## See Also
- `KBStore`
- `CompiledDocument`