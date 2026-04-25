---
summary: Zod schema for validating the complete extraction plan returned by an LLM extractor, containing an array of proposed articles.
export_name: ExtractionPlanSchema
source_file: src/knowledge/compiler/schemas.ts
category: const
title: ExtractionPlanSchema
entity_type: api
search_terms:
 - validate LLM extraction output
 - knowledge base compiler schema
 - schema for proposed articles
 - LLM extractor contract
 - Zod validation for agents
 - how to structure extraction plan
 - ExtractionArticleSchema array
 - YAAF knowledge compilation
 - parsing LLM JSON output
 - data validation for knowledge base
 - schema for article creation plan
 - LLM output validation
stub: false
compiled_at: 2026-04-24T17:05:58.786Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/schemas.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`ExtractionPlanSchema` is a Zod schema used within the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) subsystem to validate the output of an [LLM](../concepts/llm.md)-based extractor [Source 1]. It defines the expected structure for a complete "extraction plan," which consists of an array of proposed articles to be created, updated, or otherwise processed.

This schema serves as a critical data contract, ensuring that potentially untrusted or malformed data from an LLM is validated and sanitized before being used in subsequent compilation steps. The core of the schema is an `articles` array, where each element must conform to the `ExtractionArticleSchema` [Source 1].

## Signature

`ExtractionPlanSchema` is a Zod object schema. Its structure is defined by its own schema and the nested `ExtractionArticleSchema`. The inferred TypeScript type is `ExtractionPlan`.

```typescript
import { z } from "zod";

/**
 * Schema for a single proposed article within an extraction plan.
 */
export const ExtractionArticleSchema = z.object({
  canonicalTitle: z.string().min(1).max(200),
  entityType: z.string().min(1),
  action: z.enum(["create", "update", "merge", "skip"]),
  docIdSuggestion: z
    .string()
    .regex(/^[a-z][a-z0-9\-\/]+$/)
    .optional(),
  confidence: z.number().min(0).max(1).default(0.5),
  sources: z.array(z.string()).min(1),
  relatedArticles: z.array(z.string()).default([]),
  referencedBy: z.array(z.string()).default([]),
});

/**
 * The main schema for the complete extraction plan.
 */
export const ExtractionPlanSchema = z.object({
  articles: z.array(ExtractionArticleSchema),
});

/**
 * The TypeScript type inferred from the schema.
 */
export type ExtractionPlan = z.infer<typeof ExtractionPlanSchema>;
```
[Source 1]

## Properties

The `ExtractionPlanSchema` validates an object with a single top-level property:

*   **`articles`**: `Array<ExtractionArticle>`
    An array of objects, where each object represents a proposed article and must conform to the `ExtractionArticleSchema`.

### `ExtractionArticleSchema` Fields

Each object in the `articles` array has the following fields:

*   **`canonicalTitle`**: `string`
    The proposed title for the article. Must be between 1 and 200 characters.
*   **`entityType`**: `string`
    The type of entity the article describes (e.g., "concept", "api", "guide").
*   **`action`**: `"create" | "update" | "merge" | "skip"`
    The recommended action for the compiler to take with this article proposal.
*   **`docIdSuggestion`**: `string` (optional)
    A suggested document ID, which must match the regex `/^[a-z][a-z0-9\-\/]+$/`.
*   **`confidence`**: `number`
    A score between 0.0 and 1.0 indicating the LLM's confidence in the proposal. Defaults to `0.5`.
*   **`sources`**: `Array<string>`
    An array of source identifiers from which this article information was extracted. Must contain at least one source.
*   **`relatedArticles`**: `Array<string>`
    An array of document IDs for articles that are related to this one. Defaults to an empty array.
*   **`referencedBy`**: `Array<string>`
    An array of document IDs for articles that reference this one. Defaults to an empty array.

[Source 1]

## Examples

The following example demonstrates how to use `ExtractionPlanSchema` to parse and validate a raw object, such as one received from an LLM API call.

```typescript
import { ExtractionPlanSchema } from 'yaaf';

// Example raw output from an LLM extractor
const rawLlmOutput = {
  articles: [
    {
      canonicalTitle: "Agent Memory",
      entityType: "concept",
      action: "create",
      docIdSuggestion: "concepts/agent-memory",
      confidence: 0.9,
      sources: ["source-doc-1.md"],
      relatedArticles: ["concepts/agent-architecture"],
      referencedBy: [],
    },
    {
      canonicalTitle: "Agent",
      entityType: "class",
      action: "update",
      confidence: 0.75,
      sources: ["source-doc-1.md", "source-doc-2.ts"],
      // relatedArticles is missing, but will default to []
    }
  ]
};

try {
  // Use .parse() to validate and get a typed object
  const validatedPlan = ExtractionPlanSchema.parse(rawLlmOutput);
  
  console.log("Validation successful!");
  console.log(validatedPlan.articles[1].relatedArticles); // Output: []
} catch (error) {
  // Zod throws an error if validation fails
  console.error("Validation failed:", error);
}
```

## Sources

[Source 1] `src/knowledge/compiler/schemas.ts`