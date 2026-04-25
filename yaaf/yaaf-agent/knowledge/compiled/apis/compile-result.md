---
summary: Represents the comprehensive outcome of a knowledge base compilation process, including metrics on compiled articles, grounding, linting, and performance.
title: CompileResult
entity_type: api
export_name: CompileResult
source_file: src/knowledge/compiler/compiler.ts
category: type
search_terms:
 - knowledge base compilation results
 - compiler output object
 - compilation metrics
 - grounding and linting stats
 - how to measure compile quality
 - KB build summary
 - article compilation statistics
 - differential compile results
 - buildQualityRecord input
 - compiler performance data
 - compile summary
 - build statistics
stub: false
compiled_at: 2026-04-25T00:05:48.358Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/qualityHistory.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

The `CompileResult` type represents the complete output of a single knowledge base compilation run. It is a data structure that aggregates statistics about the process, including performance timings, counts of created, updated, and skipped articles, and detailed summaries from optional stages like grounding and linting.

This object serves as the primary input for the knowledge base quality tracking system. It is passed to the [buildQualityRecord](./build-quality-record.md) function to create a [CompileQualityRecord](./compile-quality-record.md), which can then be appended to a historical log for trend analysis and quality gating in CI/CD pipelines.

## Signature

The exact definition of `CompileResult` is internal to the compiler. However, its structure can be inferred from its usage by the [buildQualityRecord](./build-quality-record.md) function, which consumes it to produce a [CompileQualityRecord](./compile-quality-record.md). A `CompileResult` object contains all the data necessary to populate a quality record.

```typescript
import type { CompileQualityRecord } from 'yaaf';

// The CompileResult type is not directly exported for modification,
// but its structure mirrors the data needed by CompileQualityRecord.
// It is produced by the internal KB compiler.

export type CompileResult = {
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

## Examples

The most common use of a `CompileResult` is to generate and persist a quality record for historical analysis.

```typescript
import { buildQualityRecord, appendQualityRecord } from 'yaaf';
import type { CompileResult } from 'yaaf';

// This function simulates a knowledge base compiler run,
// which would produce a CompileResult object.
async function runKnowledgeBaseCompile(): Promise<CompileResult> {
  // ... internal compilation logic ...
  
  const result: CompileResult = {
    durationMs: 12345,
    articlesCompiled: 50,
    articlesSkipped: 150,
    stubsCreated: 5,
    articlesFailed: 1,
    grounding: {
      articlesVerified: 49,
      articlesPassed: 48,
      articlesFailed: 1,
      meanScore: 0.95,
      minScore: 0.78,
    },
    lint: {
      totalIssues: 10,
      errors: 2,
      warnings: 8,
      topCodes: [{ code: 'WIKILINK_BROKEN', count: 2 }],
    },
    size: {
      totalArticles: 205,
      totalSources: 80,
    },
  };
  return result;
}

async function main() {
  const compileResult = await runKnowledgeBaseCompile();

  // Use the result to build a quality record for historical tracking.
  const qualityRecord = buildQualityRecord(compileResult);

  // Append the record to the quality history log file.
  const kbDirectory = '/path/to/your/knowledge-base';
  await appendQualityRecord(kbDirectory, qualityRecord);

  console.log('Compile quality record saved.');
}

main();
```

## See Also

- [buildQualityRecord](./build-quality-record.md): Function that consumes a `CompileResult` to create a historical record.
- [CompileQualityRecord](./compile-quality-record.md): The serializable record type derived from `CompileResult`.
- [compareCompiles](./compare-compiles.md): Function to compare two quality records and identify regressions.

## Sources

[Source 1]: src/knowledge/compiler/qualityHistory.ts