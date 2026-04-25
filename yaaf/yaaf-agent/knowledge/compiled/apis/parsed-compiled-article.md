---
title: ParsedCompiledArticle
entity_type: api
summary: Represents a knowledge base article after it has been parsed and compiled, ready for linting.
export_name: ParsedCompiledArticle
source_file: src/knowledge/compiler/linter/reader.ts
category: type
search_terms:
 - parsed article type
 - compiled knowledge base article
 - frontmatter and body structure
 - linter input format
 - how to read compiled articles
 - article data structure
 - docId property
 - filePath property
 - frontmatter property
 - body property
 - knowledge base linter
 - article parsing result
 - in-memory article representation
stub: false
compiled_at: 2026-04-24T17:27:09.221Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/reader.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `ParsedCompiledArticle` type defines the in-[Memory](../concepts/memory.md) structure for a knowledge base article that has been read from the file system and parsed into its constituent parts. It serves as a standardized data format for various stages of the knowledge base compilation and [Linting](../concepts/linting.md) process [Source 2].

This type separates an article's metadata ([Frontmatter](../concepts/frontmatter.md)) from its content (body), while also retaining file system location information. Functions like `readCompiledArticles` produce an array of `ParsedCompiledArticle` objects, which are then consumed by [Linter](../concepts/linter.md) rules and other processing steps [Source 2].

## Signature

`ParsedCompiledArticle` is a TypeScript object type with the following properties [Source 2]:

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

### Properties

- **`docId`**: `string`
  A unique identifier for the document, derived from its relative path within the knowledge base, excluding the `.md` file extension. For example, a file at `concepts/attention-mechanism.md` would have a `docId` of `"concepts/attention-mechanism"` [Source 2].

- **`filePath`**: `string`
  The absolute path to the compiled markdown file on the file system [Source 2].

- **`frontmatter`**: `Record<string, unknown>`
  An object containing the key-value pairs parsed from the YAML frontmatter block at the beginning of the article file [Source 2].

- **`body`**: `string`
  The raw markdown content of the article that appears after the frontmatter block [Source 2].

## Examples

Below is an example of a compiled markdown file and the corresponding `ParsedCompiledArticle` object that would be generated after parsing it.

### Sample File Content

Consider a file located at `/path/to/project/compiled/api/agent.md`:

```markdown
---
title: "Agent"
entity_type: "api"
category: "class"
---

The `Agent` class is the core of YAAF.
```

### Resulting Object

[when](./when.md) processed by a function like `parseCompiledArticle`, the file content above would result in the following object:

```typescript
import type { ParsedCompiledArticle } from 'yaaf';

const parsedArticle: ParsedCompiledArticle = {
  docId: 'api/agent',
  filePath: '/path/to/project/compiled/api/agent.md',
  frontmatter: {
    title: 'Agent',
    entity_type: 'api',
    category: 'class',
  },
  body: '\n\nThe `Agent` class is the core of YAAF.',
};
```

## See Also

- The `readCompiledArticles` function, which reads multiple files from a directory and returns an array of `ParsedCompiledArticle` objects.
- The `parseCompiledArticle` function, which parses the raw string content of a single file into a `ParsedCompiledArticle`.

## Sources

[Source 1]: src/knowledge/compiler/linter/index.ts
[Source 2]: src/knowledge/compiler/linter/reader.ts