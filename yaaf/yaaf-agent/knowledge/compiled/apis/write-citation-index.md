---
summary: Builds and persists the citation index to a file.
export_name: writeCitationIndex
source_file: src/knowledge/compiler/citationIndex.ts
category: function
title: writeCitationIndex
entity_type: api
search_terms:
 - persist citation index
 - save knowledge base index
 - create .kb-citation-index.json
 - how to build citation map
 - source to article mapping
 - article to source mapping
 - knowledge base compilation
 - find source file citations
 - track article sources
 - generate citation data
 - knowledge base metadata
 - compile step for KB
stub: false
compiled_at: 2026-04-24T17:50:01.772Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/citationIndex.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `write[[[[[[[[CitationIndex]]]]]]]]` function is a utility used during the knowledge base compilation process. It first builds a citation index by scanning the [Frontmatter](../concepts/frontmatter.md) of all compiled articles, and then persists this index to a file named `.kb-citation-index.json` in the specified knowledge base directory [Source 1].

This function serves as a convenient wrapper around `buildCitationIndex`, combining the generation and file-writing steps into a single asynchronous operation. The resulting index file provides a bidirectional mapping between source files and the articles compiled from them, enabling offline analysis and tooling [Source 1]. This is useful for answering questions such as "Which articles cite this source?" or "Which sources were used to create this article?" without needing to re-scan the entire knowledge base [Source 1].

## Signature

The function is an `async` function that takes two directory paths and returns a `Promise` which resolves to the generated `CitationIndex` object [Source 1].

```typescript
export async function writeCitationIndex(
  kbDir: string,
  compiledDir: string,
): Promise<CitationIndex>;
```

**Parameters:**

*   `kbDir` (string): The path to the root directory of the knowledge base. The output file `.kb-citation-index.json` will be written here.
*   `compiledDir` (string): The path to the directory containing the compiled articles whose frontmatter will be scanned to build the index.

**Returns:**

*   `Promise<CitationIndex>`: A promise that resolves with the `CitationIndex` object after it has been successfully written to the file system.

The resolved `CitationIndex` object has the following structure [Source 1]:

```typescript
export type CitationIndex = {
  /** Source file path → articles that were compiled from it */
  sourceToArticles: Record<string, string[]>;
  /** Article docId → source files it was compiled from */
  articleToSources: Record<string, string[]>;
  /** Top sources ordered by article count (descending) */
  topSources: Array<{ source: string; articleCount: number }>;
  /** ISO timestamp when this index was generated */
  generatedAt: string;
  /** Total number of unique source files referenced */
  totalSources: number;
  /** Total number of compiled articles indexed */
  totalArticles: number;
};
```

## Examples

The following example demonstrates how to use `writeCitationIndex` as part of a build script to generate and save the citation index for a knowledge base.

```typescript
import { writeCitationIndex } from 'yaaf/knowledge'; // Fictional import path
import { join } from 'path';

const knowledgeBaseDir = './my-knowledge-base';
const compiledArticlesDir = join(knowledgeBaseDir, 'compiled');

async function updateCitationIndex() {
  try {
    console.log('Generating and writing citation index...');
    const index = await writeCitationIndex(knowledgeBaseDir, compiledArticlesDir);
    console.log(`Citation index successfully written to .kb-citation-index.json`);
    console.log(`Indexed ${index.totalArticles} articles from ${index.totalSources} sources.`);
    console.log(`Index generated at: ${index.generatedAt}`);
  } catch (error) {
    console.error('Failed to write citation index:', error);
  }
}

updateCitationIndex();
```

## See Also

*   `buildCitationIndex`: The underlying function that scans articles and constructs the index in [Memory](../concepts/memory.md).
*   `loadCitationIndex`: A function to load a previously persisted citation index from `.kb-citation-index.json`.
*   `articlesAffectedBySource`: A utility function that uses the index to find articles impacted by a specific source.
*   `CitationIndex`: The type definition for the index object.

## Sources

[Source 1]: src/knowledge/compiler/CitationIndex.ts