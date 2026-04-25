---
summary: Builds a citation index by scanning the frontmatter of all compiled articles.
export_name: buildCitationIndex
source_file: src/knowledge/compiler/citationIndex.ts
category: function
title: buildCitationIndex
entity_type: api
search_terms:
 - reverse citation index
 - source to article mapping
 - article to source mapping
 - find which articles cite a source
 - find sources for an article
 - knowledge base compilation
 - compiled_from frontmatter
 - content contamination analysis
 - find related articles by source
 - knowledge base index
 - generate citation map
 - track content provenance
 - content lineage
stub: false
compiled_at: 2026-04-24T16:52:44.419Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/citationIndex.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `build[[[[[[[[CitationIndex]]]]]]]]` function constructs a [Reverse Citation Index](../concepts/reverse-citation-index.md) by scanning all compiled articles within a specified directory [Source 1]. It reads the `compiled_from` field from each article's [Frontmatter](../concepts/frontmatter.md) to build a bidirectional mapping between source files and the articles generated from them [Source 1].

This index is a core component of the knowledge base compilation process, enabling operators to understand content provenance and dependencies. It can answer questions such as:
- "Which articles cite this source file?"
- "Which source files were used to create this article?"
- "Which source files are most influential (i.e., contribute to the most articles)?"

The function returns a `CitationIndex` object containing these mappings and other metadata. The operation involves a single scan of all compiled articles, and it can be integrated into a larger post-compilation or [Linting](../concepts/linting.md) process [Source 1].

## Signature

The function takes the path to the directory containing compiled articles and returns a promise that resolves to a `CitationIndex` object.

```typescript
export async function buildCitationIndex(compiledDir: string): Promise<CitationIndex>;
```

### `CitationIndex` Type

The `CitationIndex` object returned by the function has the following structure [Source 1]:

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

The following example demonstrates how to generate a citation index from a directory of compiled markdown articles.

Assume the following directory structure and file contents:

```
.
└── .kb/
    └── compiled/
        ├── agent-architecture.md
        └── tool-usage.md
```

**`.kb/compiled/agent-architecture.md`:**
```markdown
---
title: Agent Architecture
compiled_from:
  - sources/core/agent.ts
  - sources/concepts/state-machine.txt
---
The agent architecture is based on a state machine...
```

**`.kb/compiled/tool-usage.md`:**
```markdown
---
title: Tool Usage
compiled_from:
  - sources/core/agent.ts
  - sources/tools/calculator.ts
---
Agents can use tools to interact with external systems...
```

**Usage:**

```typescript
import { buildCitationIndex } from 'yaaf';
import * as path from 'path';

async function generateIndex() {
  const compiledDir = path.join(process.cwd(), '.kb', 'compiled');

  try {
    const index = await buildCitationIndex(compiledDir);

    console.log('Source to Articles Mapping:');
    console.log(index.sourceToArticles);
    // {
    //   'sources/core/agent.ts': ['agent-architecture.md', 'tool-usage.md'],
    //   'sources/concepts/state-machine.txt': ['agent-architecture.md'],
    //   'sources/tools/calculator.ts': ['tool-usage.md']
    // }

    console.log('\nArticle to Sources Mapping:');
    console.log(index.articleToSources);
    // {
    //   'agent-architecture.md': ['sources/core/agent.ts', 'sources/concepts/state-machine.txt'],
    //   'tool-usage.md': ['sources/core/agent.ts', 'sources/tools/calculator.ts']
    // }

    console.log(`\nIndex generated at: ${index.generatedAt}`);
    console.log(`Total articles: ${index.totalArticles}`); // 2
    console.log(`Total sources: ${index.totalSources}`);   // 3

  } catch (error) {
    console.error('Failed to build citation index:', error);
  }
}

generateIndex();
```

## See Also

- `writeCitationIndex`: A utility to build and persist the index to a file.
- `loadCitationIndex`: A utility to load a previously persisted index from a file.
- `articlesAffectedBySource`: A function to query the index to find articles contaminated by an unreliable source.
- `articlesWithSharedSources`: A function to query the index for articles that share common sources.

## Sources

[Source 1]: src/knowledge/compiler/CitationIndex.ts