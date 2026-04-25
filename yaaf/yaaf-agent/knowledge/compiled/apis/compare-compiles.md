---
summary: Compares two `CompileQualityRecord`s and identifies regressions or improvements.
export_name: compareCompiles
source_file: src/knowledge/compiler/qualityHistory.ts
category: function
title: compareCompiles
entity_type: api
search_terms:
 - compile quality comparison
 - detect knowledge base regressions
 - measure compile improvements
 - grounding score change
 - lint error delta
 - CI gate for KB quality
 - knowledge base quality history
 - compare two compile results
 - CompileQualityRecord diff
 - QualityDelta calculation
 - how to check if grounding improved
 - track lint errors over time
stub: false
compiled_at: 2026-04-24T16:56:18.115Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/qualityHistory.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `compareCompiles` function is a utility for analyzing the change in quality between two knowledge base compilations [Source 1]. It takes two `CompileQualityRecord` objects, representing a previous and a current state, and produces a `QualityDelta` object.

This function is primarily used in continuous integration (CI) systems to programmatically detect regressions. For example, a CI gate could fail a build if `compareCompiles` reports a significant drop in the [Grounding Score](../concepts/grounding-score.md) or an increase in [Linting](../concepts/linting.md) errors, preventing quality degradation from being merged [Source 1]. It can also be used to track and report on improvements over time.

## Signature

The function takes a previous and a current `CompileQualityRecord` and returns a `QualityDelta` object summarizing the differences [Source 1].

```typescript
export function compareCompiles(
  prev: CompileQualityRecord,
  curr: CompileQualityRecord,
): QualityDelta;
```

### `CompileQualityRecord` Type

This object contains a snapshot of quality metrics for a single compile run [Source 1].

```typescript
export type CompileQualityRecord = {
  /** ISO timestamp of this compile */
  compiledAt: string;
  /** Compile duration in ms */
  durationMs: number;
  /** Articles compiled (created + updated) */
  articlesCompiled: number;
  /** Articles skipped (clean / differential) */
  articlesSkipped: number;
  /** Stubs auto-created */
  stubsCreated: number;
  /** Articles that failed synthesis */
  articlesFailed: number;

  /** Grounding summary (absent if grounding was disabled) */
  grounding?: {
    articlesVerified: number;
    articlesPassed: number;
    articlesFailed: number;
    meanScore: number;
    minScore: number;
  };

  /** Lint summary (absent if linting was disabled) */
  lint?: {
    totalIssues: number;
    errors: number;
    warnings: number;
    /** Top 5 most frequent lint codes */
    topCodes: Array<{ code: string; count: number }>;
  };

  /** KB size snapshot */
  size: {
    totalArticles: number;
    totalSources: number;
  };
};
```

### `QualityDelta` Type

This object represents the calculated difference between two `CompileQualityRecord`s [Source 1].

```typescript
export type QualityDelta = {
  /** Previous vs current grounding score change */
  groundingScoreDelta: number | null;
  /** Previous vs current lint error change */
  lintErrorDelta: number | null;
  /** Net articles added */
  articlesAdded: number;
  /** Human-readable regressions detected */
  regressions: string[];
  /** Human-readable improvements detected */
  improvements: string[];
};
```

## Examples

### Basic Comparison

This example demonstrates comparing two compile records where the grounding score has decreased and lint errors have increased, indicating a regression.

```typescript
import { compareCompiles, CompileQualityRecord } from 'yaaf';

const previousCompile: CompileQualityRecord = {
  compiledAt: '2023-10-26T10:00:00.000Z',
  durationMs: 50000,
  articlesCompiled: 100,
  articlesSkipped: 0,
  stubsCreated: 5,
  articlesFailed: 0,
  grounding: {
    articlesVerified: 90,
    articlesPassed: 85,
    articlesFailed: 5,
    meanScore: 0.92,
    minScore: 0.75,
  },
  lint: {
    totalIssues: 10,
    errors: 2,
    warnings: 8,
    topCodes: [{ code: 'missing-source', count: 2 }],
  },
  size: {
    totalArticles: 500,
    totalSources: 250,
  },
};

const currentCompile: CompileQualityRecord = {
  compiledAt: '2023-10-27T11:00:00.000Z',
  durationMs: 52000,
  articlesCompiled: 102,
  articlesSkipped: 0,
  stubsCreated: 2,
  articlesFailed: 1,
  grounding: {
    articlesVerified: 95,
    articlesPassed: 88,
    articlesFailed: 7,
    meanScore: 0.89, // <-- Regression
    minScore: 0.70,
  },
  lint: {
    totalIssues: 15,
    errors: 4, // <-- Regression
    warnings: 11,
    topCodes: [{ code: 'missing-source', count: 4 }],
  },
  size: {
    totalArticles: 502,
    totalSources: 251,
  },
};

const delta = compareCompiles(previousCompile, currentCompile);

console.log(delta);
/*
Output:
{
  groundingScoreDelta: -0.030000000000000027,
  lintErrorDelta: 2,
  articlesAdded: 2,
  regressions: [
    'Mean grounding score dropped from 0.92 to 0.89 (-3.26%)',
    'Lint errors increased from 2 to 4'
  ],
  improvements: []
}
*/

// In a CI script, you could check for regressions:
if (delta.regressions.length > 0) {
  console.error('Build failed due to quality regressions:', delta.regressions);
  // process.exit(1);
}
```

## Sources

[Source 1] `src/knowledge/compiler/qualityHistory.ts`