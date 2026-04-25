---
summary: Defines the schema for the frontmatter of a knowledge base article.
export_name: FrontmatterSchema
source_file: src/knowledge/ontology/index.ts
category: type
title: FrontmatterSchema
entity_type: api
search_terms:
 - knowledge base article metadata
 - YAML frontmatter validation
 - article schema definition
 - ontology frontmatter type
 - defining article properties
 - KB article structure
 - metadata schema for documents
 - frontmatter fields
 - how to define article frontmatter
 - YAAF knowledge base ontology
 - article metadata type
stub: false
compiled_at: 2026-04-24T17:07:24.280Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/ontology/index.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `[[[[[[[[Frontmatter]]]]]]]]Schema` type is a part of the YAAF Knowledge Base [Ontology](../concepts/ontology.md) subsystem. It defines the expected structure, fields, and types for the YAML Frontmatter block found at the beginning of every knowledge base article [Source 1]. This schema is used to validate article metadata, ensuring consistency and correctness across the entire knowledge base.

Developers working with the [Knowledge Base Ontology](../subsystems/knowledge-base-ontology.md) would use this type to understand or enforce the required metadata for articles.

## Signature

`FrontmatterSchema` is exported as a TypeScript `type` from the main package index. It is part of the core type system for the knowledge base ontology [Source 1].

```typescript
// Source: src/knowledge/ontology/index.ts

export type {
  // ...
  FrontmatterSchema,
  // ...
} from "./types.js";
```

## Examples

### Importing the Type

The most common use case is to import the `FrontmatterSchema` type for use in custom scripts or [Tools](../subsystems/tools.md) that interact with the YAAF knowledge base.

```typescript
import type { FrontmatterSchema } from 'yaaf';

// A function that might process or validate an article's frontmatter
// against the official schema.
function validateArticleMetadata(data: unknown): boolean {
  // In a real implementation, you would use a validation library
  // like Zod, with a schema derived from FrontmatterSchema,
  // to check if 'data' conforms to the expected structure.
  console.log('Validating against FrontmatterSchema...');
  // ... validation logic here
  return true;
}

const articleFrontmatter = {
  title: 'My New Article',
  entity_type: 'guide',
  summary: 'A guide to something important.',
};

validateArticleMetadata(articleFrontmatter);
```

## Sources

[Source 1]: src/knowledge/ontology/index.ts