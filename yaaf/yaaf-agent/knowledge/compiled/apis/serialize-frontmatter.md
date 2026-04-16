---
export_name: serializeFrontmatter
source_file: src/knowledge/compiler/synthesizer/frontmatter.ts
category: function
summary: Serializes a frontmatter object to a YAML block between delimiters.
title: serializeFrontmatter
entity_type: api
stub: false
compiled_at: 2026-04-16T14:26:20.547Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/frontmatter.ts
confidence: 0.95
---

## Overview
`serializeFrontmatter` is a utility function used by the YAAF knowledge compiler to convert a JavaScript object into a YAML-formatted frontmatter block. It is primarily used during the synthesis phase to prepare compiled articles for writing to the file system.

The function wraps the resulting YAML string in standard `---` delimiters. It is designed to handle common frontmatter data types including strings, numbers, booleans, arrays, null values, and shallow objects. It does not support advanced YAML features such as deeply nested objects or anchors, as these are not required for the framework's ontology schema.

## Signature / Constructor
```typescript
export function serializeFrontmatter(fields: Record<string, unknown>): string
```

### Parameters
*   `fields`: A `Record<string, unknown>` containing the key-value pairs to be serialized.

### Returns
A string containing the serialized YAML block enclosed in `---` delimiters.

## Examples
### Basic Usage
This example demonstrates serializing a standard set of frontmatter fields for a knowledge base article.

```typescript
import { serializeFrontmatter } from 'yaaf/knowledge/compiler/synthesizer/frontmatter';

const metadata = {
  title: "Agent Architecture",
  entity_type: "concept",
  tags: ["core", "runtime"],
  confidence: 0.95,
  is_stub: false
};

const frontmatterBlock = serializeFrontmatter(metadata);

/*
Output:
---
title: Agent Architecture
entity_type: concept
tags:
  - core
  - runtime
confidence: 0.95
is_stub: false
---
*/
```

## See Also
*   `validateFrontmatter`
*   `buildCompleteFrontmatter`