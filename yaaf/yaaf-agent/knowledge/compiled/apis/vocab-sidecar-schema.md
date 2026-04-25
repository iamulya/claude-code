---
summary: Zod schema for validating a vocabulary sidecar file, containing aliases and entity type information for terms.
export_name: VocabSidecarSchema
source_file: src/knowledge/compiler/schemas.ts
category: const
title: VocabSidecarSchema
entity_type: api
search_terms:
 - knowledge base vocabulary
 - term aliases schema
 - entity type mapping
 - validate vocab file
 - zod schema for vocabulary
 - sidecar file validation
 - knowledge compiler schemas
 - how to define term aliases
 - docId for vocabulary term
 - linking terms to documents
 - vocabulary grounding
 - canonical term definition
stub: false
compiled_at: 2026-04-24T17:49:00.630Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/schemas.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`VocabSidecarSchema` is a Zod schema used within the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) to validate the structure of [Vocabulary](../concepts/vocabulary.md) sidecar files [Source 1]. These files provide a centralized dictionary of canonical terms, their aliases, and associated metadata like [Entity Type](../concepts/entity-type.md) and document ID.

This schema serves as a contract at the compiler boundary, ensuring that vocabulary data used for entity grounding and [Wikilink Resolution](../concepts/wikilink-resolution.md) is well-formed and consistent. By defining known terms and their variations, the vocabulary sidecar helps the compiler accurately identify and link concepts mentioned in source documents [Source 1].

## Signature

`VocabSidecarSchema` is a `const` export of a Zod schema object.

```typescript
import { z } from "zod";

export const VocabSidecarSchema = z.object({
  vocabulary: z.record(
    z.string(), // The canonical term
    z.object({
      aliases: z.array(z.string()).default([]),
      entityType: z.string().optional(),
      docId: z.string().optional(),
    }),
  ).optional(),
});

export type VocabSidecar = z.infer<typeof VocabSidecarSchema>;
```

### Schema Breakdown

The schema defines an object that may contain an optional `vocabulary` property.

- `vocabulary`: A record (key-value map) where:
    - The **key** is a `string` representing the canonical name of a term (e.g., "Agent").
    - The **value** is an object with the following properties:
        - `aliases`: An array of `string`s representing alternative names or synonyms for the canonical term. Defaults to an empty array `[]`.
        - `entityType`: An optional `string` specifying the type of entity this term represents (e.g., "concept", "api").
        - `docId`: An optional `string` that provides a direct link to the knowledge base document for this term.

## Examples

### Basic Usage

The following example shows a valid vocabulary object and how to parse it using `VocabSidecarSchema`.

```typescript
import { VocabSidecarSchema, VocabSidecar } from 'yaaf';

// A sample vocabulary object, like one loaded from a JSON/YAML file.
const vocabData: VocabSidecar = {
  vocabulary: {
    "Agent": {
      aliases: ["YAAF Agent", "LLM Agent"],
      entityType: "concept",
      docId: "concepts/agent"
    },
    "Tool": {
      aliases: ["Function Call", "Tool Use"],
      entityType: "api"
      // docId is optional
    },
    "KnowledgeBase": {
      // aliases is optional and will default to []
      entityType: "subsystem"
    },
    "Planner": {
      // An entry with only aliases
      aliases: ["Task Planner"]
    }
  }
};

try {
  // Validate the data against the schema
  const validatedVocab = VocabSidecarSchema.parse(vocabData);
  console.log('Validation successful!');
  console.log(validatedVocab.vocabulary?.Agent);
} catch (error) {
  console.error('Validation failed:', error);
}
```

### Minimal Valid Object

An object with an empty `vocabulary` record or no `vocabulary` key at all is also valid.

```typescript
import { VocabSidecarSchema } from 'yaaf';

// Both of these are valid
const emptyVocab1 = {};
const emptyVocab2 = { vocabulary: {} };

try {
  VocabSidecarSchema.parse(emptyVocab1);
  VocabSidecarSchema.parse(emptyVocab2);
  console.log('Minimal objects validated successfully.');
} catch (error) {
  console.error('Validation failed:', error);
}
```

## Sources

[Source 1]: src/knowledge/compiler/schemas.ts