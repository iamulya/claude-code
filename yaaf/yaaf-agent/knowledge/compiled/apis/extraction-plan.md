---
summary: TypeScript type representing the structured plan an LLM extractor generates for creating or modifying knowledge base articles.
export_name: ExtractionPlan
source_file: src/knowledge/compiler/schemas.ts
category: type
title: ExtractionPlan
entity_type: api
search_terms:
 - LLM extraction output
 - knowledge base compiler input
 - ExtractionPlanSchema
 - ExtractionArticleSchema
 - how to structure LLM output for KB
 - article creation plan
 - create update merge skip articles
 - document generation plan
 - canonical title entity type
 - docIdSuggestion
 - confidence score for extraction
 - source attribution for articles
 - Zod schema for extraction
stub: false
compiled_at: 2026-04-24T17:05:54.148Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/schemas.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `ExtractionPlan` type defines the data structure for the output of an [LLM](../concepts/llm.md)-based extraction process within the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md). It represents a complete plan for creating, updating, merging, or skipping articles based on a set of source materials.

This type serves as a contract between the LLM extractor and the subsequent stages of the knowledge compilation pipeline. An object of this type is validated against the `ExtractionPlanSchema` to ensure all required fields and formats are correct before any further processing occurs [Source 1].

## Signature

`ExtractionPlan` is a TypeScript type inferred from the `ExtractionPlanSchema` Zod schema. It is an object containing a single property, `articles`, which is an array of objects conforming to the structure of `ExtractionArticleSchema` [Source 1].

```typescript
export type ExtractionPlan = {
  articles: {
    canonicalTitle: string;
    entityType: string;
    action: "create" | "update" | "merge" | "skip";
    docIdSuggestion?: string;
    confidence: number;
    sources: string[];
    relatedArticles: string[];
    referencedBy: string[];
  }[];
};
```

### `articles` Array Properties

Each object in the `articles` array represents a proposed action on a single knowledge base article and has the following properties [Source 1]:

| Property          | Type                                       | Description                                                                                             |
| ----------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `canonicalTitle`  | `string`                                   | The proposed canonical title for the article. Must be between 1 and 200 characters.                     |
| `entityType`      | `string`                                   | The type of entity the article describes (e.g., 'api', 'concept').                                      |
| `action`          | `"create" \| "update" \| "merge" \| "skip"` | The action to be taken for this article.                                                                |
| `docIdSuggestion` | `string` (optional)                        | A suggested unique document ID, conforming to the regex `^[a-z][a-z0-9\-\/]+$`.                          |
| `confidence`      | `number`                                   | The LLM's confidence in the accuracy of this extraction, from 0.0 to 1.0. Defaults to `0.5`.             |
| `sources`         | `string[]`                                 | An array of source identifiers from which this article's information was extracted. Must not be empty.  |
| `relatedArticles` | `string[]`                                 | An array of canonical titles for other articles that are related to this one. Defaults to an empty array. |
| `referencedBy`    | `string[]`                                 | An array of canonical titles for other articles that reference this one. Defaults to an empty array.    |

## Examples

The following is an example of a valid `ExtractionPlan` object that an LLM might generate. It proposes creating a new article for `Agent`, updating an existing one for `Tool`, and skipping a duplicate entry.

```json
{
  "articles": [
    {
      "canonicalTitle": "Agent",
      "entityType": "class",
      "action": "create",
      "docIdSuggestion": "api/agent",
      "confidence": 0.95,
      "sources": ["src/agent.ts"],
      "relatedArticles": ["Tool", "AgentExecutor"],
      "referencedBy": []
    },
    {
      "canonicalTitle": "Tool",
      "entityType": "interface",
      "action": "update",
      "docIdSuggestion": "api/tool",
      "confidence": 0.88,
      "sources": ["src/tools/tool.ts", "docs/concepts/tools.md"],
      "relatedArticles": ["Agent"],
      "referencedBy": ["Agent"]
    },
    {
      "canonicalTitle": "Agent Class",
      "entityType": "class",
      "action": "skip",
      "confidence": 0.99,
      "sources": ["src/agent.ts"],
      "relatedArticles": [],
      "referencedBy": []
    }
  ]
}
```

## Sources

[Source 1] `src/knowledge/compiler/schemas.ts`