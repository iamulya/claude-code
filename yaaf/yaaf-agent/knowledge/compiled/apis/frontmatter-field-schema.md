---
summary: Defines the schema for a single field within an article's frontmatter.
export_name: FrontmatterFieldSchema
source_file: src/knowledge/ontology/index.ts
category: type
title: FrontmatterFieldSchema
entity_type: api
search_terms:
 - knowledge base schema
 - article metadata definition
 - frontmatter validation
 - defining article fields
 - ontology field type
 - metadata schema
 - configure frontmatter
 - YAML header schema
 - KB content model
 - entity type fields
 - article property schema
stub: false
compiled_at: 2026-04-24T17:07:16.302Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `[[[[[[[[Frontmatter]]]]]]]]FieldSchema` type is a core component of the YAAF Knowledge Base (KB) [Ontology](../concepts/ontology.md) system. It is used to define the structure, data type, and validation rules for a single field within the YAML Frontmatter of a knowledge base article [Source 1].

Each `FrontmatterFieldSchema` object represents one key-value pair in the frontmatter, such as `title`, `entity_type`, or a custom field. These individual field schemas are collected within a `FrontmatterSchema`, which in turn is part of a larger `EntityTypeSchema`. This hierarchical structure allows the KB compiler to validate that each article's metadata conforms to the defined ontology for its specific [Entity Type](../concepts/entity-type.md).

## Signature

The precise definition of the `FrontmatterFieldSchema` type is not available in the provided source material. It is exported as part of the public API from the ontology subsystem [Source 1].

```typescript
// Source: src/knowledge/ontology/index.ts

export type {
  // ... other types
  FrontmatterFieldSchema,
  // ... other types
} from "./types.js";
```

## Examples

No usage examples are available in the provided source material.

## See Also

- `FrontmatterSchema`: A type that aggregates multiple `FrontmatterFieldSchema` definitions to describe the complete frontmatter for an entity type.
- `EntityTypeSchema`: The top-level schema for a type of article in the knowledge base, which includes the `FrontmatterSchema`.
- `KBOntology`: The complete definition of all entity types, relationships, and vocabularies in the knowledge base.
- `FieldType`: An enumeration of possible data types for a frontmatter field (e.g., string, number, boolean).

## Sources

[Source 1]: src/knowledge/ontology/index.ts