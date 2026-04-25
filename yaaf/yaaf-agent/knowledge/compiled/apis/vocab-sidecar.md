---
summary: TypeScript type inferred from VocabSidecarSchema, representing a vocabulary sidecar with term aliases and entity types.
export_name: VocabSidecar
source_file: src/knowledge/compiler/schemas.ts
category: type
title: VocabSidecar
entity_type: api
search_terms:
 - knowledge base vocabulary
 - entity aliases
 - term mapping
 - sidecar file format
 - vocabulary schema
 - how to define synonyms
 - linking terms to documents
 - entity type mapping
 - VocabSidecarSchema
 - knowledge compiler types
 - canonical term definition
 - what is a vocab sidecar
stub: false
compiled_at: 2026-04-24T17:48:55.004Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/schemas.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `VocabSidecar` type represents the structure of a [Vocabulary](../concepts/vocabulary.md) sidecar file used within the YAAF Knowledge Base subsystem. It is a TypeScript type inferred from the `VocabSidecarSchema` Zod schema [Source 1].

This type defines a mapping of canonical terms to their associated metadata, including aliases (synonyms), an optional [Entity Type](../concepts/entity-type.md), and an optional document ID (`docId`) that links the term to a specific article in the knowledge base. This structured vocabulary is a key input for the [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md), enabling consistent entity linking, grounding, and [Discovery](../concepts/discovery.md) across the knowledge base.

## Signature

`VocabSidecar` is a TypeScript type derived from the `VocabSidecarSchema` using `z.infer`. The underlying Zod schema defines its structure and validation rules [Source 1].

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

### Properties

*   `vocabulary` (optional): `Record<string, { aliases: string[]; entityType?: string; docId?: string; }>`
    *   An object where each key is a canonical term (string).
    *   The value for each term is an object containing:
        *   `aliases`: An array of strings representing alternative names or synonyms for the canonical term. Defaults to an empty array `[]`.
        *   `entityType`: An optional string that classifies the term (e.g., "concept", "api", "plugin").
        *   `docId`: An optional string that provides a direct link to the corresponding document ID in the knowledge base.

## Examples

### Example Vocabulary File

Below is an example of what the data structure might look like in a JSON file (e.g., `vocab.json`) representing a `VocabSidecar`.

```json
{
  "vocabulary": {
    "Agent": {
      "aliases": ["YAAF Agent", "LLM Agent"],
      "entityType": "concept",
      "docId": "concept/agent"
    },
    "Tool": {
      "aliases": ["Function", "Action"],
      "entityType": "concept",
      "docId": "concept/tool"
    },
    "KnowledgeBase": {
      "aliases": ["KB"],
      "entityType": "subsystem"
    },
    "AgentExecutor": {
      "aliases": [],
      "entityType": "api",
      "docId": "api/agent-executor"
    }
  }
}
```

### TypeScript Usage

Here is how you might define a variable of type `VocabSidecar` in TypeScript.

```typescript
import type { VocabSidecar } from 'yaaf';

const myVocabulary: VocabSidecar = {
  vocabulary: {
    "Agent": {
      aliases: ["YAAF Agent"],
      entityType: "concept",
      docId: "concept/agent"
    },
    "Plugin": {
      aliases: ["Extension"],
      entityType: "plugin"
    }
  }
};
```

## Sources

[Source 1]: src/knowledge/compiler/schemas.ts