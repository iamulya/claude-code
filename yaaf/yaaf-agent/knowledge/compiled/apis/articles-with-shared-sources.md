---
summary: Finds articles that share common source files with a specified article.
export_name: articlesWithSharedSources
source_file: src/knowledge/compiler/citationIndex.ts
category: function
title: articlesWithSharedSources
entity_type: api
search_terms:
 - find related articles
 - content discovery by source
 - shared source analysis
 - detect content overlap
 - knowledge base consistency
 - contradiction chain detection
 - which articles use the same source
 - find similar documents
 - citation analysis
 - related content by citation
 - document similarity by source
 - common source files
stub: false
compiled_at: 2026-04-24T16:50:25.643Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/citationIndex.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `articlesWithSharedSources` function is a utility for analyzing the relationships between articles in the knowledge base based on their underlying source files [Source 1]. Given a `CitationIndex` and the ID of a specific article (`docId`), this function identifies all other articles that were compiled from one or more of the same source files.

This is primarily used for content [Discovery](../concepts/discovery.md) and maintaining knowledge base integrity. Its main applications include finding related content for cross-linking and detecting "potential contradiction chains," where multiple articles derived from the same source might present conflicting information [Source 1].

## Signature

The function takes a `CitationIndex` object and a `docId` string as arguments. It returns an array of objects, where each object represents an article that shares at least one source with the specified `docId` [Source 1].

```typescript
import type { CitationIndex } from './CitationIndex';

export function articlesWithSharedSources(
  index: CitationIndex,
  docId: string
): Array<{
  // The exact structure of the returned objects is not specified
  // in the source, but would likely include the docId of the
  // related article and information about the shared sources.
}>;
```

### Parameters

-   `index` (`CitationIndex`): A pre-built citation index containing the mappings between source files and articles.
-   `docId` (`string`): The unique identifier of the article for which to find related content.

### Returns

-   `Array<object>`: An array of objects, each representing an article that shares common sources. The source material does not specify the exact shape of these objects [Source 1].

## Examples

The following example demonstrates how to use `articlesWithSharedSources` to find articles related to `AgentLifeCycle`.

```typescript
import { articlesWithSharedSources } from 'yaaf/knowledge';
import type { CitationIndex } from 'yaaf/knowledge';

// Assume a CitationIndex has been loaded or built.
const CitationIndex: CitationIndex = {
  sourceToArticles: {
    'src/agent.ts': ['AgentLifeCycle', 'AgentExecution'],
    'src/runtime.ts': ['AgentLifeCycle', 'RuntimeEvents'],
    'src/plugins.ts': ['PluginSystem', 'RuntimeEvents'],
  },
  articleToSources: {
    AgentLifeCycle: ['src/agent.ts', 'src/runtime.ts'],
    AgentExecution: ['src/agent.ts'],
    RuntimeEvents: ['src/runtime.ts', 'src/plugins.ts'],
    PluginSystem: ['src/plugins.ts'],
  },
  topSources: [],
  generatedAt: new Date().toISOString(),
  totalSources: 3,
  totalArticles: 4,
};

// Find articles that share sources with 'AgentLifeCycle'
const relatedArticles = articlesWithSharedSources([[CitationIndex]], 'AgentLifeCycle');

/*
  Expected output (structure is illustrative):
  [
    { docId: 'AgentExecution', sharedSources: ['src/agent.ts'], sharedCount: 1 },
    { docId: 'RuntimeEvents', sharedSources: ['src/runtime.ts'], sharedCount: 1 }
  ]
*/
```
In this example, `AgentExecution` is identified because it shares `src/agent.ts` with `AgentLifeCycle`. `RuntimeEvents` is identified because it shares `src/runtime.ts`.

## See Also

-   `buildCitationIndex`: Function to create a `CitationIndex` from compiled articles.
-   `loadCitationIndex`: Function to load a persisted `CitationIndex` from disk.
-   `articlesAffectedBySource`: Function to find all articles compiled from a specific source file.
-   `CitationIndex`: The type definition for the index object used by this function.

## Sources

[Source 1]: src/knowledge/compiler/[CitationIndex](./citation-index.md).ts