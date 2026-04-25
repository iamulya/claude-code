---
title: serializeFrontmatter
entity_type: api
summary: Serializes a frontmatter object into a YAML string block.
export_name: serializeFrontmatter
source_file: src/knowledge/compiler/synthesizer/frontmatter.ts
category: function
search_terms:
 - convert object to YAML
 - YAML serialization
 - frontmatter generation
 - create YAML block
 - write frontmatter to string
 - knowledge base compiler
 - article synthesizer
 - format frontmatter
 - YAML stringify
 - "--- delimiters"
 - markdown frontmatter
 - object to yaml string
stub: false
compiled_at: 2026-04-24T17:37:03.425Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/frontmatter.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `serialize[[[[[[[[Frontmatter]]]]]]]]` function converts a JavaScript object into a YAML string block, suitable for use as Frontmatter in a markdown file [Source 1]. It is a utility function within the YAAF [Knowledge Compiler](../subsystems/knowledge-compiler.md)'s Synthesizer subsystem, used to generate the final frontmatter for compiled knowledge base articles [Source 1].

This function is designed to handle simple data structures commonly found in frontmatter, including strings, numbers, booleans, arrays, null values, and simple objects. It explicitly does not support more complex YAML features like deeply nested objects or anchors, as they are not required for its intended purpose [Source 1]. The output string is automatically enclosed between `---` delimiters, making it a complete and ready-to-use frontmatter block [Source 1].

## Signature

```typescript
export function serializeFrontmatter(fields: Record<string, unknown>): string;
```

### Parameters

-   **`fields`**: `Record<string, unknown>`
    -   An object representing the key-value pairs of the frontmatter to be serialized.

### Returns

-   **`string`**
    -   A string containing the YAML representation of the `fields` object, enclosed in `---` delimiters.

## Examples

### Basic Serialization

This example demonstrates serializing a typical frontmatter object into a YAML string.

```typescript
import { serializeFrontmatter } from 'yaaf';

const frontmatterData = {
  title: "My Article",
  entity_type: "concept",
  relevance: 95,
  is_public: true,
  tags: ["tag1", "tag2"],
  author: null,
};

const yamlBlock = serializeFrontmatter(frontmatterData);

console.log(yamlBlock);
/*
Outputs:
---
title: "My Article"
entity_type: "concept"
relevance: 95
is_public: true
tags:
  - "tag1"
  - "tag2"
author: null
---
*/
```

## See Also

-   `validateFrontmatter`: A related function for validating frontmatter against an [Ontology](../concepts/ontology.md) schema.
-   `buildCompleteFrontmatter`: A function that merges [LLM](../concepts/llm.md)-generated, suggested, and compiler-injected data to create the final frontmatter object before serialization.

## Sources

[Source 1] src/knowledge/compiler/synthesizer/frontmatter.ts