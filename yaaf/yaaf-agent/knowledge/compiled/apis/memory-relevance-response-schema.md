---
summary: A Zod schema that defines the expected JSON structure for the LLM response in the MemoryRelevanceEngine.
export_name: MemoryRelevanceResponseSchema
source_file: src/schemas.js
category: const
title: MemoryRelevanceResponseSchema
entity_type: api
search_terms:
 - memory relevance schema
 - LLM response validation
 - relevance engine output format
 - parsing relevant memories
 - Zod schema for memory selection
 - how to structure LLM JSON output
 - MemoryRelevanceEngine response
 - safeParseJson usage
 - validate memory list from LLM
 - memory selection JSON structure
 - schema for relevant files
stub: false
compiled_at: 2026-04-25T00:09:43.747Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/relevance.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`MemoryRelevanceResponseSchema` is a Zod schema used to validate the structure of the JSON response from a large language model (LLM) within the [MemoryRelevanceEngine](./memory-relevance-engine.md).

The [MemoryRelevanceEngine](./memory-relevance-engine.md) queries an LLM to identify a small subset of memory files that are most relevant to a user's current query. The LLM is prompted to return its selection in a JSON format. `MemoryRelevanceResponseSchema` ensures that the LLM's output conforms to the expected structure before it is processed further. This schema is typically used in conjunction with the [safeParseJson](./safe-parse-json.md) utility to safely parse and validate the raw string response from the model.

## Signature

The exact Zod schema definition is not detailed in the provided source material [Source 1]. However, based on its usage within the [MemoryRelevanceEngine](./memory-relevance-engine.md), it is designed to validate a JSON object that contains a list of relevant memory filenames. The expected structure is an object containing a key (e.g., `relevant_memories`) whose value is an array of strings.

```typescript
// Inferred structure based on usage
import { z } from 'zod';

export const MemoryRelevanceResponseSchema = z.object({
  // The key might be different, but the structure is an array of strings.
  relevant_memories: z.array(z.string()),
});

export type MemoryRelevanceResponse = z.infer<typeof MemoryRelevanceResponseSchema>;
```

## Examples

The primary use case is to parse the JSON output from an LLM call inside the [MemoryRelevanceEngine](./memory-relevance-engine.md).

```typescript
import { MemoryRelevanceResponseSchema, safeParseJson } from 'yaaf';

// Hypothetical raw string response from an LLM
const llmResponse = `{
  "analysis": "The user is asking about the build system. The most relevant memories are 'build-system-config.md' and 'ci-cd-setup.md'.",
  "relevant_memories": [
    "build-system-config.md",
    "ci-cd-setup.md"
  ]
}`;

// Use safeParseJson with the schema to validate and extract the data
const result = safeParseJson(llmResponse, MemoryRelevanceResponseSchema);

if (result.success) {
  console.log('Relevant memories found:', result.data.relevant_memories);
  // => Relevant memories found: [ 'build-system-config.md', 'ci-cd-setup.md' ]
} else {
  console.error('Failed to parse LLM response:', result.error);
  // This block would execute if the JSON is malformed or doesn't match the schema
}
```

## See Also

- [MemoryRelevanceEngine](./memory-relevance-engine.md): The engine that uses this schema to select relevant memories.
- [safeParseJson](./safe-parse-json.md): The utility function used to parse and validate JSON against this schema.
- [Relevance Engine](../concepts/relevance-engine.md): The high-level concept for selecting relevant context.

## Sources

[Source 1]: src/memory/relevance.ts