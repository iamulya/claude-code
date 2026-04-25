---
summary: The process of identifying and merging near-duplicate content based on semantic similarity rather than exact matches, used in YAAF's knowledge compilation.
title: Semantic Deduplication
entity_type: concept
related_subsystems:
 - knowledge/compiler
search_terms:
 - near-duplicate detection
 - content merging
 - avoiding redundant LLM calls
 - knowledge compilation optimization
 - Jaccard similarity for text
 - Union-Find for deduplication
 - transitive duplicate merging
 - how to merge similar articles
 - prevent duplicate knowledge articles
 - source path overlap
 - title similarity
 - description similarity
 - P4-1 plan merging
stub: false
compiled_at: 2026-04-24T18:01:29.823Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/dedup.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

Semantic Deduplication is a process within YAAF's knowledge compilation pipeline that identifies and merges `ArticlePlan` objects that are semantically similar but not necessarily identical [Source 1]. It is a post-extraction step designed to consolidate near-duplicate topics before they are sent to an [LLM](./llm.md) for content synthesis.

This process solves several key problems [Source 1]:
1.  **Reduces Redundant LLM Calls**: By merging plans for near-identical topics, it prevents the framework from making multiple expensive LLM calls to generate slightly different versions of the same article.
2.  **Prevents Duplicate Content**: It ensures that the final compiled knowledge base does not contain multiple articles covering the same concept under different titles.
3.  **Consolidates Source Material**: It prevents the fragmentation of source material for a single topic across multiple, competing article plans.

## How It Works in YAAF

Semantic Deduplication is implemented in the `deduplicatePlans` function and operates entirely without the use of an LLM, relying on a set of zero-cost heuristics to calculate similarity between article plans [Source 1].

The process uses three signals to determine if two plans should be merged [Source 1]:
1.  **Title Similarity**: [Jaccard Similarity](./jaccard-similarity.md) is calculated on the tokenized, lowercased titles of the two plans.
2.  **Source Path Overlap**: The ratio of shared source file paths between the two plans is calculated.
3.  **Description Similarity**: Jaccard similarity is calculated on the description text of the plans. This signal is crucial for identifying articles that describe the same concept but have very different titles (e.g., "BERT Architecture" and "Bidirectional Encoder Representations").

The initial implementation used a greedy O(n²) algorithm, which was found to be insufficient as it could not handle transitive duplicates. For example, if plan A was similar to B, and B was similar to C, but A was not similar enough to C, a greedy approach might only merge A and B, leaving C separate. The correct outcome would be to merge all three [Source 1].

The current implementation uses a [Union-Find Algorithm](./union-find-algorithm.md) to correctly handle these transitive relationships. The algorithm works as follows [Source 1]:
1.  A graph is constructed where each `ArticlePlan` is a node.
2.  An edge is created between any two nodes if their combined similarity score (based on the three heuristics) exceeds a configurable threshold.
3.  The Union-Find algorithm identifies all connected components within this graph.
4.  All plans within a single connected component are considered duplicates and are merged into a single "survivor" plan.
5.  The survivor is chosen deterministically: it is the plan with the lexicographically smallest `docId`. This ensures the process is stable and repeatable.

The `deduplicatePlans` function returns a `DedupResult` object containing the list of surviving `merged` plans and a `removed` list that documents which plans were absorbed and which survivor they were merged into [Source 1].

## Configuration

The sensitivity of the deduplication process can be controlled via a `threshold` parameter passed to the `deduplicatePlans` function. This value represents the minimum combined similarity score required to consider two plans as duplicates. The default threshold is 0.7 [Source 1].

```typescript
import { deduplicatePlans } from "yaaf/knowledge/compiler";
import type { ArticlePlan } from "yaaf/knowledge/compiler";

const articlePlans: ArticlePlan[] = [/* ... plans from extractor ... */];

// Run deduplication with the default threshold (0.7)
const defaultResult = deduplicatePlans(articlePlans);

// Run with a stricter threshold to merge only very similar plans
const strictResult = deduplicatePlans(articlePlans, 0.85);
```

## Sources

[Source 1]: src/knowledge/compiler/dedup.ts