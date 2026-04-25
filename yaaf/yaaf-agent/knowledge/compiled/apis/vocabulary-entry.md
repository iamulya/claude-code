---
summary: Represents an entry in the knowledge base vocabulary, potentially including synonyms for query expansion.
export_name: VocabularyEntry
source_file: src/knowledge/ontology/types.js
category: type
title: VocabularyEntry
entity_type: api
search_terms:
 - knowledge base vocabulary
 - ontology synonyms
 - query expansion
 - search term aliases
 - define vocabulary terms
 - how to add synonyms to search
 - TF-IDF vocabulary
 - concept aliases
 - entity normalization
 - controlled vocabulary
 - lexical ambiguity
 - glossary term
stub: false
compiled_at: 2026-04-24T17:49:13.253Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/tfidfSearch.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `[[[[[[[[Vocabulary]]]]]]]]Entry` type represents a single term within a YAAF knowledge base's controlled Vocabulary. It is a core component of the [Ontology](../concepts/ontology.md) type system [Source 1].

The primary purpose of a `VocabularyEntry` is to define a canonical term and its associated synonyms. This information is crucial for features like vocabulary-aware query expansion. For instance, the built-in `TfIdfSearchPlugin` consumes a collection of `VocabularyEntry` objects to automatically include synonyms in search queries, improving search recall and robustness [Source 2].

## Signature

The `VocabularyEntry` type is exported as part of the public API for the ontology layer [Source 1]. Its definition is located in `src/knowledge/ontology/types.js`.

While the specific fields of the type are not detailed in the provided source material, it is exported from the ontology's barrel file as follows:

```typescript
// As exported from src/knowledge/ontology/index.ts [Source 1]
export type { VocabularyEntry } from "./types.js";
```

## Examples

The most common use of `VocabularyEntry` is to provide a vocabulary to a search adapter plugin to enable automatic query expansion. The following example shows how a vocabulary, which is a collection of `VocabularyEntry` items, is passed to the `TfIdfSearchPlugin`.

```typescript
import { TfIdfSearchPlugin } from 'yaaf';
import type { KBOntology } from 'yaaf';

// Assume 'ontology' is a loaded knowledge base ontology object.
// The 'vocabulary' property on this object would be an array
// or map of VocabularyEntry items.
declare const ontology: KBOntology;

// The TfIdfSearchPlugin is configured with the ontology's
// vocabulary. This enables it to automatically expand search
// queries with synonyms defined in the VocabularyEntry items. [Source 2]
const searchPlugin = new TfIdfSearchPlugin({
  vocabulary: ontology.vocabulary,
});

// When this plugin is registered with the PluginHost, searches
// will benefit from the defined vocabulary. For example, a search
// for "transformer" might also match documents containing a
// synonym like "self-attention network" if defined in a VocabularyEntry.
```

## Sources

[Source 1]: src/knowledge/ontology/index.ts
[Source 2]: src/knowledge/store/tfidfSearch.ts