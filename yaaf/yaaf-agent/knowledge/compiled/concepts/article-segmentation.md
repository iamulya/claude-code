---
summary: The compile-time process of splitting oversized knowledge base articles into smaller, linked sub-articles to manage token budgets.
title: Article Segmentation
entity_type: concept
related_subsystems:
 - Knowledge Compiler
search_terms:
 - splitting large articles
 - how to handle long documents
 - token budget management
 - article chunking
 - knowledge base token limits
 - oversized article processing
 - automatic document splitting
 - H2 section splitting
 - sub-article creation
 - knowledge base compilation
 - post-synthesis processing
 - managing large markdown files
stub: false
compiled_at: 2026-04-24T17:52:03.300Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/postprocess.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Article Segmentation is a compile-time transformation within the YAAF [Knowledge Compiler](../subsystems/knowledge-compiler.md) that automatically splits large articles into smaller, more manageable sub-articles [Source 1]. This process is applied after an article has been synthesized by an [LLM](./llm.md) and before it undergoes [Linting](./linting.md) [Source 1]. The primary purpose of segmentation is to ensure that every article in the knowledge base adheres to a predefined [Token Budget](./token-budget.md), preventing issues with [Context Window](./context-window.md) limits in downstream applications [Source 1].

## How It Works in YAAF

The segmentation process is handled by the `segmentOversizedArticles` function, which is part of the `postProcessCompiledArticles` pipeline [Source 1].

[when](../apis/when.md) this step runs, it scans each compiled article and estimates its token count. If an article's token count exceeds the configured `tokenBudget`, the framework splits the article into multiple parts [Source 1]. The splits occur at the boundaries of H2 (`##`) markdown sections [Source 1].

Each resulting part is saved as a separate file, and navigation links are automatically inserted to connect them sequentially [Source 1]:

*   The original article (`docId.md`) becomes the first part and has a link to the next part: `[Next: Section Name →](docId-part-2.md)`.
*   Intermediate parts (e.g., `docId-part-2.md`) receive links to both the previous and next parts: `[← Previous](docId.md)` and `[Next →](docId-part-3.md)`.
*   The final part (e.g., `docId-part-N.md`) receives a link to the previous part: `[← Previous](docId-part-N-1.md)`.

This creates a browsable, multi-page document from a single oversized source article, ensuring all final artifacts respect token limits [Source 1].

## Configuration

Article Segmentation can be configured or disabled via the `PostProcessOptions` object passed to the knowledge compiler [Source 1].

*   **`segmentArticles`**: A boolean that enables or disables the entire feature. It defaults to `true` [Source 1].
*   **`tokenBudget`**: A number that sets the maximum token count for a single article file. Articles exceeding this budget will be segmented. The default value is 15,000 tokens [Source 1].

```typescript
// Example: Configuring post-processing options
import { postProcessCompiledArticles } from "./postprocess.js";

const options: PostProcessOptions = {
  // Disable segmentation entirely
  segmentArticles: false,

  // Or, customize the token budget
  tokenBudget: 8000, // Split articles larger than 8000 tokens
};

// This would be called by the compiler
// await postProcessCompiledArticles(compiledDir, registry, options);
```

## Sources

[Source 1]: src/knowledge/compiler/postprocess.ts