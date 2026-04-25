---
summary: An index mapping aliases to their canonical entity identifiers.
export_name: AliasIndex
source_file: src/knowledge/ontology/index.ts
category: type
title: AliasIndex
entity_type: api
search_terms:
 - entity alias mapping
 - knowledge base synonyms
 - ontology vocabulary index
 - canonical entity ID lookup
 - map term to concept
 - how to resolve entity names
 - vocabulary normalization
 - alias to identifier map
 - concept synonym index
 - linking mentions to entities
 - entity resolution
 - disambiguation index
stub: false
compiled_at: 2026-04-24T16:48:04.576Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `AliasIndex` type represents a data structure used within the YAAF knowledge base and [Ontology](../concepts/ontology.md) subsystem. It serves as a dictionary or hash map that links various alternative names, synonyms, and abbreviations (aliases) for an entity to a single, stable, canonical identifier for that entity.

This index is a fundamental component for entity normalization and linking. It allows the system to recognize that different textual mentions, such as "[LLM](../concepts/llm.md)", "Large Language Model", and "language model", all refer to the same underlying concept. By consulting the `AliasIndex`, an agent can resolve these aliases to a canonical ID, ensuring consistent understanding and processing of entities mentioned in text.

## Signature

The `AliasIndex` is a TypeScript `type` exported from the package's ontology module. The provided source material does not include its detailed definition, but it is conceptually a map where keys are string aliases and values are the corresponding canonical entity identifiers.

It is exported alongside other [Vocabulary](../concepts/vocabulary.md)-related types from `src/knowledge/ontology/index.ts` [Source 1].

```typescript
// Source: src/knowledge/ontology/index.ts

export type {
  AliasIndex,
  EntityMention,
  NormalizeOptions,
  NormalizationResult,
} from "./vocabulary.js";
```

## Examples

The following example illustrates the conceptual structure of an `AliasIndex` object and how it might be used to look up a canonical identifier from a given alias.

```typescript
import type { AliasIndex } from 'yaaf';

// This is a conceptual example of what an AliasIndex object might look like.
const aliasIndex: AliasIndex = {
  // All aliases are typically normalized (e.g., lowercase)
  'llm': 'concept:large-language-model',
  'large language model': 'concept:large-language-model',
  'language model': 'concept:large-language-model',
  'agent': 'concept:agent',
  'ai agent': 'concept:agent',
  'autonomous agent': 'concept:agent',
};

function getCanonicalId(alias: string): string | undefined {
  const normalizedAlias = alias.toLowerCase();
  return aliasIndex[normalizedAlias];
}

// Usage:
const id1 = getCanonicalId('LLM');
console.log(id1); // Outputs: 'concept:large-language-model'

const id2 = getCanonicalId('Autonomous Agent');
console.log(id2); // Outputs: 'concept:agent'

const id3 = getCanonicalId('Unknown Term');
console.log(id3); // Outputs: undefined
```

## Sources

[Source 1]: src/knowledge/ontology/index.ts