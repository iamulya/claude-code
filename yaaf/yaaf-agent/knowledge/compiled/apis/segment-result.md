---
summary: The result type returned by the article segmentation process, detailing the outcome of splitting oversized articles.
export_name: SegmentResult
source_file: src/knowledge/compiler/postprocess.ts
category: type
title: SegmentResult
entity_type: api
search_terms:
 - split large articles
 - article token limit
 - knowledge base segmentation
 - oversized document handling
 - post-processing results
 - how to manage large documents
 - compiler output
 - segmentation statistics
 - article splitting
 - knowledge compiler post-process
 - document chunking
 - report on split files
stub: false
compiled_at: 2026-04-25T00:13:29.006Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/postprocess.ts
compiled_from_quality: unknown
confidence: 0.85
---

## Overview

`SegmentResult` is a TypeScript type that represents the outcome of the article segmentation process within the [Knowledge Compiler](../subsystems/knowledge-compiler.md). This process, executed by the [segmentOversizedArticles](./segment-oversized-articles.md) function, identifies and splits compiled articles that exceed a predefined token budget.

The `SegmentResult` object provides a summary of this operation, typically including statistics such as the number of articles scanned, the number of articles that were split, and the total number of new article segments created.

This result is a key component of the larger [PostProcessResult](./post-process-result.md) object, which aggregates the outcomes of all post-synthesis processing steps performed by the [Knowledge Compiler](../subsystems/knowledge-compiler.md) before linting.

## Signature

The provided source material uses the `SegmentResult` type as the return value for the [segmentOversizedArticles](./segment-oversized-articles.md) function and as a property within the [PostProcessResult](./post-process-result.md) type, but it does not include its specific type definition. It serves as a data structure for reporting segmentation statistics.

```typescript
// The specific fields of SegmentResult are not defined in the provided source.
// It is used in the following contexts:

// As the return type for segmentOversizedArticles:
export async function segmentOversizedArticles(
  compiledDir: string,
  tokenBudget?: number,
): Promise<SegmentResult>;

// As a property within PostProcessResult:
export type PostProcessResult = {
  // ... other properties
  segmentation: SegmentResult | null;
  // ... other properties
};
```

## Examples

The following example illustrates how `SegmentResult` is accessed within a [PostProcessResult](./post-process-result.md) object to report on the outcome of the segmentation process.

```typescript
import type { PostProcessResult, SegmentResult } from 'yaaf';

function logSegmentationOutcome(result: PostProcessResult) {
  if (result.segmentation) {
    // The exact fields of SegmentResult are not defined in the source,
    // but would likely include statistics like these for reporting.
    const stats = result.segmentation as any; // Using 'any' for illustrative purposes

    if (stats.articlesSplit > 0) {
      console.log(`[Segmentation] Split ${stats.articlesSplit} oversized articles.`);
      console.log(`[Segmentation] Created ${stats.newSegmentsCreated} new article segments.`);
    } else {
      console.log('[Segmentation] No oversized articles found to split.');
    }
  } else {
    console.log('[Segmentation] Process was not run.');
  }
}

// Example PostProcessResult object
const exampleResult: PostProcessResult = {
  wikilinks: { resolved: 42, unresolved: 3 },
  segmentation: {
    articlesScanned: 150,
    articlesSplit: 2,
    newSegmentsCreated: 5,
  },
  wikilinkDeps: { /* ... */ },
  unresolvedDocIds: ['doc-c', 'doc-d'],
};

logSegmentationOutcome(exampleResult);
// Expected Output:
// [Segmentation] Split 2 oversized articles.
// [Segmentation] Created 5 new article segments.
```

## See Also

*   [segmentOversizedArticles](./segment-oversized-articles.md): The function that performs article segmentation and returns a `SegmentResult`.
*   [PostProcessResult](./post-process-result.md): The composite result type that includes `SegmentResult`.
*   [Knowledge Compiler](../subsystems/knowledge-compiler.md): The subsystem responsible for post-processing compiled articles.