---
summary: Defines the structure of a single record capturing knowledge base compilation quality metrics.
export_name: CompileQualityRecord
source_file: src/knowledge/compiler/qualityHistory.ts
category: type
title: CompileQualityRecord
entity_type: api
search_terms:
 - knowledge base quality metrics
 - compile performance tracking
 - grounding score history
 - lint error trends
 - CI for knowledge base
 - JSONL quality log
 - how to measure KB improvement
 - compilation statistics
 - knowledge base regression testing
 - YAAF compile log format
 - tracking article compilation
 - KB size over time
stub: false
compiled_at: 2026-04-24T16:56:34.717Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/qualityHistory.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `CompileQualityRecord` type defines the data structure for a single entry in the knowledge base quality history log. After each compilation process, a JSON object conforming to this type is appended as a new line to the `.kb-quality-history.jsonl` file in the knowledge base directory [Source 1].

This append-only log enables tracking compilation metrics over time. It is designed to help answer questions such as whether grounding quality is improving, if lint errors are trending upwards, or to implement CI/CD gates that can, for example, fail a build if grounding scores drop significantly [Source 1].

The record captures a snapshot of compilation statistics, grounding results, [Linting](../concepts/linting.md) issues, and overall knowledge base size [Source 1].

## Signature

`CompileQualityRecord` is a TypeScript type alias.

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
[Source 1]

## Examples

A single line in the `.kb-quality-history.jsonl` file might look like the following JSON object, which conforms to the `CompileQualityRecord` type.

```json
{
  "compiledAt": "2023-10-27T10:00:00.000Z",
  "durationMs": 123456,
  "articlesCompiled": 50,
  "articlesSkipped": 950,
  "stubsCreated": 5,
  "articlesFailed": 1,
  "grounding": {
    "articlesVerified": 49,
    "articlesPassed": 48,
    "articlesFailed": 1,
    "meanScore": 0.95,
    "minScore": 0.78
  },
  "lint": {
    "totalIssues": 12,
    "errors": 2,
    "warnings": 10,
    "topCodes": [
      { "code": "missing-see-also", "count": 5 },
      { "code": "broken-wikilink", "count": 2 }
    ]
  },
  "size": {
    "totalArticles": 1000,
    "totalSources": 1250
  }
}
```

## See Also

- `buildQualityRecord`: A function that constructs a `CompileQualityRecord` from a `CompileResult`.
- `appendQualityRecord`: A function to append a `CompileQualityRecord` to the history file.
- `loadQualityHistory`: A function to read all records from the history file.
- `compareCompiles`: A function that compares two `CompileQualityRecord` objects to detect regressions and improvements.
- `QualityDelta`: The type defining the result of comparing two compile records.

## Sources

[Source 1]: src/knowledge/compiler/qualityHistory.ts