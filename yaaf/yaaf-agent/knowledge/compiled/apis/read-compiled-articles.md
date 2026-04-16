---
title: readCompiledArticles
entity_type: api
summary: Reads all compiled markdown articles referenced by the registry from the disk and returns normalized parsed objects.
export_name: readCompiledArticles
source_file: src/knowledge/compiler/linter/reader.ts
category: function
stub: false
compiled_at: 2026-04-16T14:25:31.860Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/linter/reader.ts
confidence: 0.95
---

## Overview
`readCompiledArticles` is a utility function used within the YAAF knowledge compiler's linting subsystem. It serves as the primary I/O interface for the linter, responsible for loading compiled markdown files from the filesystem based on entries defined in a `ConceptRegistry`. 

The function performs three main tasks:
1. Locates files on disk using the provided registry and base directory.
2. Parses the YAML frontmatter and separates it from the markdown body.
3. Returns a normalized `ParsedCompiledArticle` array for use in pure linting rules.

If an article referenced in the registry cannot be read (e.g., due to missing files or permission issues), the function skips the entry and can optionally trigger a callback to report the failure.

## Signature / Constructor

```typescript
export async function readCompiledArticles(
  registry: ConceptRegistry,
  compiledDir: string,
  onSkip?: (docId: string, reason: string) => void,
): Promise<ParsedCompiledArticle[]>
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `registry` | `ConceptRegistry` | The ontology registry containing the list of expected articles. |
| `compiledDir` | `string` | The absolute path to the directory where compiled markdown files are stored. |
| `onSkip` | `(docId: string, reason: string) => void` | (Optional) A callback invoked when an article cannot be read or parsed. |

### Return Type
The function returns a `Promise` that resolves to an array of `ParsedCompiledArticle` objects:

```typescript
export type ParsedCompiledArticle = {
  /** Relative docId (no .md extension), e.g. "concepts/attention-mechanism" */
  docId: string
  /** Absolute path to the compiled file */
  filePath: string
  /** Parsed frontmatter key-value pairs */
  frontmatter: Record<string, unknown>
  /** Markdown body after the frontmatter block */
  body: string
}
```

## Examples

### Basic Usage
This example demonstrates reading compiled articles from a distribution folder and logging the titles found in their frontmatter.

```typescript
import { readCompiledArticles } from 'yaaf/knowledge/compiler/linter/reader';

async function loadArticles(registry, distPath) {
  const articles = await readCompiledArticles(
    registry,
    distPath,
    (docId, reason) => {
      console.error(`Failed to load ${docId}: ${reason}`);
    }
  );

  for (const article of articles) {
    console.log(`Loaded: ${article.docId}`);
    console.log(`Title: ${article.frontmatter.title}`);
  }
}
```

## See Also
- `parseCompiledArticle`: The underlying synchronous parser used to process individual file contents.