---
summary: The result object returned after performing a normalization operation.
export_name: NormalizationResult
source_file: src/knowledge/ontology/index.ts
category: type
title: NormalizationResult
entity_type: api
search_terms:
 - entity normalization result
 - vocabulary normalization output
 - map alias to canonical entity
 - knowledge base entity resolution
 - ontology term standardization
 - what does normalize return
 - YAAF ontology types
 - resolving entity mentions
 - canonical form of a term
 - alias resolution
 - vocabulary management
stub: false
compiled_at: 2026-04-24T17:22:53.813Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`NormalizationResult` is a TypeScript type that defines the structure of the object returned [when](./when.md) performing a normalization operation within the YAAF knowledge base's [Ontology](../concepts/ontology.md) and [Vocabulary](../concepts/vocabulary.md) system [Source 1].

Normalization is the process of resolving a given term, mention, or alias to its canonical or standardized representation within the ontology. This type is used in conjunction with other vocabulary-related types such as `NormalizeOptions` and `EntityMention` to manage and standardize entity references [Source 1].

## Signature

`NormalizationResult` is exported as a type from the main ontology barrel file. The source material provided is an index file that re-exports the type, so its detailed internal structure is not defined in this specific source [Source 1].

```typescript
// Source: src/knowledge/ontology/index.ts

export type {
  // ... other types
  NormalizationResult,
} from "./vocabulary.js";
```

## Examples

No usage examples are available in the provided source material.

## See Also

This type is part of the ontology and vocabulary subsystem and is related to the following types also exported from `src/knowledge/ontology/index.ts`:

*   `AliasIndex`
*   `EntityMention`
*   `NormalizeOptions`

## Sources

[Source 1]: src/knowledge/ontology/index.ts