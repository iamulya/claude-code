---
title: ContradictionPair
entity_type: api
summary: Defines the structure for a detected contradiction between two claims from different articles.
export_name: ContradictionPair
source_file: src/knowledge/compiler/contradictions.ts
category: interface
search_terms:
 - contradiction detection
 - knowledge base consistency
 - finding conflicting facts
 - negation contradiction
 - numeric disagreement
 - temporal conflict
 - claim comparison
 - cross-article validation
 - detecting inconsistencies
 - knowledge compiler report
 - factual error detection
 - ContradictionReport pair
 - conflicting information
 - data integrity check
stub: false
compiled_at: 2026-04-24T16:58:34.383Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/contradictions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ContradictionPair` interface defines the data structure for a single potential contradiction detected between two claims from different articles within a compiled knowledge base [Source 1].

This interface is a key component of the `ContradictionReport` returned by the `detectContradictions` function. The contradiction detection process is a post-synthesis scan that uses heuristic methods to identify conflicts without requiring an [LLM](../concepts/llm.md). Each `ContradictionPair` object encapsulates the two conflicting claims, their source articles, a similarity score, and the type of contradiction found [Source 1].

It is used to report three main types of contradictions:
*   **Negation:** Two sentences have high token overlap, but one contains negation markers (e.g., "not", "never") that the other lacks.
*   **[Numeric Disagreement](../concepts/numeric-disagreement.md):** Two articles make numeric claims about the same entity with different values (e.g., "costs $50" vs. "costs $75").
*   **[Temporal Conflict](../concepts/temporal-conflict.md):** Two articles provide conflicting dates or years for the same event (e.g., "launched in 2020" vs. "launched in 2021").

The system only detects and reports these pairs; it does not attempt to resolve them [Source 1].

## Signature

```typescript
export interface ContradictionPair {
  articleA: string;
  articleB: string;
  claimA: string;
  claimB: string;
  similarity: number;
  type: "negation" | "numeric_disagreement" | "temporal_conflict";
}
```

## Properties

*   **`articleA: string`**
    The file path or identifier of the first article containing a conflicting claim.

*   **`articleB: string`**
    The file path or identifier of the second article containing a conflicting claim.

*   **`claimA: string`**
    The specific sentence from `articleA` that is part of the contradiction.

*   **`claimB: string`**
    The specific sentence from `articleB` that contradicts `claimA`.

*   **`similarity: number`**
    A numeric score, typically representing token overlap, that indicates how closely related the two claims are. This is used to filter for claims that are likely discussing the same topic.

*   **`type: "negation" | "numeric_disagreement" | "temporal_conflict"`**
    A string literal identifying the category of the detected contradiction.

## Examples

The following example demonstrates how a `ContradictionPair` object would appear within the `pairs` array of a `ContradictionReport` returned by the `detectContradictions` function.

```typescript
import { detectContradictions, ContradictionReport } from 'yaaf';

async function findContradictions(compiledDir: string) {
  const report: ContradictionReport = await detectContradictions(compiledDir);

  if (report.pairs.length > 0) {
    console.log(`Found ${report.pairs.length} potential contradictions.`);

    // A ContradictionPair is an element in the report.pairs array.
    const firstContradiction: ContradictionPair = report.pairs[0];

    // Example of logging the details of a detected pair
    console.log(`
      Type: ${firstContradiction.type}
      Similarity: ${firstContradiction.similarity.toFixed(2)}
      ---
      Article A: ${firstContradiction.articleA}
      Claim A: "${firstContradiction.claimA}"
      ---
      Article B: ${firstContradiction.articleB}
      Claim B: "${firstContradiction.claimB}"
    `);
  } else {
    console.log("No contradictions found.");
  }
}

/*
Example console output for a temporal conflict:

Found 1 potential contradictions.

      Type: temporal_conflict
      Similarity: 0.91
      ---
      Article A: /kb/compiled/ProjectPhoenix.md
      Claim A: "The project was officially launched in 2022."
      ---
      Article B: /kb/compiled/CompanyHistory.md
      Claim B: "Project Phoenix began in early 2023 after initial funding was secured."

*/
```

## See Also

*   `detectContradictions`: The function that scans the knowledge base and produces reports containing `ContradictionPair` objects.
*   `ContradictionReport`: The top-level object returned by the detection process, which contains an array of `ContradictionPair` instances.

## Sources

[Source 1]: src/knowledge/compiler/contradictions.ts