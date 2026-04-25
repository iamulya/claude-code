---
summary: Splits a markdown document into YAML frontmatter and body, parsing the frontmatter block with a spec-compliant YAML library.
export_name: parseFrontmatter
source_file: src/knowledge/utils/frontmatter.ts
category: function
title: parseFrontmatter
entity_type: api
search_terms:
 - parse markdown frontmatter
 - extract YAML from markdown
 - frontmatter parser
 - markdown metadata
 - YAML parsing
 - split markdown body
 - handle block scalars
 - CRLF normalization
 - spec-compliant YAML
 - Obsidian export parsing
 - prototype pollution prevention
 - knowledge base ingestion
 - read document metadata
 - markdown pre-processing
stub: false
compiled_at: 2026-04-24T17:26:17.539Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/utils/frontmatter.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `parse[[[[[[[[Frontmatter]]]]]]]]` function is a utility for splitting a markdown document string into its YAML Frontmatter and the main body content [Source 1]. It uses a spec-compliant YAML library to parse the frontmatter, ensuring robust and accurate handling of the YAML 1.2 standard [Source 1].

This function was created to consolidate several ad-hoc frontmatter parsers within the YAAF codebase into a single, reliable implementation. It addresses common parsing issues such as bugs with block scalars, incorrect escape sequence handling, and complexities with quote-aware splitting [Source 1].

Key features handled by the parser include [Source 1]:
- Normalization of Windows-style line endings (CRLF).
- Correct parsing of block scalars (`|`, `>`).
- Full support for YAML 1.2 escape sequences.
- Handling of flow mappings, anchors, aliases, and nested structures.
- Prevention of prototype pollution by creating objects with `Object.create(null)`.

If the input string does not contain a YAML frontmatter block (i.e., it does not start with `---`), the function returns an object with an empty `frontmatter` property and the entire original string as the `body` [Source 1].

## Signature

The function takes a single string argument and returns an object conforming to the `ParsedFrontmatter` interface.

```typescript
export function parseFrontmatter(markdown: string): ParsedFrontmatter;
```

### Parameters

- `markdown` (`string`): The raw markdown string, which may or may not contain a YAML frontmatter block.

### Return Value

The function returns a `ParsedFrontmatter` object with the following structure [Source 1]:

```typescript
export interface ParsedFrontmatter {
  /** Parsed key-value pairs (may contain nested objects, arrays, etc.) */
  frontmatter: Record<string, unknown>;
  /** Markdown body after the closing `---` */
  body: string;
}
```

## Examples

### Basic Usage with Frontmatter

This example shows how to parse a document that contains a standard YAML frontmatter block.

```typescript
import { parseFrontmatter } from 'yaaf';

const markdownWithFrontmatter = `---
title: "My Document"
tags:
  - one
  - two
draft: false
---

# Document Title

This is the main content of the document.
`;

const result = parseFrontmatter(markdownWithFrontmatter);

console.log(result.frontmatter);
// Expected output:
// {
//   title: 'My Document',
//   tags: [ 'one', 'two' ],
//   draft: false
// }

console.log(result.body);
// Expected output:
//
// # Document Title
//
// This is the main content of the document.
//
```

### Document Without Frontmatter

If the input string does not have a frontmatter block, the `frontmatter` object will be empty and the `body` will contain the entire original string.

```typescript
import { parseFrontmatter } from 'yaaf';

const markdownWithoutFrontmatter = `# Just a Title

This document has no frontmatter.
`;

const result = parseFrontmatter(markdownWithoutFrontmatter);

console.log(result.frontmatter);
// Expected output: {}

console.log(result.body);
// Expected output:
// # Just a Title
//
// This document has no frontmatter.
//
```

## See Also

- `parseYamlFrontmatter`: A related utility function for parsing a raw YAML string that has already been extracted from a document [Source 1].

## Sources

[Source 1]: src/knowledge/utils/frontmatter.ts