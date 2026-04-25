---
summary: A heuristic used in YAAF's semantic deduplication process to measure the similarity between article plans based on their shared source files.
title: Source Path Overlap Ratio
entity_type: concept
related_subsystems:
 - knowledge_compiler
see_also:
 - concept:Semantic Deduplication
 - concept:Jaccard Similarity
 - concept:Union-Find Algorithm
search_terms:
 - semantic deduplication heuristic
 - how to detect duplicate articles
 - article plan merging
 - shared source file similarity
 - preventing redundant LLM calls
 - source file overlap
 - knowledge base compilation optimization
 - deduplication signals
 - zero-cost similarity metric
 - transitive duplicate detection
 - Union-Find for deduplication
 - provenance-based similarity
stub: false
compiled_at: 2026-04-25T00:24:34.242Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/dedup.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

The Source Path Overlap Ratio is a zero-cost heuristic used within YAAF's [Semantic Deduplication](./semantic-deduplication.md) process to measure the similarity between two `ArticlePlan` objects [Source 1]. It quantifies the degree to which two prospective articles share the same underlying source material by comparing their lists of source file paths.

This metric serves as a key signal for identifying near-duplicate article plans before they are sent for synthesis. By detecting plans that draw from the same sources, the framework can prevent redundant [LLM calls](./llm-call.md), avoid creating duplicate compiled articles, and prevent the fragmentation of source material across multiple, similar articles [Source 1].

## How It Works in YAAF

The Source Path Overlap Ratio is one of three heuristics employed by the `deduplicatePlans` function in the knowledge base compiler. It works in concert with [Jaccard Similarity](./jaccard-similarity.md) calculations on article titles and descriptions to form a combined similarity score [Source 1].

The process is as follows:
1.  For any pair of `ArticlePlan` objects, the compiler calculates the overlap of their source file paths.
2.  This ratio is combined with the title and description similarity scores.
3.  The total similarity score is compared against a configurable threshold.
4.  If the score exceeds the threshold, the two plans are considered potential duplicates.
5.  A [Union-Find Algorithm](./union-find-algorithm.md) is then used to group all pairs that exceed the threshold into connected components. This ensures that transitive duplicates (e.g., A is similar to B, and B is similar to C) are all merged into a single surviving plan, even if A and C do not directly meet the similarity threshold [Source 1].

This approach provides a computationally inexpensive (zero-cost) method for identifying semantic duplicates based on content provenance, complementing text-based similarity measures [Source 1].

## Configuration

The overall sensitivity of the deduplication process, which includes the Source Path Overlap Ratio as a component, is controlled by a `threshold` parameter passed to the `deduplicatePlans` function.

```typescript
// Source: src/knowledge/compiler/dedup.ts [Source 1]

export function deduplicatePlans(
  plans: ArticlePlan[],
  threshold: number = DEFAULT_DEDUP_THRESHOLD,
): DedupResult { /* ... */ }
```

A higher threshold makes the deduplication less aggressive, requiring a stronger similarity signal to merge two plans. The default value is `DEFAULT_DEDUP_THRESHOLD` [Source 1].

## See Also

-   [Semantic Deduplication](./semantic-deduplication.md): The broader process that uses this heuristic.
-   [Jaccard Similarity](./jaccard-similarity.md): Another heuristic used alongside source path overlap for title and description comparison.
-   [Union-Find Algorithm](./union-find-algorithm.md): The algorithm used to merge duplicate plans based on similarity scores.

## Sources

[Source 1] src/knowledge/compiler/dedup.ts