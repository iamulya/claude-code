---
summary: Asynchronously reads all compiled articles referenced by a given ConceptRegistry from a specified directory.
export_name: readCompiledArticles
source_file: src/knowledge/compiler/linter/reader.ts
category: function
title: readCompiledArticles
entity_type: api
search_terms:
 - load compiled knowledge
 - read markdown files
 - parse frontmatter from articles
 - knowledge base reader
 - ConceptRegistry loader
 - how to read compiled articles
 - bulk read markdown
 - article parsing utility
 - knowledge linter helper
 - compiled directory reader
 - skip unreadable files
 - load articles from disk
stub: false
compiled_at: 2026-04-24T17:31:48.268Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/linter/reader.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `readCompiledArticles` function is a utility used within the knowledge compilation and [Linting](../concepts/linting.md) subsystem. Its primary purpose is to read a collection of compiled markdown files from the filesystem, parse their [Frontmatter](../concepts/frontmatter.md) and body content, and return them as an array of structured objects [Source 1].

This function operates by taking a `ConceptRegistry`, which contains references to all known articles, and a path to the directory where the compiled markdown files are stored. It iterates through the articles in the registry, constructs the expected file path for each, and attempts to read and parse the file.

A key feature of this function is its resilient error handling. If an article file cannot be read (due to being deleted, incorrect permissions, or other filesystem errors), it will be skipped instead of throwing an error that would halt the entire process. An optional `onSkip` callback can be provided to log these occurrences or handle them as needed [Source 1].

## Signature

The function is asynchronous and returns a `Promise` that resolves to an array of `ParsedCompiledArticle` objects.

```typescript
export async function readCompiledArticles(
  registry: ConceptRegistry,
  compiledDir: string,
  onSkip?: (docId: string, reason: string) => void,
): Promise<ParsedCompiledArticle[]>;
```

### Parameters

-   `registry`: An instance of `ConceptRegistry` containing the metadata for all articles to be read.
-   `compiledDir`: A string representing the absolute or relative path to the directory containing the compiled `.md` files.
-   `onSkip` (optional): A callback function that is invoked [when](./when.md) an article fails to be read. It receives the `docId` of the skipped article and a string describing the reason for the failure.

### Return Type

The function returns a `Promise<ParsedCompiledArticle[]>`. The `ParsedCompiledArticle` type is defined as follows [Source 1]:

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

The following example demonstrates how to use `readCompiledArticles` to load all articles from a `dist/kb` directory, logging any articles that could not be found.

Assume the following directory structure:

```
/path/to/project/
└── dist/
    └── kb/
        ├── api/
        │   └── Agent.md
        └── concepts/
            └── Tool.md
```

And the content of `dist/kb/api/Agent.md` is:

```markdown
---
title: Agent
entity_type: api
---

This is the body of the Agent article.
```

The usage would be as follows:

```typescript
import { readCompiledArticles } from 'yaaf/knowledge';
import type { ConceptRegistry } from 'yaaf/knowledge';

// A mock ConceptRegistry for demonstration purposes.
// In a real application, this would be built by the knowledge compiler.
const mockRegistry: ConceptRegistry = {
  has: (docId: string) => ['api/Agent', 'concepts/Tool', 'guides/non-existent'].includes(docId),
  allDocIds: () => ['api/Agent', 'concepts/Tool', 'guides/non-existent'],
  // ... other ConceptRegistry methods
};

const compiledKnowledgeDir = '/path/to/project/dist/kb';

async function loadArticles() {
  const skippedArticles: string[] = [];

  const articles = await readCompiledArticles(
    mockRegistry,
    compiledKnowledgeDir,
    (docId, reason) => {
      console.warn(`Skipped article '${docId}': ${reason}`);
      skippedArticles.push(docId);
    }
  );

  console.log('Successfully loaded articles:', articles.length);
  // Expected output: Successfully loaded articles: 2

  console.log('Skipped articles:', skippedArticles);
  // Expected output: Skipped articles: ['guides/non-existent']

  const agentArticle = articles.find(a => a.docId === 'api/Agent');
  if (agentArticle) {
    console.log('Agent Article Frontmatter:', agentArticle.frontmatter);
    // Expected output: Agent Article Frontmatter: { title: 'Agent', entity_type: 'api' }
  }
}

loadArticles();
```

## Sources

[Source 1]: src/knowledge/compiler/[Linter](../concepts/linter.md)/reader.ts