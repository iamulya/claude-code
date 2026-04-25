---
summary: Represents a single entry in the concept registry, detailing a specific concept.
export_name: ConceptRegistryEntry
source_file: src/knowledge/ontology/index.ts
category: type
title: ConceptRegistryEntry
entity_type: api
search_terms:
 - concept registry type
 - ontology concept definition
 - knowledge base concept
 - what is a concept entry
 - concept registry structure
 - defining a concept in YAAF
 - KB ontology types
 - concept metadata
 - concept registry item
 - YAAF knowledge base
 - ontology entity
 - concept registry schema
stub: false
compiled_at: 2026-04-24T16:57:15.675Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `ConceptRegistryEntry` type defines the structure for a single concept within the YAAF knowledge base's `ConceptRegistry`. It serves as a record that maps a canonical concept name, and potentially its aliases, to a specific document within the compiled knowledge base.

This type is a fundamental part of the [Ontology](../concepts/ontology.md) subsystem, which provides the structural definition for the knowledge base. It is used at runtime by components like the `KBStore` to look up and manage information about the concepts defined in the knowledge base.

## Signature

The detailed structure and fields of the `ConceptRegistryEntry` type are not specified in the provided source material. It is exported as a type from the main ontology barrel file.

```typescript
// Source: src/knowledge/ontology/index.ts

export type {
  // ... other types
  ConceptRegistry,
  ConceptRegistryEntry,
  // ... other types
} from "./types.js";
```

## Examples

The following example demonstrates how `ConceptRegistryEntry` is imported and used as a type annotation in a function signature.

```typescript
import type { ConceptRegistry, ConceptRegistryEntry } from 'yaaf';

/**
 * A function that processes a single entry from the ConceptRegistry.
 * @param entry - The concept registry entry to process.
 */
function processConcept(entry: ConceptRegistryEntry): void {
  // The internal structure of 'entry' is not defined in the provided sources,
  // but logic to access its properties (e.g., docId, aliases) would go here.
  console.log('Processing a concept entry...');
}

// Example of how this function might be called with a hypothetical registry
function processAllConcepts(registry: ConceptRegistry): void {
  for (const conceptName in registry) {
    const entry: ConceptRegistryEntry = registry[conceptName];
    processConcept(entry);
  }
}
```

## See Also

*   `ConceptRegistry`: A map-like object that stores all `ConceptRegistryEntry` instances, keyed by their canonical names.
*   `KBStore`: A class that provides runtime access to the compiled knowledge base and utilizes the `ConceptRegistry`.

## Sources

*   `src/knowledge/ontology/index.ts`
*   `src/knowledge/store/store.ts`