---
summary: Parses a raw markdown string of a compiled article into its frontmatter and body using a shared YAML parser.
export_name: parseCompiledArticle
source_file: src/knowledge/compiler/linter/reader.ts
category: function
title: parseCompiledArticle
entity_type: api
search_terms:
 - parse markdown frontmatter
 - extract YAML from markdown
 - read compiled knowledge base article
 - frontmatter parsing
 - split markdown body and metadata
 - knowledge base file reader
 - process compiled article string
 - YAML frontmatter utility
 - how to read article metadata
 - docId and file path handling
 - article compilation pipeline
stub: false
compiled_at: 2026-04-24T17:26:09.035Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/reader.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `parseCompiledArticle` function is a utility for parsing the raw string content of a compiled knowledge base article. It separates the YAML [Frontmatter](../concepts/frontmatter.md) block from the markdown body, returning a structured object containing the parsed data [Source 1].

This function is typically used within the YAAF knowledge base compilation and [Linting](../concepts/linting.md) process. It takes the document's identifier (`docId`), its absolute file path, and its raw content as input. It relies on a shared internal utility (`utils/frontmatter.ts`) to handle the YAML parsing, ensuring consistent behavior across the framework [Source 1].

## Signature

The function takes a `docId`, `filePath`, and the raw markdown `string` as arguments and returns a `ParsedCompiledArticle` object [Source 1].

```typescript
export function parseCompiledArticle(
  docId: string,
  filePath: string,
  raw: string,
): ParsedCompiledArticle;
```

### Return Type: `ParsedCompiledArticle`

The function returns an object with the following structure [Source 1]:

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

- **`docId`**: The relative identifier for the document, without the `.md` file extension.
- **`filePath`**: The absolute path to the source file on the filesystem.
- **`frontmatter`**: An object containing the key-value pairs parsed from the YAML frontmatter block.
- **`body`**: A string containing the markdown content of the article that follows the frontmatter block.

## Examples

### Basic Usage

Here is an example of parsing a raw article string into its components.

```typescript
import { parseCompiledArticle } from 'yaaf';

const rawArticleContent = `---
title: Agent Architecture
entity_type: concept
---

An agent is a system that...
`;

const docId = 'concepts/agent-architecture';
const filePath = '/path/to/compiled/concepts/agent-architecture.md';

const parsedArticle = parseCompiledArticle(docId, filePath, rawArticleContent);

console.log(parsedArticle);
/*
Output:
{
  docId: 'concepts/agent-architecture',
  filePath: '/path/to/compiled/concepts/agent-architecture.md',
  frontmatter: {
    title: 'Agent Architecture',
    entity_type: 'concept'
  },
  body: '\nAn agent is a system that...\n'
}
*/
```

## See Also

- The `readCompiledArticles` function, which reads multiple compiled articles from a directory and uses `parseCompiledArticle` internally.

## Sources

[Source 1]: src/knowledge/compiler/[Linter](../concepts/linter.md)/reader.ts