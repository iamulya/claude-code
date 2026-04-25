---
summary: Defines the structure for a bidirectional mapping between source files and compiled knowledge base articles.
export_name: CitationIndex
source_file: src/knowledge/compiler/citationIndex.ts
category: type
title: CitationIndex
entity_type: api
search_terms:
 - knowledge base source tracking
 - article to source mapping
 - source to article mapping
 - find articles from a source file
 - find sources for an article
 - bidirectional citation mapping
 - knowledge compilation index
 - compiled_from frontmatter
 - detect contaminated articles
 - find related articles by source
 - top contributing sources
 - .kb-citation-index.json
stub: false
compiled_at: 2026-04-24T16:55:06.619Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/citationIndex.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `CitationIndex` type defines the data structure for a [Reverse Citation Index](../concepts/reverse-citation-index.md) within the YAAF knowledge base subsystem. This index creates a bidirectional mapping between the raw source files and the final compiled articles [Source 1].

It is generated during the knowledge base compilation process by scanning the `compiled_from` [Frontmatter](../concepts/frontmatter.md) field of each article. The resulting index is persisted to a file named `.kb-citation-index.json` in the knowledge base directory, allowing for offline querying and analysis [Source 1].

The primary purpose of the `CitationIndex` is to enable operators to answer key questions about data lineage and impact, such as [Source 1]:
- Which articles were generated from a specific source file?
- Which source files contributed to a specific article?
- Which source files are the most influential (i.e., contribute to the most articles)?
- If a source is found to be unreliable, which articles are potentially "contaminated" by its information?

## Signature

`CitationIndex` is a TypeScript type alias with the following structure [Source 1]:

```typescript
export type CitationIndex = {
  /** 
   * A mapping from a source file path to an array of article docIds 
   * that were compiled from it.
   */
  sourceToArticles: Record<string, string[]>;

  /** 
   * A mapping from an article docId to an array of source file paths 
   * it was compiled from.
   */
  articleToSources: Record<string, string[]>;

  /** 
   * An array of source files, ordered in descending order by the number 
   * of articles they contribute to.
   */
  topSources: Array<{ source: string; articleCount: number }>;

  /** 
   * The ISO 8601 timestamp indicating when the index was generated.
   */
  generatedAt: string;

  /** 
   * The total count of unique source files referenced in the index.
   */
  totalSources: number;

  /** 
   * The total count of compiled articles included in the index.
   */
  totalArticles: number;
};
```

## Related Functions

While `CitationIndex` is a data type, several exported functions operate on or produce this structure [Source 1]:

- `buildCitationIndex(compiledDir: string): Promise<CitationIndex>`: Scans all compiled articles in a directory to build a new citation index in [Memory](../concepts/memory.md).
- `writeCitationIndex(kbDir: string, compiledDir: string): Promise<CitationIndex>`: Builds and persists the citation index to `.kb-citation-index.json`.
- `loadCitationIndex(kbDir: string): Promise<CitationIndex | null>`: Loads a previously persisted citation index from disk.
- `articlesAffectedBySource(index: CitationIndex, sourcePath: string): string[]`: Uses an index to find all articles that cite a specific source file.
- `articlesWithSharedSources(index: CitationIndex, docId: string): Array<{...}>`: Finds other articles that share common sources with a given article.

## Examples

Below is an example of the JSON structure of a persisted `.kb-citation-index.json` file, which conforms to the `CitationIndex` type.

```json
{
  "sourceToArticles": {
    "src/kb/sources/architecture.md": [
      "agent-lifecycle",
      "agent-constructor"
    ],
    "src/kb/sources/plugins.txt": [
      "plugin-api",
      "agent-lifecycle"
    ]
  },
  "articleToSources": {
    "agent-lifecycle": [
      "src/kb/sources/architecture.md",
      "src/kb/sources/plugins.txt"
    ],
    "agent-constructor": [
      "src/kb/sources/architecture.md"
    ],
    "plugin-api": [
      "src/kb/sources/plugins.txt"
    ]
  },
  "topSources": [
    { "source": "src/kb/sources/architecture.md", "articleCount": 2 },
    { "source": "src/kb/sources/plugins.txt", "articleCount": 2 }
  ],
  "generatedAt": "2024-05-21T15:45:10.123Z",
  "totalSources": 2,
  "totalArticles": 3
}
```

## Sources

[Source 1]: src/knowledge/compiler/citationIndex.ts