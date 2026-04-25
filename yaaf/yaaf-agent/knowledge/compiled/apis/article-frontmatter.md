---
summary: TypeScript type representing the validated metadata (frontmatter) of a knowledge base article.
export_name: ArticleFrontmatter
source_file: src/knowledge/compiler/schemas.ts
category: type
title: ArticleFrontmatter
entity_type: api
search_terms:
 - article metadata
 - knowledge base frontmatter
 - YAML header type
 - article properties schema
 - doc_id field
 - grounding score type
 - source quality enum
 - zod schema for articles
 - KB article validation
 - custom frontmatter fields
 - passthrough schema
 - article configuration
stub: false
compiled_at: 2026-04-24T16:49:47.489Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/schemas.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `Article[[[[[[[[Frontmatter]]]]]]]]` type defines the structure of the parsed and validated YAML Frontmatter block found at the beginning of a YAAF knowledge base article. It is a TypeScript type inferred from the `ArticleFrontmatterSchema`, a Zod schema used by the [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) [Source 1].

This type serves as a contract for article metadata, ensuring that all articles processed by the compiler have a consistent and valid set of core properties. The underlying schema allows for additional, non-standard fields to support custom ontologies, a feature enabled by Zod's `.passthrough()` method [Source 1].

## Signature

`ArticleFrontmatter` is a TypeScript type with the following structure [Source 1]:

```typescript
export type ArticleFrontmatter = {
  title: string;
  entity_type: string;
  doc_id: string;
  confidence?: number; // default: 0.5
  sources?: string[]; // default: []
  tags?: string[]; // default: []
  grounding_score?: number;
  grounding_mode?: "vocabulary_only" | "embedding" | "llm_verified";
  source_quality?: "peer_reviewed" | "official_docs" | "blog" | "transcription" | "unknown"; // default: "unknown"
  [key: string]: unknown; // Allows for additional, custom fields
};
```

### Properties

| Property          | Type                                                                        | Description                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `title`           | `string`                                                                    | The human-readable title of the article. Must be at least 1 character long.                                                            |
| `entity_type`     | `string`                                                                    | The type of entity the article describes (e.g., 'api', 'concept', 'guide'). Must be at least 1 character long.                         |
| `doc_id`          | `string`                                                                    | A unique, machine-readable identifier for the article. Must match the regex `^[a-z][a-z0-9\-\/]+$`.                                    |
| `confidence`      | `number` (optional)                                                         | A score from 0.0 to 1.0 indicating the confidence in the article's accuracy. Defaults to `0.5`.                                        |
| `sources`         | `string[]` (optional)                                                       | An array of strings identifying the source materials used to create the article. Defaults to an empty array `[]`.                      |
| `tags`            | `string[]` (optional)                                                       | An array of keywords for categorization and search. Defaults to an empty array `[]`.                                                   |
| `grounding_score` | `number` (optional)                                                         | A score from 0.0 to 1.0 representing how well the article's claims are supported by its sources.                                       |
| `grounding_mode`  | `"vocabulary_only" \| "embedding" \| "llm_verified"` (optional)             | The method used to determine the `grounding_score`.                                                                                    |
| `source_quality`  | `"peer_reviewed" \| "official_docs" \| "blog" \| "transcription" \| "unknown"` (optional) | An enumeration classifying the quality of the primary source material. Defaults to `"unknown"`.                                        |

## Examples

### Basic Usage

A typical `ArticleFrontmatter` object with required and some optional fields.

```typescript
import type { ArticleFrontmatter } from 'yaaf';

const apiArticleMeta: ArticleFrontmatter = {
  title: "Agent",
  entity_type: "api",
  doc_id: "api/agent",
  confidence: 0.95,
  tags: ["core", "agent-lifecycle"],
  sources: ["src/agent.ts"],
  grounding_score: 0.9,
  grounding_mode: "llm_verified",
  source_quality: "official_docs",
};
```

### With Custom Fields

The type allows for custom fields not defined in the base schema, which is useful for extending the Knowledge Base [Ontology](../concepts/ontology.md).

```typescript
import type { ArticleFrontmatter } from 'yaaf';

const customArticleMeta: ArticleFrontmatter = {
  title: "StreamingTool",
  entity_type: "plugin",
  doc_id: "plugin/streaming-tool",
  // Custom field not in the base schema
  plugin_author: "YAAF-Labs",
  // Standard fields
  confidence: 0.8,
  tags: ["tools", "streaming"],
  sources: ["src/plugins/streaming-tool.ts"],
};
```

## Sources

[Source 1]: src/knowledge/compiler/schemas.ts