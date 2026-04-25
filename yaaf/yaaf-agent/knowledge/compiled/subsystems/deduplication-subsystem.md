---
summary: Manages the semantic deduplication of article plans within the YAAF knowledge compilation pipeline.
primary_files:
 - src/knowledge/compiler/dedup.ts
title: Deduplication Subsystem
entity_type: subsystem
exports:
 - deduplicatePlans
 - DedupResult
search_terms:
 - semantic deduplication
 - merge duplicate articles
 - prevent redundant LLM calls
 - Jaccard similarity for text
 - Union-Find algorithm for merging
 - transitive duplicate detection
 - source path overlap
 - knowledge compilation optimization
 - article plan merging
 - P4-1 post-extraction merging
 - avoid duplicate content generation
 - how to combine similar topics
stub: false
compiled_at: 2026-04-24T18:12:04.643Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/dedup.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The Deduplication Subsystem is a component of the YAAF knowledge compilation pipeline responsible for identifying and merging near-duplicate article plans [Source 1]. It operates after the extraction phase and before the synthesis phase, serving as a "Post-Extraction Plan Merging" step [Source 1].

Its primary purpose is to prevent inefficiencies and content quality issues by addressing three key problems [Source 1]:
1.  **Redundant [LLM](../concepts/llm.md) Calls**: Avoids sending near-identical topics to the synthesis stage, saving computational resources.
2.  **Duplicate Content**: Prevents the final knowledge base from containing multiple articles on the same topic with slightly different titles.
3.  **Source Fragmentation**: Consolidates source material that has been split across similar but distinct article plans.

## Architecture

The subsystem determines similarity between article plans using a combination of three "zero-cost" heuristics that do not require an LLM [Source 1]:
1.  **Title Similarity**: [Jaccard Similarity](../concepts/jaccard-similarity.md) calculated on the tokenized, lowercased titles of two plans.
2.  **Source Overlap**: The ratio of shared source file paths between two plans.
3.  **Description Similarity**: Jaccard similarity on the description text, which helps identify conceptually identical plans with different titles (e.g., "BERT Architecture" and "Bidirectional Encoder Representations") [Source 1].

Initially, the subsystem used a greedy O(n²) algorithm for merging. This was later replaced by a [Union-Find Algorithm](../concepts/union-find-algorithm.md) to correctly handle transitive duplicates. The greedy approach could fail to merge a full set of related articles (e.g., A is similar to B, and B is similar to C, but A is not similar to C), whereas Union-Find builds a graph of all similar pairs and identifies entire connected components for merging [Source 1].

Within each identified component of duplicate plans, one plan is chosen as the "survivor". The selection is deterministic, with the plan having the lexicographically smallest `docId` being chosen to absorb the others [Source 1].

## Integration Points

The Deduplication Subsystem is an intermediary step in the knowledge compilation process. It receives an array of `ArticlePlan` objects from the extraction subsystem. After processing, it outputs a deduplicated list of `ArticlePlan` objects (`merged`) which are then passed to the synthesis subsystem for content generation. It also outputs a list of plans that were removed and absorbed into survivors (`removed`) for tracking purposes [Source 1].

## Key APIs

The primary API surface for this subsystem consists of one function and one interface [Source 1]:

*   **`deduplicatePlans(plans: ArticlePlan[], threshold?: number): DedupResult`**: The main function that orchestrates the deduplication process. It takes an array of article plans and an optional similarity threshold, returning a `DedupResult` object.
*   **`DedupResult`**: An interface representing the output of the deduplication process. It contains two properties:
    *   `merged`: An array of the surviving `ArticlePlan` objects.
    *   `removed`: An array of objects detailing which plans were removed, which survivor they were merged into, and the calculated similarity score.

## Configuration

The behavior of the subsystem can be configured via the `threshold` parameter of the `deduplicatePlans` function. This number, which defaults to 0.7, represents the minimum combined similarity score required for two article plans to be considered duplicates and merged [Source 1].

## Sources

[Source 1]: src/knowledge/compiler/dedup.ts