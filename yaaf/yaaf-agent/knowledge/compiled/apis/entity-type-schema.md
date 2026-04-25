---
summary: Defines the schema for a specific entity type within the YAAF knowledge base.
export_name: EntityTypeSchema
source_file: src/knowledge/ontology/index.ts
category: type
title: EntityTypeSchema
entity_type: api
search_terms:
 - knowledge base schema
 - define entity types
 - ontology type definition
 - YAAF entity structure
 - what is an entity type
 - how to configure entities
 - frontmatter schema for entities
 - entity validation rules
 - knowledge graph node type
 - semantic type system
 - custom entity types
 - KBOntology component
stub: false
compiled_at: 2026-04-24T17:04:42.944Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `EntityTypeSchema` type is a core component of the YAAF Knowledge Base's [Ontology](../concepts/ontology.md) system. It is used to define the structure, constraints, and metadata for a specific category of entities within the knowledge base, such as `api`, `concept`, or `guide`.

Each `EntityTypeSchema` specifies the rules that articles of its type must follow, likely including required [Frontmatter](../concepts/frontmatter.md) fields, section layouts, and other validation criteria. These schemas are aggregated within the main `KBOntology` definition to provide a comprehensive and enforceable structure for the entire knowledge base.

## Signature / Constructor

`EntityTypeSchema` is a TypeScript type alias. It is exported as part of the public API for the ontology layer. The provided source material does not include the detailed definition of the type's properties, only its export statement [Source 1].

```typescript
// Source: src/knowledge/ontology/index.ts

export type {
  // ...
  EntityTypeSchema,
  // ...
} from "./types.js";
```

## Examples

No usage examples are available in the provided source material.

## See Also

*   `KBOntology`: The main type that defines the entire knowledge base structure, which includes a collection of `EntityTypeSchema` definitions.
*   `FrontmatterSchema`: A type likely used within `EntityTypeSchema` to define the validation rules for an entity's frontmatter.
*   `ArticleSection`: A type that may be used to define the required sections for an article of a given [Entity Type](../concepts/entity-type.md).

## Sources

[Source 1]: src/knowledge/ontology/index.ts