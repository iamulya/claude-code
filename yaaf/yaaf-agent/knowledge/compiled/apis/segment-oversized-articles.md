---
summary: Scans compiled articles and splits any that exceed the token budget at H2 section boundaries into linked sub-articles.
export_name: segmentOversizedArticles
source_file: src/knowledge/compiler/postprocess.ts
category: function
title: segmentOversizedArticles
entity_type: api
search_terms:
 - split large markdown files
 - article segmentation
 - token budget for articles
 - how to handle oversized documents
 - knowledge base chunking
 - split markdown by heading
 - H2 section splitting
 - long document processing
 - manage large knowledge base articles
 - sub-article creation
 - navigation links for split articles
 - post-processing knowledge base
stub: false
compiled_at: 2026-04-24T17:36:29.358Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/postprocess.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `segmentOversizedArticles` function is a post-synthesis processing step used by the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) [Source 1]. Its primary purpose is to scan all compiled markdown articles and split any that exceed a specified token limit into smaller, more manageable sub-articles [Source 1].

This process ensures that individual knowledge base articles remain within a [Token Budget](../concepts/token-budget.md) suitable for consumption by language models. The function splits articles at `##` (H2) section boundaries. Each resulting part is saved as a new file, and navigation links are automatically inserted to connect the parts sequentially, allowing users to move between them easily [Source 1].

This function is typically invoked as part of the broader `postProcessCompiledArticles` pipeline, which runs after the initial [LLM](../concepts/llm.md) authoring step and before the final [Linting](../concepts/linting.md) phase [Source 1].

## Signature

The function is asynchronous and returns a `Promise` that resolves with a `SegmentResult` object, which contains details about the articles that were split [Source 1].

```typescript
export async function segmentOversizedArticles(
  compiledDir: string,
  tokenBudget?: number,
): Promise<SegmentResult>;
```

### Parameters

| Name          | Type     | Description                                                                                             |
|---------------|----------|---------------------------------------------------------------------------------------------------------|
| `compiledDir` | `string` | The file path to the directory containing the compiled markdown articles to be scanned and processed [Source 1]. |
| `tokenBudget` | `number` | *(Optional)* The maximum number of tokens an article can have before it is split. Defaults to 15,000 [Source 1]. |

The `SegmentResult` type is not directly exported but is part of the `PostProcessResult` type, which summarizes the outcome of the segmentation process [Source 1].

## Examples

### Basic Usage

The following example demonstrates how to run the segmentation process on a directory of compiled articles with a custom token budget.

```typescript
import { segmentOversizedArticles } from 'yaaf/knowledge';
import path from 'path';

const compiledArticlesPath = path.resolve('./dist/kb/compiled');

async function processArticles() {
  try {
    const result = await segmentOversizedArticles(
      compiledArticlesPath,
      10000 // Set a custom token budget of 10,000
    );
    console.log('Segmentation complete:', result);
  } catch (error) {
    console.error('Failed to segment articles:', error);
  }
}

processArticles();
```

### Segmentation Behavior

Consider a large article file named `advanced-patterns.md` that exceeds the token budget.

**Before Segmentation:**

- `compiled/advanced-patterns.md` (one large file)

**After `segmentOversizedArticles` runs:**

The original file is split into multiple parts, and navigation links are added.

- `compiled/advanced-patterns.md` (Part 1)
  ```markdown
  ---
  title: Advanced Patterns
  ---
  # Advanced Patterns

  ## Pattern A
  ...content...

  [Next: Pattern B →](advanced-patterns-part-2.md)
  ```

- `compiled/advanced-patterns-part-2.md` (Part 2)
  ```markdown
  ---
  title: Advanced Patterns (Part 2)
  ---
  [← Previous](advanced-patterns.md) | [Next: Pattern C →](advanced-patterns-part-3.md)

  ## Pattern B
  ...content...
  ```

- `compiled/advanced-patterns-part-3.md` (Part 3)
  ```markdown
  ---
  title: Advanced Patterns (Part 3)
  ---
  [← Previous](advanced-patterns-part-2.md)

  ## Pattern C
  ...content...
  ```

## See Also

- `postProcessCompiledArticles`: The main function that orchestrates all post-processing steps, including segmentation.
- `resolveWikilinks`: Another post-processing function that runs alongside segmentation to resolve internal links.

## Sources

[Source 1]: src/knowledge/compiler/postprocess.ts