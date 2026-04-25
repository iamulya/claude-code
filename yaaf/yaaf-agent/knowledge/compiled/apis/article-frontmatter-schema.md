---
summary: Zod schema for validating the parsed frontmatter of a knowledge base article, allowing for ontology-defined custom fields.
export_name: ArticleFrontmatterSchema
source_file: src/knowledge/compiler/schemas.ts
category: const
title: ArticleFrontmatterSchema
entity_type: api
search_terms:
 - validate article metadata
 - zod schema for frontmatter
 - knowledge base article structure
 - custom fields in frontmatter
 - article metadata validation
 - doc_id format
 - grounding score validation
 - source quality enum
 - entity_type validation
 - how to define article properties
 - schema for YAML header
 - KB compiler contract
stub: false
compiled_at: 2026-04-24T16:50:01.646Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/schemas.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`Article[[[[[[[[Frontmatter]]]]]]]]Schema` is a Zod schema used within the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) to validate the YAML Frontmatter of markdown articles [Source 1]. It serves as a data contract, ensuring that every article in the knowledge base contains a consistent set of core metadata fields with valid types and formats before any further processing occurs.

This schema defines required fields such as `title`, `entity_type`, and `doc_id`, as well as optional fields for tracking data quality and provenance like `confidence`, `grounding_score`, and `source_quality`.

The source code comment indicates that this schema is intended to be extensible with custom, [Ontology](../concepts/ontology.md)-defined fields, though the provided code signature does not explicitly include Zod's `.passthrough()` method [Source 1].

## Signature

`ArticleFrontmatterSchema` is a `const` export of a Zod object schema.

```typescript
import { z } from "zod";

export const ArticleFrontmatterSchema = z
  .object({
    title: z.string().min(1),
    entity_type: z.string().min(1),
    doc_id: z
      .string()
      .regex(/^[a-z][a-z0-9\-\/]+$/),
    confidence: z.number().min(0).max(1).default(0.5),
    sources: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    grounding_score: z.number().min(0).max(1).optional(),
    grounding_mode: z
      .enum(["vocabulary_only", "embedding", "llm_verified"])
      .optional(),
    source_quality: z
      .enum(["peer_reviewed", "official_docs", "blog", "transcription", "unknown"])
      .default("unknown"),
  });

export type ArticleFrontmatter = z.infer<typeof ArticleFrontmatterSchema>;
```

### Schema Fields

*   **`title`** (`string`): The human-readable title of the article. Must be at least one character long.
*   **`entity_type`** (`string`): The type of entity the article describes (e.g., 'api', 'concept', 'guide'). Must be at least one character long.
*   **`doc_id`** (`string`): A unique, machine-readable identifier for the document. Must follow the regex `/^[a-z][a-z0-9\-\/]+$/`.
*   **`confidence`** (`number`, optional): A score between 0.0 and 1.0 indicating the confidence in the accuracy of the article's content. Defaults to `0.5`.
*   **`sources`** (`string[]`, optional): An array of source identifiers from which the article's content was derived. Defaults to an empty array.
*   **`tags`** (`string[]`, optional): An array of keywords for categorization and search. Defaults to an empty array.
*   **`grounding_score`** (`number`, optional): A score between 0.0 and 1.0 representing how well the article's claims are supported by the provided sources.
*   **`grounding_mode`** (`enum`, optional): The method used to determine the [Grounding Score](../concepts/grounding-score.md). Can be one of `"vocabulary_only"`, `"embedding"`, or `"llm_verified"`.
*   **`source_quality`** (`enum`, optional): A classification of the primary source material's quality. Can be one of `"peer_reviewed"`, `"official_docs"`, `"blog"`, `"transcription"`, or `"unknown"`. Defaults to `"unknown"`.

## Examples

### Validating a Correct Frontmatter Object

This example demonstrates successfully parsing a valid frontmatter object that conforms to the schema.

```typescript
import { ArticleFrontmatterSchema } from 'yaaf';

const validFrontmatter = {
  title: 'Agent',
  entity_type: 'concept',
  doc_id: 'concepts/agent',
  confidence: 0.95,
  sources: ['src/agent.ts'],
  tags: ['core', 'architecture'],
  grounding_score: 0.88,
  grounding_mode: 'llm_verified',
  source_quality: 'official_docs',
};

try {
  const parsed = ArticleFrontmatterSchema.parse(validFrontmatter);
  console.log('Validation successful:', parsed);
} catch (error) {
  console.error('Validation failed:', error);
}
```

### Validating an Incorrect Frontmatter Object

This example shows how the schema catches an invalid `doc_id` format and throws a `ZodError`.

```typescript
import { ArticleFrontmatterSchema } from 'yaaf';

const invalidFrontmatter = {
  title: 'Agent',
  entity_type: 'concept',
  doc_id: 'Concepts/Agent', // Uppercase 'C' and 'A' are invalid
  tags: ['core'],
};

try {
  ArticleFrontmatterSchema.parse(invalidFrontmatter);
} catch (error) {
  // ZodError will be caught here
  console.error('Validation failed:', error.errors);
  /*
  Output will include an error message like:
  [
    {
      "validation": "regex",
      "code": "invalid_string",
      "message": "Invalid",
      "path": [ "doc_id" ]
    }
  ]
  */
}
```

## Sources

[Source 1]: src/knowledge/compiler/schemas.ts