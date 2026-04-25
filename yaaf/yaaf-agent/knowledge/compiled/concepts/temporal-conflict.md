---
title: Temporal Conflict
entity_type: concept
summary: A type of factual contradiction where two claims provide conflicting date or year references for the same concept.
related_subsystems:
 - Knowledge Compiler
search_terms:
 - contradiction detection
 - factual inconsistency
 - conflicting dates in knowledge base
 - date disagreement between articles
 - how to find conflicting facts
 - knowledge base consistency check
 - temporal data validation
 - cross-article contradiction
 - numeric disagreement
 - negation contradiction
 - heuristic contradiction detection
 - YAAF knowledge compiler
stub: false
compiled_at: 2026-04-24T18:03:29.145Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/contradictions.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

A Temporal Conflict is a type of factual contradiction identified by the YAAF [Knowledge Compiler](../subsystems/knowledge-compiler.md) during a post-synthesis scan [Source 1]. It occurs [when](../apis/when.md) two different compiled articles contain claims about the same entity but provide disagreeing date or year references [Source 1]. For example, one article might state a feature was "introduced in 2017" while another claims it was "introduced in 2019" [Source 1].

This concept is part of a broader Cross-Article Contradiction Detection system that uses heuristic methods, without requiring an [LLM](./llm.md), to find potential inconsistencies in the knowledge base. Temporal Conflict is one of three contradiction types detected, alongside Negation contradictions and Numeric disagreements [Source 1]. The detection pass only reports these conflicts; it does not attempt to resolve them. Resolution is intended to be handled by a human operator or a separate, LLM-powered healing process [Source 1].

## How It Works in YAAF

Temporal Conflict detection is implemented within the `detectContradictions` function of the Knowledge Compiler subsystem [Source 1]. This function performs a scan across multiple compiled articles to identify potential contradictions.

When the scanner finds two sentences across different articles that seem to refer to the same subject but have conflicting temporal information, it flags them. The finding is recorded as a `ContradictionPair` object with its `type` property set to `"temporal_conflict"` [Source 1]. This object contains references to the two articles (`articleA`, `articleB`) and the specific conflicting claims (`claimA`, `claimB`) [Source 1]. The entire set of findings is returned in a `ContradictionReport` [Source 1].

## Configuration

The overall contradiction detection scan, which includes the identification of Temporal Conflicts, can be configured through an options object passed to the `detectContradictions` function. While these settings are not specific to Temporal Conflicts, they control the scope and performance of the entire scan [Source 1].

The available options in the `ContradictionOptions` interface are [Source 1]:
*   `maxArticles`: The maximum number of articles to scan. Defaults to 200.
*   `minOverlap`: The minimum token overlap required to consider two sentences related. Defaults to 0.5.
*   `maxSentencesPerArticle`: Limits the number of sentences extracted from the beginning of each article to prevent performance issues with very long articles. Defaults to 30.
*   `maxComparisons`: A hard budget on the total number of pairwise sentence comparisons to prevent compile stalls on large knowledge bases. Defaults to 50,000.

```typescript
import { detectContradictions } from "./knowledge/compiler/contradictions.js";

// Example: Running a contradiction scan with custom options
async function runScan(compiledKnowledgeBasePath: string) {
  const report = await detectContradictions(compiledKnowledgeBasePath, {
    maxArticles: 500,
    maxSentencesPerArticle: 20,
    maxComparisons: 100_000,
  });

  const temporalConflicts = report.pairs.filter(
    (pair) => pair.type === "temporal_conflict"
  );

  console.log(`Found ${temporalConflicts.length} temporal conflicts.`);
  if (report.truncated) {
    console.warn("Warning: Scan was truncated due to exceeding maxComparisons budget.");
  }
}
```

## Sources
[Source 1] `src/knowledge/compiler/contradictions.ts`