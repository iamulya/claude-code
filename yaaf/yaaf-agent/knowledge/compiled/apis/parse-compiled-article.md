---
title: parseCompiledArticle
entity_type: api
summary: Parses a raw markdown string into a structured representation containing frontmatter and body content.
export_name: parseCompiledArticle
source_file: src/knowledge/compiler/linter/reader.ts
category: function
stub: false
compiled_at: 2026-04-16T14:25:37.841Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/reader.ts
confidence: 0.95
---

## Overview
`parseCompiledArticle` is a utility function used within the YAAF knowledge compiler and linter subsystems. Its primary purpose is to transform a raw markdown string—typically read from a compiled article file—into a structured `ParsedCompiledArticle` object. 

The function separates the YAML frontmatter block from the markdown body and parses the frontmatter into a key-value record. It is designed to maintain consistency across the framework by reusing the same minimal YAML parser employed during the knowledge synthesis phase. This ensures that the linter and the compiler interpret article metadata identically.

## Signature / Constructor

```typescript
export function parseCompiledArticle(
  docId: string,
  filePath: string,
  raw: string,
): ParsedCompiledArticle;
```

### Parameters
*   **docId**: `string` — The relative document identifier (e.g., `"concepts/attention-mechanism"`), typically excluding the `.md` extension.
*   **filePath**: `string` — The absolute filesystem path to the compiled file.
*   **raw**: `string` — The raw, unparsed content of the markdown file including the frontmatter delimiters.

### Return Type
The function returns a `ParsedCompiledArticle` object:

```typescript
export type ParsedCompiledArticle = {
  /** Relative docId (no .md extension), e.g. "concepts/attention-mechanism" */
  docId: string;
  /** Absolute path to the compiled file */
  filePath: string;
  /** Parsed frontmatter key-value pairs */
  frontmatter: Record<string, unknown>;
  /** Markdown body after the frontmatter block */
  body: string;
};
```

## Examples

### Basic Usage
This example demonstrates parsing a raw string into its constituent parts.

```typescript
import { parseCompiledArticle } from 'yaaf/knowledge/compiler/linter/reader';

const rawContent = `---
title: "Agent Framework"
entity_type: "concept"
---
# Agent Framework
YAAF is a TypeScript-first framework...`;

const result = parseCompiledArticle(
  "concepts/agent-framework",
  "/usr/src/app/knowledge/compiled/concepts/agent-framework.md",
  rawContent
);

console.log(result.frontmatter.title); // "Agent Framework"
console.log(result.body); // "# Agent Framework\nYAAF is a TypeScript-first framework..."
```

## See Also
*   `readCompiledArticles` — A function that utilizes `parseCompiledArticle` to process multiple files referenced in a registry.