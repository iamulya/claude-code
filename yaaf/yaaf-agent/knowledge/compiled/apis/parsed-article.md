---
title: ParsedArticle
entity_type: api
summary: Represents a knowledge base article after parsing, separating its YAML frontmatter from its Markdown body.
export_name: ParsedArticle
source_file: src/knowledge/compiler/synthesizer/types.ts
category: type
search_terms:
 - parse markdown frontmatter
 - extract YAML from markdown
 - separate frontmatter and body
 - knowledge base article structure
 - article parsing result
 - frontmatter object
 - markdown content
 - raw article text
 - YAML header parsing
 - document parsing type
 - synthesizer types
stub: false
compiled_at: 2026-04-24T17:26:59.518Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/types.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ParsedArticle` type is a data structure that represents a Markdown file after it has been parsed by the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md). It separates the file's content into three distinct parts: the structured YAML [Frontmatter](../concepts/frontmatter.md), the Markdown body, and the original raw text.

This separation is a common pattern in systems that process text files with embedded metadata. It allows different parts of the compiler to work with the structured data (e.g., for validation, routing, or indexing) and the unstructured content independently.

## Signature

`ParsedArticle` is a TypeScript type alias.

```typescript
export type ParsedArticle = {
  /** YAML frontmatter as key-value pairs */
  frontmatter: Record<string, unknown>;
  /** Markdown body (everything after the frontmatter block) */
  body: string;
  /** Full raw markdown (frontmatter + body) */
  raw: string;
};
```

## Properties

| Property      | Type                     | Description                                                  |
|---------------|--------------------------|--------------------------------------------------------------|
| `frontmatter` | `Record<string, unknown>` | An object containing the key-value pairs from the YAML frontmatter block. |
| `body`        | `string`                 | The Markdown content of the article, which is everything following the frontmatter block. |
| `raw`         | `string`                 | The complete, unmodified content of the original file, including both the frontmatter and the body. |

## Examples

If a parser processes the following raw Markdown string:

```markdown
---
title: "Agent"
entity_type: "concept"
summary: "An autonomous entity that perceives its environment and acts upon it."
---

## Overview

An **agent** is a fundamental concept in artificial intelligence.
```

The resulting `ParsedArticle` object would look like this:

```typescript
const parsedArticle: ParsedArticle = {
  frontmatter: {
    title: "Agent",
    entity_type: "concept",
    summary: "An autonomous entity that perceives its environment and acts upon it."
  },
  body: "\n## Overview\n\nAn **agent** is a fundamental concept in artificial intelligence.",
  raw: '---\ntitle: "Agent"\nentity_type: "concept"\nsummary: "An autonomous entity that perceives its environment and acts upon it."\n---\n\n## Overview\n\nAn **agent** is a fundamental concept in artificial intelligence.'
};
```

## Sources

[Source 1] src/knowledge/compiler/synthesizer/index.ts
[Source 2] src/knowledge/compiler/synthesizer/types.ts