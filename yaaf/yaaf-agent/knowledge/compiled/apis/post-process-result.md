---
summary: Represents the outcome of the post-synthesis processing, including wikilink resolution statistics and segmentation results.
export_name: PostProcessResult
source_file: src/knowledge/compiler/postprocess.ts
category: type
title: PostProcessResult
entity_type: api
search_terms:
 - knowledge base compilation results
 - wikilink resolution stats
 - article segmentation outcome
 - post-synthesis processing report
 - dependency graph data
 - unresolved link tracking
 - differential manifest data
 - compiler output type
 - what does postProcessCompiledArticles return
 - wikilinkDeps property
 - unresolvedDocIds property
 - knowledge base build summary
stub: false
compiled_at: 2026-04-24T17:29:28.168Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/postprocess.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`PostProcessResult` is a TypeScript type that represents the aggregated outcome of the post-synthesis processing stage in the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) [Source 1]. This stage occurs after the [LLM](../concepts/llm.md) has authored the articles but before the [Linting](../concepts/linting.md) process begins [Source 1].

This object provides a summary of the transformations applied, including statistics on [Wikilink Resolution](../concepts/wikilink-resolution.md), the results of splitting oversized articles, and dependency information crucial for the differential build engine. It is the return type of the `postProcessCompiledArticles` function [Source 1].

## Signature

`PostProcessResult` is a type alias for an object with the following structure [Source 1]:

```typescript
export type PostProcessResult = {
  /**
   * Statistics on wikilink resolution.
   */
  Wikilinks: {
    resolved: number;
    unresolved: number;
  };

  /**
   * Results from the article segmentation process.
   * This is null if segmentation was disabled or no articles were split.
   */
  segmentation: SegmentResult | null;

  /**
   * Per-article wikilink dependency data for the differential manifest.
   * Maps each article's docId to the docIds it links to.
   */
  wikilinkDeps: Record<string, string[]>;

  /**
   * DocIds that still have unresolved Wikilinks after post-processing.
   * Used by the differential engine to target wikilink refreshes [[[[[[[[when]]]]]]]] the
   * vocabulary expands.
   */
  unresolvedDocIds: string[];
};
```

### Properties

*   **`[[Wikilinks]]`**: An object containing the total count of `resolved` and `unresolved` [Wikilinks](../concepts/wikilinks.md) across the entire knowledge base.
*   **`segmentation`**: The result of the `segmentOversizedArticles` process. It will be `null` if the segmentation step was skipped or if no articles exceeded the [Token Budget](../concepts/token-budget.md). The `SegmentResult` type contains details about which articles were split and the new files created.
*   **`wikilinkDeps`**: A dependency graph represented as a record. The keys are `docId`s of articles, and the values are arrays of `docId`s that the key article links to. This is used by the differential build system to determine which articles need to be re-processed when a dependency changes [Source 1].
*   **`unresolvedDocIds`**: An array of `docId`s for articles that contain one or more wikilinks that could not be resolved against the [Concept Registry](../subsystems/concept-registry.md). This list allows the differential build engine to efficiently re-run wikilink resolution on only the affected files when new concepts are added to the registry [Source 1].

## Examples

### Example `PostProcessResult` Object

Below is a hypothetical `PostProcessResult` object returned after processing a small knowledge base.

```typescript
const result: PostProcessResult = {
  wikilinks: {
    resolved: 125,
    unresolved: 3,
  },
  segmentation: {
    // Assuming SegmentResult has a shape like this
    splitCount: 1,
    originalFiles: ['advanced-patterns.md'],
    newFiles: ['advanced-patterns-part-2.md', 'advanced-patterns-part-3.md'],
  },
  wikilinkDeps: {
    'agent-class': ['agent-lifecycle', 'tool-definition'],
    'tool-definition': ['agent-class'],
    'advanced-patterns': ['agent-class', 'agent-lifecycle'],
    'advanced-patterns-part-2': ['tool-definition'],
    'advanced-patterns-part-3': [],
  },
  unresolvedDocIds: [
    'agent-class', // Contains an unresolved link, e.g., FutureConcept
  ],
};

console.log(`Resolved ${result.wikilinks.resolved} links.`);
console.log(`Found ${result.unresolvedDocIds.length} articles with unresolved links.`);
```

### Usage with `postProcessCompiledArticles`

The `PostProcessResult` is obtained by calling the main post-processing function.

```typescript
import { postProcessCompiledArticles, PostProcessResult } from 'yaaf/knowledge';
import { getRegistry } from './registry'; // Assume this function loads the ConceptRegistry

async function runPostProcessing() {
  const compiledDir = './compiled';
  const registry = await getRegistry();

  const result: PostProcessResult = await postProcessCompiledArticles(
    compiledDir,
    registry,
    {
      tokenBudget: 8192,
      resolveLinks: true,
      segmentArticles: true,
    }
  );

  console.log('Post-processing complete:', result);
}
```

## See Also

*   `postProcessCompiledArticles` (function)
*   `resolveWikilinks` (function)
*   `segmentOversizedArticles` (function)

## Sources

[Source 1] src/knowledge/compiler/postprocess.ts