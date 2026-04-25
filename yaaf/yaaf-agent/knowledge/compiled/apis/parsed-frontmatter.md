---
summary: Interface defining the structure of parsed frontmatter and the remaining markdown body.
export_name: ParsedFrontmatter
source_file: src/knowledge/utils/frontmatter.ts
category: interface
title: ParsedFrontmatter
entity_type: api
search_terms:
 - YAML frontmatter parsing
 - markdown metadata structure
 - frontmatter and body separation
 - parseFrontmatter return type
 - knowledge base document structure
 - how to access parsed YAML
 - markdown body content
 - document metadata interface
 - YAML block result
 - structured markdown data
 - key-value pairs from markdown
stub: false
compiled_at: 2026-04-24T17:27:12.094Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/utils/frontmatter.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `Parsed[[[[[[[[Frontmatter]]]]]]]]` interface defines the shape of the object returned [when](./when.md) a markdown document containing a YAML Frontmatter block is parsed. It provides a standardized structure that separates the parsed metadata (the frontmatter) from the main content of the document (the body).

This interface is primarily used as the return type for the `parseFrontmatter` utility function, which is the central implementation for handling YAML frontmatter across various YAAF subsystems like the [Ingester](./ingester.md), synthesizer, and [Linter](../concepts/linter.md) [Source 1].

## Signature

```typescript
export interface ParsedFrontmatter {
  frontmatter: Record<string, unknown>;
  body: string;
}
```

## Properties

### `frontmatter`

- **Type:** `Record<string, unknown>`

Parsed key-value pairs from the YAML frontmatter block. The value can be any valid YAML structure, including nested objects, arrays, strings, numbers, and booleans [Source 1].

### `body`

- **Type:** `string`

The remaining markdown content of the document that appears after the closing `---` of the frontmatter block. If no frontmatter block is found in the source document, this property will contain the entire original markdown string [Source 1].

## Examples

The following example demonstrates the structure of a `ParsedFrontmatter` object returned by the `parseFrontmatter` function.

```typescript
import { parseFrontmatter, ParsedFrontmatter } from 'yaaf';

const markdownWithFrontmatter = `---
title: "My Document"
tags:
  - "example"
  - "typescript"
draft: false
---

# Document Title

This is the main body of the document.
`;

const result: ParsedFrontmatter = parseFrontmatter(markdownWithFrontmatter);

console.log(result.frontmatter);
// Output:
// {
//   title: 'My Document',
//   tags: [ 'example', 'typescript' ],
//   draft: false
// }

console.log(result.body);
// Output:
// '\n# Document Title\n\nThis is the main body of the document.\n'
```

## See Also

- `parseFrontmatter`: The utility function that parses a markdown string and returns a `ParsedFrontmatter` object.

## Sources

[Source 1]: src/knowledge/utils/frontmatter.ts