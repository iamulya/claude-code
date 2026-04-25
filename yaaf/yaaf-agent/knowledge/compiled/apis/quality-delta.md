---
summary: Represents the difference in quality metrics between two knowledge base compilation records.
export_name: QualityDelta
source_file: src/knowledge/compiler/qualityHistory.ts
category: type
title: QualityDelta
entity_type: api
search_terms:
 - compare compile results
 - knowledge base quality metrics
 - detect build regressions
 - compilation quality difference
 - grounding score change
 - lint error delta
 - CI for knowledge base
 - track KB improvements
 - compile history analysis
 - regression detection
 - build quality report
 - compilation comparison
stub: false
compiled_at: 2026-04-24T17:31:15.122Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/qualityHistory.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `QualityDelta` type is a data structure that represents the calculated difference between two `CompileQualityRecord` objects [Source 1]. It is used to quantify changes in knowledge base quality from one compilation to the next.

This type is the return value of the `compareCompiles` function. Its primary purpose is to provide both numerical deltas (e.g., change in [Grounding Score](../concepts/grounding-score.md)) and human-readable summaries of any detected improvements or regressions. This is particularly useful in continuous integration (CI) environments to automatically flag builds that degrade the knowledge base's quality [Source 1].

## Signature

`QualityDelta` is a TypeScript type alias for an object with the following properties [Source 1]:

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

### Properties

| Property              | Type                   | Description                                                                                                                                                           |
| --------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `groundingScoreDelta` | `number \| null`       | The numerical change in the mean grounding score between the two compiles. `null` if grounding was not enabled for one or both records [Source 1].                      |
| `lintErrorDelta`      | `number \| null`       | The numerical change in the total number of lint errors. `null` if [Linting](../concepts/linting.md) was not enabled for one or both records [Source 1].                                          |
| `articlesAdded`       | `number`               | The net change in the total number of articles in the knowledge base [Source 1].                                                                                      |
| `regressions`         | `string[]`             | An array of human-readable strings describing any negative changes detected, such as a drop in grounding score or an increase in lint errors [Source 1].               |
| `improvements`        | `string[]`             | An array of human-readable strings describing any positive changes detected, such as an improved grounding score or a reduction in lint errors [Source 1].              |

## Examples

The following example demonstrates how a `QualityDelta` object might be produced and used after comparing two compilation records.

```typescript
import { compareCompiles, CompileQualityRecord, QualityDelta } from 'yaaf';

// Assume these records were loaded from the quality history
const previousCompile: CompileQualityRecord = {
  compiledAt: '2023-10-26T10:00:00.000Z',
  durationMs: 5000,
  articlesCompiled: 100,
  articlesSkipped: 0,
  stubsCreated: 5,
  articlesFailed: 0,
  grounding: {
    articlesVerified: 100,
    articlesPassed: 90,
    articlesFailed: 10,
    meanScore: 0.85,
    minScore: 0.6,
  },
  lint: {
    totalIssues: 20,
    errors: 15,
    warnings: 5,
    topCodes: [{ code: 'broken-link', count: 15 }],
  },
  size: {
    totalArticles: 100,
    totalSources: 50,
  },
};

const currentCompile: CompileQualityRecord = {
  compiledAt: '2023-10-27T11:00:00.000Z',
  durationMs: 5500,
  articlesCompiled: 105,
  articlesSkipped: 0,
  stubsCreated: 2,
  articlesFailed: 1,
  grounding: {
    articlesVerified: 105,
    articlesPassed: 92,
    articlesFailed: 13,
    meanScore: 0.82, // A regression
    minScore: 0.55,
  },
  lint: {
    totalIssues: 12,
    errors: 8, // An improvement
    warnings: 4,
    topCodes: [{ code: 'broken-link', count: 8 }],
  },
  size: {
    totalArticles: 105,
    totalSources: 52,
  },
};

// The compareCompiles function returns a QualityDelta object
const delta: QualityDelta = compareCompiles(previousCompile, currentCompile);

console.log('Grounding Score Delta:', delta.groundingScoreDelta);
// Example Output: Grounding Score Delta: -0.03

console.log('Lint Error Delta:', delta.lintErrorDelta);
// Example Output: Lint Error Delta: -7

console.log('Articles Added:', delta.articlesAdded);
// Example Output: Articles Added: 5

console.log('Regressions:', delta.regressions);
// Example Output: Regressions: [ 'Mean grounding score dropped from 0.85 to 0.82 (-3.53%)' ]

console.log('Improvements:', delta.improvements);
// Example Output: Improvements: [ 'Lint errors decreased from 15 to 8 (-46.67%)' ]
```

## See Also

- `CompileQualityRecord`: The data structure that `QualityDelta` is derived from.
- `compareCompiles`: The function that takes two `CompileQualityRecord` objects and returns a `QualityDelta`.

## Sources

[Source 1] `src/knowledge/compiler/qualityHistory.ts`