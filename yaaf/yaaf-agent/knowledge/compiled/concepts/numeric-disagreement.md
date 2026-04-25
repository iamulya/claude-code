---
title: Numeric Disagreement
entity_type: concept
summary: A type of factual contradiction where two claims make different numeric assertions about the same entity.
related_subsystems:
 - Knowledge Compiler
search_terms:
 - contradiction detection
 - factual consistency check
 - conflicting numeric claims
 - data validation in knowledge base
 - how to find number conflicts
 - YAAF knowledge compiler
 - heuristic contradiction detection
 - different numbers for same fact
 - cross-article validation
 - numeric claim conflict
 - P4-3 contradiction detection
stub: false
compiled_at: 2026-04-24T17:59:09.161Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/contradictions.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

A Numeric Disagreement is a type of factual contradiction identified by the YAAF [Knowledge Compiler](../subsystems/knowledge-compiler.md) during a post-synthesis scan of the knowledge base [Source 1]. It occurs [when](../apis/when.md) two different compiled articles make conflicting numeric claims about the same entity. For example, one article might state a feature was "introduced in 2017" while another claims it was "introduced in 2019" [Source 1].

This detection is part of a heuristic-based, cross-article contradiction scan that does not require an [LLM](./llm.md). It is one of three contradiction types the system checks for, alongside negation contradictions and temporal conflicts. The purpose of this scan is to identify potential inconsistencies in the compiled knowledge for review, not to automatically resolve them [Source 1].

## How It Works in YAAF

The detection of Numeric Disagreements is handled by the `detectContradictions` function within the Knowledge Compiler subsystem [Source 1]. This function scans compiled articles, extracts factual claims, and compares them.

When the scanner finds two sentences from different articles that appear to discuss the same entity but contain different numeric values, it flags this as a `numeric_disagreement`. The finding is recorded as a `ContradictionPair` object, which includes the source articles, the conflicting claims, and the contradiction type [Source 1].

This process is a detection-only pass. The system reports the identified contradictions but does not attempt to determine which claim is correct or to merge the information. The resolution of these disagreements is left to a human operator or a subsequent, potentially LLM-powered, healing process [Source 1].

## Configuration

The behavior of the contradiction detection scan, which includes finding Numeric Disagreements, can be configured through the `ContradictionOptions` object passed to the `detectContradictions` function. These options help manage the performance and scope of the scan [Source 1].

```typescript
export interface ContradictionOptions {
  /** Maximum number of articles to scan (default: 200) */
  maxArticles?: number;
  /** Minimum token overlap to consider sentences related (default: 0.5) */
  minOverlap?: number;
  /**
   * Maximum sentences extracted per article (default: 30).
   * Caps the per-article sentence fanout so a deeply-written article doesn't
   * cause O(n²×m²) blowup. Sentences are taken from the start of the article,
   * which is where the most salient factual claims appear.
   */
  maxSentencesPerArticle?: number;
  /**
   * Hard budget on total pairwise sentence comparisons (default: 50_000).
   * When exceeded, the scan stops early and a truncation warning is added.
   * This prevents compile stalls on large KBs regardless of article or
   * sentence counts.
   */
  maxComparisons?: number;
}
```

Key configuration parameters include `maxArticles` to limit the number of articles scanned, `maxSentencesPerArticle` to control the number of claims analyzed from each article, and `maxComparisons` to set a hard budget on the total number of comparisons to prevent performance issues on large knowledge bases [Source 1].

## Sources

[Source 1] `src/knowledge/compiler/contradictions.ts`