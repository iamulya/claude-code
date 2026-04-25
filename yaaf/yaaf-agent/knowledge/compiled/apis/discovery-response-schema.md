---
summary: Zod schema for validating the response from a knowledge base discovery process, detailing missing articles or weak connections.
export_name: DiscoveryResponseSchema
source_file: src/knowledge/compiler/schemas.ts
category: const
title: DiscoveryResponseSchema
entity_type: api
search_terms:
 - knowledge base validation
 - KB discovery process
 - find missing articles
 - identify weak links in knowledge graph
 - knowledge graph analysis schema
 - discovery process output
 - schema for KB gaps
 - validate discovery results
 - missing knowledge entities
 - weakly connected nodes
 - Zod schema for KB discovery
 - compiler schemas
stub: false
compiled_at: 2026-04-24T17:02:41.762Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/schemas.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`[[[[[[[[Discovery]]]]]]]]ResponseSchema` is a Zod schema used within the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) subsystem to validate the output of a Discovery process [Source 1]. The discovery process analyzes the existing knowledge base to identify structural gaps, such as missing articles that are referenced by others, or weak connections where related articles are not linked.

This schema defines the expected structure for a discovery report, ensuring that any tool or [LLM](../concepts/llm.md)-powered process generating such a report adheres to a consistent contract. It specifically validates two key types of findings: `missingArticles` and `weakConnections` [Source 1].

## Signature

`DiscoveryResponseSchema` is a `z.ZodObject` instance. The following shows its definition and the inferred TypeScript type, `DiscoveryResponse`.

```typescript
import { z } from "zod";

export const DiscoveryResponseSchema = z.object({
  missingArticles: z.array(z.object({
    title: z.string().min(1),
    entityType: z.string().min(1),
    reason: z.string().min(1),
  })).default([]),
  weakConnections: z.array(z.object({
    fromDocId: z.string().min(1),
    toDocId: z.string().min(1),
    reason: z.string().min(1),
  })).default([]),
});

export type DiscoveryResponse = z.infer<typeof DiscoveryResponseSchema>;
```
[Source 1]

### Schema Fields

*   **`missingArticles`** `(Array<object>)`: An array of objects, where each object represents an article that is referenced or implied but does not exist in the knowledge base. Defaults to an empty array.
    *   `title` `(string)`: The expected title of the missing article.
    *   `entityType` `(string)`: The expected [Entity Type](../concepts/entity-type.md) (e.g., 'concept', 'api') of the missing article.
    *   `reason` `(string)`: An explanation of why this article is considered missing.

*   **`weakConnections`** `(Array<object>)`: An array of objects, where each object identifies a pair of existing articles that should be linked but are not. Defaults to an empty array.
    *   `fromDocId` `(string)`: The document ID of the source article.
    *   `toDocId` `(string)`: The document ID of the target article that should be linked.
    *   `reason` `(string)`: An explanation of why a link is recommended between these two articles.

## Examples

The following example demonstrates how to validate a discovery report object against the `DiscoveryResponseSchema`.

```typescript
import { DiscoveryResponseSchema } from 'yaaf';

// Example output from a knowledge base discovery tool
const discoveryOutput = {
  missingArticles: [
    {
      title: "Advanced Caching Strategies",
      entityType: "guide",
      reason: "The 'Performance Tuning' article references this guide, but it does not exist."
    }
  ],
  weakConnections: [
    {
      fromDocId: "concepts/agent-lifecycle",
      toDocId: "api/Agent",
      reason: "The 'Agent Lifecycle' concept article does not link to the main 'Agent' class API reference, which is a significant omission."
    }
  ]
};

try {
  // Validate the data against the schema
  const validatedResponse = DiscoveryResponseSchema.parse(discoveryOutput);
  console.log("Discovery response is valid:", validatedResponse);
} catch (error) {
  console.error("Validation failed:", error);
}
```

## Sources

[Source 1] src/knowledge/compiler/schemas.ts