---
title: detectContradictions
entity_type: api
summary: Scans compiled articles to detect potential factual contradictions based on heuristic rules.
export_name: detectContradictions
source_file: src/knowledge/compiler/contradictions.ts
category: function
search_terms:
 - find contradictions in knowledge base
 - knowledge base consistency check
 - detect conflicting facts
 - negation contradiction detection
 - numeric disagreement detection
 - temporal conflict detection
 - heuristic fact checking
 - cross-article validation
 - knowledge compiler scan
 - how to find errors in compiled articles
 - ContradictionReport type
 - ContradictionOptions interface
 - validate compiled knowledge
 - find factual inconsistencies
stub: false
compiled_at: 2026-04-24T17:01:49.781Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/contradictions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `detectContradictions` function is a post-synthesis utility that scans a directory of compiled knowledge base articles to identify potential factual contradictions [Source 1]. It operates without using an [LLM](../concepts/llm.md), relying instead on a set of heuristic methods to compare claims across different articles [Source 1].

This function is designed as a detection-only pass. It reports potential contradictions but does not attempt to resolve them. The resolution is intended to be handled by a human operator or a subsequent LLM-powered healing process [Source 1].

It identifies three primary types of contradictions [Source 1]:
1.  **Negation contradictions**: Occurs [when](./when.md) two sentences have high token overlap, but one contains negation markers (e.g., "not", "never") while the other does not.
2.  **Numeric disagreements**: Flags cases where two articles make conflicting numeric claims about the same entity (e.g., "Agent X has 3 [Tools](../subsystems/tools.md)" vs. "Agent X has 5 tools").
3.  **Temporal conflicts**: Detects disagreements in dates or years associated with the same concept across articles (e.g., "introduced in 2017" vs. "introduced in 2019").

To prevent performance issues on large knowledge bases, the scan can be configured with limits on the number of articles, sentences per article, and total pairwise comparisons [Source 1].

## Signature / Constructor

The `detectContradictions` function is an asynchronous function that takes a directory path and an optional configuration object, returning a promise that resolves to a `[[[[[[[[ContradictionReport]]]]]]]]`.

```typescript
export async function detectContradictions(
  compiledDir: string,
  options?: [[[[[[[[ContradictionOptions]]]]]]]],
): Promise<ContradictionReport>;
```

### Parameters

*   `compiledDir` (string): The path to the directory containing the compiled knowledge base articles to be scanned.
*   `options` (ContradictionOptions, optional): An object to configure the scanning behavior.

### Configuration (ContradictionOptions)

The optional `options` object can contain the following fields:

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

### Return Value (ContradictionReport)

The function returns a `ContradictionReport` object with the results of the scan.

```typescript
export interface ContradictionReport {
  pairs: ContradictionPair[];
  articlesScanned: number;
  claimsScanned: number;
  /** True if the scan was stopped early due to maxComparisons budget. */
  truncated: boolean;
}
```

Each element in the `pairs` array is a `ContradictionPair` object, which details a single potential contradiction.

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

## Examples

The following example demonstrates how to run the contradiction scan on a directory of compiled articles and log the results.

```typescript
import { detectContradictions } from 'yaaf';
import path from 'path';

async function checkKnowledgeBaseConsistency() {
  const compiledArticlesPath = path.join(__dirname, '..', 'kb', 'compiled');

  console.log('Scanning for contradictions...');
  try {
    const report = await detectContradictions(compiledArticlesPath, {
      minOverlap: 0.6, // Require higher similarity for a match
      maxComparisons: 100000, // Increase the comparison budget
    });

    if (report.pairs.length > 0) {
      console.warn(`Found ${report.pairs.length} potential contradictions:`);
      for (const pair of report.pairs) {
        console.log(`\n[${pair.type.toUpperCase()}] between ${pair.articleA} and ${pair.articleB}`);
        console.log(`  - Claim A: "${pair.claimA}"`);
        console.log(`  - Claim B: "${pair.claimB}"`);
      }
    } else {
      console.log('No contradictions found.');
    }

    if (report.truncated) {
      console.error('Warning: The scan was truncated because the maxComparisons budget was exceeded.');
    }

    console.log(`\nScan complete. Scanned ${report.articlesScanned} articles and ${report.claimsScanned} total claims.`);
  } catch (error) {
    console.error('An error occurred during contradiction detection:', error);
  }
}

checkKnowledgeBaseConsistency();
```

## Sources

[Source 1] `src/knowledge/compiler/contradictions.ts`