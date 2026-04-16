---
summary: A strategy for managing large documents by splitting them into smaller, navigable parts to stay within token limits.
title: Article Segmentation
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:26:17.116Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/postprocess.ts
confidence: 0.9
---

---
title: Article Segmentation
entity_type: concept
summary: A strategy for managing large documents by splitting them into smaller, navigable parts to stay within token limits.
related_subsystems:
  - Knowledge Compiler

## What It Is
Article Segmentation is a compile-time transformation in the YAAF knowledge compiler pipeline. It is designed to manage document size by automatically partitioning articles that exceed a defined token budget into a series of smaller, interconnected sub-articles. 

This process ensures that synthesized content remains within the processing limits of LLMs and other downstream tools, preventing context window overflow while maintaining the logical flow of the information through navigation headers.

## How It Works in YAAF
Segmentation is applied during the post-synthesis phase, occurring after the LLM has authored the content but before the linter runs. The mechanism is implemented in the `segmentOversizedArticles` function within the knowledge compiler's post-processing module.

### Splitting Logic
The compiler scans compiled articles and evaluates their size using a token estimation utility. If an article's token count exceeds the `tokenBudget`, the compiler identifies H2 (`##`) section boundaries as the points for segmentation. 

### Navigation and Structure
When an article is split, the compiler generates a sequence of files and injects navigation links to maintain continuity:

*   **Part 1 (`docId.md`)**: Contains the initial sections and a link to the next part (e.g., `[Next: Section Name →](docId-part-2.md)`).
*   **Intermediate Parts (`docId-part-N.md`)**: Contain middle sections with links to both the previous and next parts (e.g., `[← Previous](docId-part-N-1.md)` and `[Next →](docId-part-N+1.md)`).
*   **Final Part (`docId-part-Max.md`)**: Contains the remaining sections and a link back to the previous part.

## Configuration
Developers can control the segmentation behavior through the `PostProcessOptions` passed to the compiler. The default token budget is 15,000 tokens.

```typescript
export type PostProcessOptions = {
  /** Token budget per article. Default: 15000 */
  tokenBudget?: number
  /** Whether to resolve wikilinks. Default: true */
  resolveLinks?: boolean
  /** Whether to segment oversized articles. Default: true */
  segmentArticles?: boolean
}
```

The segmentation process can be toggled via the `segmentArticles` boolean, and the threshold can be adjusted using the `tokenBudget` property.

## Sources
* `src/knowledge/compiler/postprocess.ts`---