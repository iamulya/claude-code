---
title: ContradictionOptions
entity_type: api
summary: Configuration options for the contradiction detection process, controlling scan depth and thresholds.
export_name: ContradictionOptions
source_file: src/knowledge/compiler/contradictions.ts
category: interface
search_terms:
 - contradiction detection settings
 - knowledge base consistency check
 - configure contradiction scan
 - numeric disagreement threshold
 - temporal conflict detection
 - negation contradiction options
 - limit article scan
 - max comparisons for contradictions
 - sentence overlap configuration
 - prevent compile stalls
 - knowledge compiler options
 - heuristic contradiction detection
stub: false
compiled_at: 2026-04-24T16:58:20.538Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/contradictions.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`ContradictionOptions` is an interface that defines the configuration for the contradiction detection scan performed by the `detectContradictions` function. This scan is a post-synthesis process that identifies potential contradictions between compiled knowledge base articles using heuristic methods, without requiring an [LLM](../concepts/llm.md) [Source 1].

This configuration object allows users to control the performance and scope of the scan to prevent excessive resource usage on large knowledge bases. It provides options to set limits on the number of articles and sentences processed, the total number of comparisons performed, and the similarity threshold for considering sentences related [Source 1].

## Signature

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
[Source 1]

## Properties

### `maxArticles`
- **Type**: `number` (optional)
- **Default**: `200`
- **Description**: The maximum number of articles to include in the contradiction scan [Source 1].

### `minOverlap`
- **Type**: `number` (optional)
- **Default**: `0.5`
- **Description**: The minimum token overlap score required to consider two sentences as being related and thus candidates for a contradiction check [Source 1].

### `maxSentencesPerArticle`
- **Type**: `number` (optional)
- **Default**: `30`
- **Description**: The maximum number of sentences to extract from the beginning of each article for comparison. This helps prevent performance issues [when](./when.md) scanning very long articles by focusing on the most salient claims, which typically appear early in an article [Source 1].

### `maxComparisons`
- **Type**: `number` (optional)
- **Default**: `50_000`
- **Description**: A hard limit on the total number of pairwise sentence comparisons to perform during the scan. If this budget is exceeded, the scan terminates early, and the resulting report will indicate that it was truncated. This serves as a safeguard against compile stalls on very large knowledge bases [Source 1].

## Examples

### Basic Usage

The following example shows how to pass `ContradictionOptions` to the `detectContradictions` function to customize the scan.

```typescript
import { detectContradictions, ContradictionOptions } from 'yaaf';

const compiledArticlesDirectory = './dist/kb';

// Configure a more aggressive scan with a higher budget
const options: ContradictionOptions = {
  maxArticles: 500,
  maxSentencesPerArticle: 50,
  maxComparisons: 200_000,
  minOverlap: 0.6,
};

async function runContradictionCheck() {
  try {
    const report = await detectContradictions(compiledArticlesDirectory, options);
    console.log(`Found ${report.pairs.length} potential contradictions.`);
    if (report.truncated) {
      console.warn('Warning: The scan was truncated due to exceeding the maxComparisons budget.');
    }
  } catch (error) {
    console.error('Failed to run contradiction detection:', error);
  }
}

runContradictionCheck();
```

## Sources

[Source 1]: src/knowledge/compiler/contradictions.ts