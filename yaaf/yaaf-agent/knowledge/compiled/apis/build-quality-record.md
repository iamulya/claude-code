---
summary: Constructs a `CompileQualityRecord` from a `CompileResult`.
export_name: buildQualityRecord
source_file: src/knowledge/compiler/qualityHistory.ts
category: function
title: buildQualityRecord
entity_type: api
search_terms:
 - compile quality metrics
 - knowledge base quality
 - generate compile report
 - create quality record
 - CompileResult to CompileQualityRecord
 - measure grounding score
 - track lint errors over time
 - CI for knowledge base
 - compile statistics
 - KB quality history
 - agent knowledge compilation
 - build compile summary
stub: false
compiled_at: 2026-04-24T16:53:43.343Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/qualityHistory.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `buildQualityRecord` function is a utility that transforms the output of a knowledge base compilation, represented by a `CompileResult` object, into a structured `CompileQualityRecord`. This record serves as a persistent, single-line JSON snapshot of a compile's key quality metrics [Source 1].

This function is a core component of the [Compile Quality History](../subsystems/compile-quality-history.md) subsystem. The generated record is designed to be appended to a JSONL file (e.g., `.kb-quality-history.jsonl`), allowing for the tracking of knowledge base quality over time. By analyzing a history of these records, developers can monitor trends in grounding scores, lint errors, and other metrics, enabling CI gates that can, for example, reject a compile if grounding quality drops significantly [Source 1].

## Signature

The function takes a single argument, `result`, which is the object returned from the [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md). It returns a `CompileQualityRecord` object [Source 1].

```typescript
import type { CompileResult } from "./compiler.js";

export function buildQualityRecord(result: CompileResult): CompileQualityRecord;
```

### Return Type: `CompileQualityRecord`

The structure of the object returned by this function is as follows [Source 1]:

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

## Examples

The following example demonstrates how to use `buildQualityRecord` to create a quality snapshot from a hypothetical `CompileResult`.

```typescript
import { buildQualityRecord } from 'yaaf';
// The CompileResult type is produced by the YAAF knowledge compiler.
// Its structure is simplified here for demonstration purposes.
import type { CompileResult } from 'yaaf';

// A mock CompileResult from a knowledge base compilation
const compileResult: CompileResult = {
  durationMs: 15780,
  stats: {
    created: 8,
    updated: 2,
    skipped: 150,
    stubs: 3,
    failed: 0,
  },
  grounding: {
    verified: 10,
    passed: 10,
    failed: 0,
    meanScore: 0.95,
    minScore: 0.81,
  },
  lint: {
    totalIssues: 5,
    errors: 1,
    warnings: 4,
    topCodes: [
      { code: 'missing-summary', count: 3 },
      { code: 'broken-link', count: 1 },
      { code: 'long-title', count: 1 },
    ],
  },
  kbSize: {
    articles: 160,
    sources: 65,
  }
};

// Generate the quality record
const qualityRecord = buildQualityRecord(compileResult);

console.log(JSON.stringify(qualityRecord, null, 2));

/*
Outputs a CompileQualityRecord object:
{
  "compiledAt": "2023-10-27T10:00:00.000Z", // An ISO string is automatically added
  "durationMs": 15780,
  "articlesCompiled": 10, // created + updated
  "articlesSkipped": 150,
  "stubsCreated": 3,
  "articlesFailed": 0,
  "grounding": {
    "articlesVerified": 10,
    "articlesPassed": 10,
    "articlesFailed": 0,
    "meanScore": 0.95,
    "minScore": 0.81
  },
  "lint": {
    "totalIssues": 5,
    "errors": 1,
    "warnings": 4,
    "topCodes": [
      { "code": "missing-summary", "count": 3 },
      { "code": "broken-link", "count": 1 },
      { "code": "long-title", "count": 1 }
    ]
  },
  "size": {
    "totalArticles": 160,
    "totalSources": 65
  }
}
*/
```

## See Also

- `appendQualityRecord`: Appends a `CompileQualityRecord` to the history file.
- `loadQualityHistory`: Reads all records from the history file.
- `compareCompiles`: Compares two `CompileQualityRecord` objects to detect regressions.

## Sources

[Source 1] src/knowledge/compiler/qualityHistory.ts