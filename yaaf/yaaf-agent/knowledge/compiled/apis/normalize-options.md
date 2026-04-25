---
summary: Options for configuring the normalization process of text or entities.
export_name: NormalizeOptions
source_file: src/knowledge/ontology/index.ts
category: type
title: NormalizeOptions
entity_type: api
search_terms:
 - entity normalization configuration
 - text normalization settings
 - how to normalize mentions
 - vocabulary matching options
 - alias resolution parameters
 - configuring entity linking
 - normalization process settings
 - entity resolution options
 - map text to canonical entity
 - vocabulary lookup settings
stub: false
compiled_at: 2026-04-24T17:22:59.164Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `NormalizeOptions` type is used to provide configuration settings for the entity normalization process within the YAAF knowledge and [Ontology](../concepts/ontology.md) subsystem.

Normalization is the process of mapping a textual mention of an entity (an `EntityMention`) to its canonical representation within a defined [Vocabulary](../concepts/vocabulary.md) or knowledge base. The `NormalizeOptions` type allows a caller to customize the behavior of this mapping process, influencing how aliases are resolved and entities are matched. It is used in conjunction with types like `EntityMention` and `NormalizationResult` [Source 1].

## Signature

`NormalizeOptions` is a TypeScript type alias. The specific properties of this type are not detailed in the provided source material, which only includes its export from the main ontology barrel file [Source 1].

```typescript
// As exported from src/knowledge/ontology/index.ts
// The definition is located in src/knowledge/ontology/vocabulary.ts
export type { NormalizeOptions } from "./vocabulary.js";
```

## Examples

The provided source material does not contain any examples of how to use `NormalizeOptions` [Source 1].

## Sources

[Source 1]: src/knowledge/ontology/index.ts