---
summary: Splits articles exceeding the token budget into multiple linked parts at H2 boundaries.
export_name: segmentOversizedArticles
source_file: src/knowledge/compiler/postprocess.ts
category: function
title: segmentOversizedArticles
entity_type: api
stub: false
compiled_at: 2026-04-16T14:26:09.667Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/postprocess.ts
confidence: 1
---

## Overview
`segmentOversizedArticles` is a post-synthesis utility function used during the knowledge base compilation process. It ensures that generated articles remain within a manageable token limit for LLM processing and readability. 

The function scans a directory of compiled markdown files and identifies any that exceed the defined `tokenBudget`. When an oversized article is found, the function partitions it into multiple sub-articles, splitting the content at H2 (`##`) section boundaries. To maintain continuity, the function injects navigation links (Previous/Next) into the headers or footers of the resulting parts.

## Signature / Constructor

```typescript
export async function segmentOversizedArticles(
  compiledDir: string,
  tokenBudget: number = DEFAULT_ARTICLE_TOKEN_BUDGET,
): Promise<SegmentResult>
```

### Parameters
- `compiledDir`: The filesystem path to the directory containing the compiled markdown articles.
- `tokenBudget`: The maximum number of tokens allowed per article. If not specified, it defaults to `DEFAULT_ARTICLE_TOKEN_BUDGET` (typically 15,000 tokens).

### Return Value
Returns a `Promise<SegmentResult>` containing metadata about the segmentation process, such as which articles were split and how many parts were created.

## Methods & Properties

### Segmentation Logic
The function follows a specific naming and linking convention for segmented articles:
- **Part 1**: Retains the original filename (`docId.md`) and includes a link to the next part: `[Next: Section Name →](docId-part-2.md)`.
- **Intermediate Parts**: Named sequentially (e.g., `docId-part-2.md`) and include links to both the previous and next parts: `[← Previous](docId.md)` and `[Next →](docId-part-3.md)`.
- **Final Part**: Named `docId-part-N.md` and includes a link back to the previous part: `[← Previous](docId-part-N-1.md)`.

## Examples

### Basic Usage
This example demonstrates how to run the segmentation utility on a compiled directory with a custom token budget.

```typescript
import { segmentOversizedArticles } from 'yaaf/knowledge/compiler/postprocess';

async function optimizeKnowledgeBase() {
  const compiledPath = './dist/knowledge/compiled';
  const budget = 10000; // Set a strict 10k token limit

  const result = await segmentOversizedArticles(compiledPath, budget);
  
  console.log('Segmentation complete.');
}
```

### Integration in Post-Processing
`segmentOversizedArticles` is typically called as part of the broader post-processing pipeline.

```typescript
import { segmentOversizedArticles } from 'yaaf/knowledge/compiler/postprocess';

// Example of the internal logic applied during compilation
async function runPostProcess(dir: string) {
  // ... other steps like wikilink resolution ...
  
  const segmentationResult = await segmentOversizedArticles(dir, 15000);
  return segmentationResult;
}
```

## See Also
- `postProcessCompiledArticles`
- `resolveWikilinks`