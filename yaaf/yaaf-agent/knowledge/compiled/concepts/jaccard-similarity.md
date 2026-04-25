---
summary: A statistical measure used in YAAF's deduplication subsystem to quantify the similarity between two sets of tokens or items.
title: Jaccard Similarity
entity_type: concept
related_subsystems:
 - Knowledge Compiler
search_terms:
 - Jaccard index
 - similarity coefficient
 - token set similarity
 - how to measure text similarity
 - deduplication algorithm
 - near-duplicate detection
 - set overlap measure
 - title similarity check
 - description similarity
 - semantic deduplication heuristic
 - what is jaccard similarity
 - YAAF deduplication
stub: false
compiled_at: 2026-04-24T17:56:22.090Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/dedup.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Jaccard Similarity, also known as the Jaccard index, is a statistic used for gauging the similarity and diversity of finite sample sets. It is defined as the size of the intersection divided by the size of the union of the two sets.

In YAAF, Jaccard Similarity is a core heuristic used within the [Knowledge Compiler](../subsystems/knowledge-compiler.md)'s [Semantic Deduplication](./semantic-deduplication.md) stage [Source 1]. It provides a "zero-cost" method—meaning it does not require an [LLM](./llm.md) call—to measure the textual overlap between different article plans. This helps solve the problem of near-duplicate content by identifying and merging similar article plans before the expensive synthesis step. This prevents redundant LLM Calls, the creation of duplicate articles with slightly different titles, and the fragmentation of source material across multiple articles [Source 1].

## How It Works in YAAF

The `deduplicatePlans` function in the Knowledge Compiler's deduplication module employs Jaccard Similarity as one of its primary signals for detecting near-duplicates [Source 1]. It is applied in two specific ways:

1.  **Title Similarity**: The titles of two article plans are lowercased, tokenized (split into words), and then compared using Jaccard similarity. This effectively measures the percentage of shared words between the titles.
2.  **Description Similarity**: The same process is applied to the description text of the article plans. This signal is crucial for identifying plans that describe the same concept but use completely different titles. For example, it can detect the similarity between "BERT Architecture" and "Bidirectional Encoder Representations" by finding shared tokens like "pre-trained," "language," and "model" in their respective descriptions [Source 1].

The Jaccard similarity scores for both title and description are combined with a source path overlap ratio to produce a final similarity score. If this combined score exceeds a configurable threshold, the two article plans are considered duplicates and are merged by a [Union-Find Algorithm](./union-find-algorithm.md) [Source 1].

## Configuration

The sensitivity of the deduplication process can be adjusted via the `threshold` parameter in the `deduplicatePlans` function. This value represents the minimum combined similarity score required to merge two article plans [Source 1].

```typescript
// Source: src/knowledge/compiler/dedup.ts [Source 1]

/**
 * Detect and merge near-duplicate article plans using title similarity
 * and source path overlap.
 *
 * @param plans - Article plans from the extractor
 * @param threshold - Minimum combined similarity to merge (default: 0.7)
 * @returns Deduplicated plans and a record of merges
 */
export function deduplicatePlans(
  plans: ArticlePlan[],
  threshold: number = DEFAULT_DEDUP_THRESHOLD,
): DedupResult { /* ... */ }
```

## Sources

[Source 1]: src/knowledge/compiler/dedup.ts