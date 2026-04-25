---
summary: A data structure algorithm used in YAAF's deduplication subsystem to efficiently group transitively related near-duplicate article plans.
title: Union-Find Algorithm
entity_type: concept
related_subsystems:
 - knowledge/compiler/dedup
search_terms:
 - transitive duplicate detection
 - grouping similar items
 - connected components algorithm
 - disjoint set union
 - DSU algorithm
 - how to merge related documents
 - deduplication algorithm
 - preventing duplicate content
 - article plan merging
 - semantic deduplication
 - YAAF deduplication
 - greedy algorithm vs union-find
stub: false
compiled_at: 2026-04-24T18:04:46.069Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/dedup.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

The Union-Find algorithm, also known as a disjoint-set union (DSU) data structure, is an algorithm used in YAAF's [Knowledge Compiler](../subsystems/knowledge-compiler.md) to identify and merge groups of near-duplicate article plans [Source 1]. Its primary purpose is to solve the problem of transitive deduplication, where a simple pairwise comparison would fail to identify a complete group of related items.

This algorithm was introduced to replace a greedy O(n²) approach that could not correctly handle transitive relationships [Source 1]. For example, if article plan A is similar to B, and B is similar to C, but A and C are not directly similar enough to meet the threshold, a greedy algorithm might only merge A and B, leaving C separate. The Union-Find algorithm correctly identifies that A, B, and C all belong to the same group and should be merged into a single plan [Source 1].

By correctly grouping all transitively related duplicates, this approach prevents redundant [LLM](./llm.md) calls for synthesis, avoids creating multiple compiled articles on the same topic, and consolidates fragmented source material into a single, comprehensive article plan [Source 1].

## How It Works in YAAF

The Union-Find algorithm is implemented within the [Semantic Deduplication](./semantic-deduplication.md) stage of the knowledge compiler, specifically in the `deduplicatePlans` function [Source 1]. The process involves two main phases:

1.  **Graph Construction**: The system first builds a conceptual graph where each article plan is a node. An edge is created between any two nodes if their combined similarity score exceeds a configurable threshold. This score is calculated using a combination of three heuristics:
    *   [Jaccard Similarity](./jaccard-similarity.md) on tokenized, lowercased titles.
    *   The ratio of overlapping source file paths.
    *   Jaccard similarity on the article plan descriptions [Source 1].

2.  **Finding Connected Components**: The Union-Find algorithm is then applied to this graph to efficiently find all its connected components. Each component represents a distinct group of transitively related, near-duplicate article plans.

Once the components are identified, a single "survivor" plan is chosen from each group. The selection criterion is deterministic: the plan with the lexicographically smallest `docId` is chosen as the survivor. All other plans within that component are then considered "removed" and are merged into the survivor [Source 1]. The final output is a list of surviving plans and a record of which plans were merged [Source 1].

## Configuration

The behavior of the Union-Find based deduplication is controlled by a similarity threshold. This value determines the minimum score required to consider two article plans similar enough to be connected in the graph.

The `deduplicatePlans` function accepts this threshold as an argument.

```typescript
// Example of calling the deduplication function
import { deduplicatePlans } from "./knowledge/compiler/dedup.js";
import type { ArticlePlan } from "./knowledge/compiler/extractor/index.js";

const allPlans: ArticlePlan[] = [ /* ... list of plans ... */ ];

// Use the default threshold
const resultDefault = deduplicatePlans(allPlans);

// Use a custom, stricter threshold
const customThreshold = 0.85;
const resultStrict = deduplicatePlans(allPlans, customThreshold);
```

A lower threshold will result in more aggressive merging, grouping plans that are less similar. A higher threshold will be more conservative, only merging plans that are very clearly duplicates [Source 1].

## Sources

[Source 1]: src/knowledge/compiler/dedup.ts