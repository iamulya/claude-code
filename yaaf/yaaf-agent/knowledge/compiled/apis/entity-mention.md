---
summary: Represents a detected mention of an entity within text.
export_name: EntityMention
source_file: src/knowledge/ontology/index.ts
category: type
title: EntityMention
entity_type: api
search_terms:
 - entity recognition
 - named entity recognition
 - NER result
 - text entity detection
 - find entities in text
 - entity normalization
 - vocabulary matching
 - knowledge base entity
 - ontology vocabulary
 - what is an entity mention
 - alias detection
 - text span entity
stub: false
compiled_at: 2026-04-24T17:04:29.177Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `EntityMention` type is a data structure that represents a specific occurrence of an entity found within a piece of text. It is a core component of the YAAF [Ontology](../concepts/ontology.md) and knowledge subsystem, used in processes like entity normalization and [Vocabulary](../concepts/vocabulary.md) management.

[when](./when.md) text is processed to link it to a structured knowledge base, `EntityMention` serves as the object that captures the details of a detected entity, such as the text that was matched and its position. This type is often used as part of a larger result set, for example, within a `NormalizationResult`.

## Signature

`EntityMention` is exported as a TypeScript type. The source material provides its export signature from the main ontology barrel file but does not include its detailed property definitions [Source 1].

```typescript
// Exported from: src/knowledge/ontology/index.ts

export type {
  // ...
  EntityMention,
  // ...
} from "./vocabulary.js";
```

## Examples

No code examples are available in the provided source material.

## See Also

- `NormalizationResult`: A type that often contains a collection of `EntityMention` objects as the output of an entity normalization process.
- `AliasIndex`: A data structure used for mapping different textual aliases to a canonical entity, which is a key part of finding entity mentions.

## Sources

[Source 1]: src/knowledge/ontology/index.ts