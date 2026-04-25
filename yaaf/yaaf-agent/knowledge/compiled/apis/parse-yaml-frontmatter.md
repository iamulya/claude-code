---
summary: Parses a raw YAML string into a key-value record, intended for use when the frontmatter block has already been extracted.
export_name: parseYamlFrontmatter
source_file: src/knowledge/utils/frontmatter.ts
category: function
title: parseYamlFrontmatter
entity_type: api
search_terms:
 - parse YAML block
 - convert YAML string to object
 - frontmatter parsing utility
 - YAML to JSON
 - knowledge base metadata
 - markdown metadata parsing
 - how to parse frontmatter
 - YAML library wrapper
 - spec-compliant YAML parser
 - handle YAML without body
 - shared YAML utility
stub: false
compiled_at: 2026-04-24T17:26:50.605Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/utils/frontmatter.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `parseYaml[[[[[[[[Frontmatter]]]]]]]]` function is a utility that parses a string containing only YAML content into a JavaScript object (`Record<string, unknown>`) [Source 1]. It is designed for scenarios where a YAML Frontmatter block has already been isolated from a larger document, such as a Markdown file.

This function serves as a centralized, spec-compliant parser within the YAAF framework, utilizing the `yaml` library. It was created to replace several previous, hand-rolled parsers that had limitations in handling complex YAML features like block scalars, escape sequences, and quote-aware splitting [Source 1].

Specifically, `parseYamlFrontmatter` is the shared replacement for the following older implementations [Source 1]:
- `parseFrontmatterYaml()` in `synthesizer/frontmatter.ts`
- `parseSimpleYaml()` in `linter/reader.ts`
- An inline parser in `store.ts`

For parsing a full Markdown document and extracting the frontmatter in a single step, see the related `parseFrontmatter` function.

## Signature

The function takes a single string argument containing the YAML to be parsed and returns a record of key-value pairs.

```typescript
export function parseYamlFrontmatter(yamlBlock: string): Record<string, unknown>;
```

**Parameters:**

- `yamlBlock` (`string`): A string containing the raw YAML content, without the `---` delimiters.

**Returns:**

- `Record<string, unknown>`: A JavaScript object representing the parsed YAML structure.

## Examples

The following example demonstrates how to parse a multi-line YAML string into a JavaScript object.

```typescript
import { parseYamlFrontmatter } from 'yaaf';

const yamlContent = `
title: "Agent Architecture"
version: 1.2
tags:
  - agents
  - framework
  - typescript
author:
  name: "YAAF Team"
`;

const parsedData = parseYamlFrontmatter(yamlContent);

console.log(parsedData.title);
// Expected output: "Agent Architecture"

console.log(parsedData.tags);
// Expected output: [ 'agents', 'framework', 'typescript' ]

console.log(parsedData.author);
// Expected output: { name: 'YAAF Team' }
```

## See Also

- `parseFrontmatter`: A related function that extracts and parses the YAML frontmatter from a full Markdown document string.

## Sources

[Source 1]: src/knowledge/utils/frontmatter.ts