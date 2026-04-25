---
summary: Removes an entry from the concept registry.
export_name: removeRegistryEntry
source_file: src/knowledge/ontology/registry.ts
category: function
title: removeRegistryEntry
entity_type: api
search_terms:
 - delete concept from registry
 - unregister knowledge base article
 - remove compiled document
 - how to delete a docId
 - registry management
 - concept registry update
 - handle deleted articles
 - prune knowledge base index
 - in-memory index modification
 - YAAF knowledge base maintenance
 - docId removal
stub: false
compiled_at: 2026-04-24T17:32:24.625Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/registry.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `removeRegistryEntry` function deletes a single entry from the in-[Memory](../concepts/memory.md) `ConceptRegistry` using its unique document ID (`docId`). [Source 1]

This function is typically invoked [when](./when.md) a compiled knowledge base article is deleted from the filesystem. Its purpose is to ensure the registry, which serves as a live index of all known concepts, remains synchronized with the actual compiled output. Maintaining an accurate registry is critical for other YAAF subsystems like the [Backlink Resolver](../subsystems/backlink-resolver.md) and [Linter](../concepts/linter.md), which depend on it to understand the "known universe" of compiled articles. [Source 1]

## Signature

```typescript
export function removeRegistryEntry(
  registry: ConceptRegistry,
  docId: string
): boolean;
```

### Parameters

- **`registry`**: `ConceptRegistry`
  - The `ConceptRegistry` instance from which to remove the entry. The `ConceptRegistry` is a `Map<string, ConceptRegistryEntry>`.

- **`docId`**: `string`
  - The unique identifier of the registry entry to be removed.

### Returns

- **`boolean`**
  - Returns `true` if an entry with the specified `docId` was found and successfully removed.
  - Returns `false` if no entry with the given `docId` exists in the registry.

## Examples

The following example demonstrates how to remove an existing entry from a `ConceptRegistry`.

```typescript
import { removeRegistryEntry } from 'yaaf';
import type { ConceptRegistry } from 'yaaf';

// Assume 'registry' is a populated ConceptRegistry instance.
// A ConceptRegistry is a Map where keys are docIds.
const registry: ConceptRegistry = new Map([
  ['concepts/attention-mechanism', {
    docId: 'concepts/attention-mechanism',
    title: 'Attention Mechanism',
    entityType: 'concept',
    sourcePath: 'src/concepts/attention-mechanism.md',
    aliases: ['attention'],
  }],
  ['guides/getting-started', {
    docId: 'guides/getting-started',
    title: 'Getting Started',
    entityType: 'guide',
    sourcePath: 'src/guides/getting-started.md',
    aliases: [],
  }]
]);

const docIdToRemove = 'concepts/attention-mechanism';

console.log(`Registry contains "${docIdToRemove}" before:`, registry.has(docIdToRemove));
//> Registry contains "concepts/attention-mechanism" before: true
console.log(`Registry size before: ${registry.size}`);
//> Registry size before: 2

const wasRemoved = removeRegistryEntry(registry, docIdToRemove);

console.log(`Removal successful: ${wasRemoved}`);
//> Removal successful: true

console.log(`Registry contains "${docIdToRemove}" after:`, registry.has(docIdToRemove));
//> Registry contains "concepts/attention-mechanism" after: false
console.log(`Registry size after: ${registry.size}`);
//> Registry size after: 1
```

## See Also

- `upsertRegistryEntry`: For adding or updating an entry in the registry.
- `buildConceptRegistry`: For initially populating the registry from the filesystem.
- `ConceptRegistry`: The type definition for the in-memory knowledge base index.

## Sources

[Source 1]: src/knowledge/[Ontology](../concepts/ontology.md)/registry.ts