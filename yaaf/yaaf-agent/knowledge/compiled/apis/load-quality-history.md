---
summary: Reads all `CompileQualityRecord`s from the knowledge base quality history file.
export_name: loadQualityHistory
source_file: src/knowledge/compiler/qualityHistory.ts
category: function
title: loadQualityHistory
entity_type: api
search_terms:
 - read compile metrics
 - get quality history
 - access compile logs
 - parse .kb-quality-history.jsonl
 - knowledge base quality trends
 - how to analyze compile performance
 - load grounding scores over time
 - retrieve lint error history
 - historical compile data
 - JSONL quality log reader
 - CI quality gates
 - compile regression analysis
stub: false
compiled_at: 2026-04-24T17:18:58.640Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/qualityHistory.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `loadQualityHistory` function reads and parses the entire [Compile Quality History](../subsystems/compile-quality-history.md) from a knowledge base directory [Source 1]. It targets the `.kb-quality-history.jsonl` file, which is an append-only log where each line is a JSON object representing the metrics of a single compile run [Source 1].

This function is used to retrieve historical data for analysis, such as tracking [Grounding Score](../concepts/grounding-score.md) improvements, monitoring lint error trends, or implementing CI gates that fail a build if quality metrics regress significantly. It returns an array of `CompileQualityRecord` objects, with the most recent compile appearing last in the array. If the history file does not exist, the function returns an empty array without erroring [Source 1].

## Signature

The function takes the path to the knowledge base directory and returns a promise that resolves to an array of `CompileQualityRecord` objects [Source 1].

```typescript
export async function loadQualityHistory(
  kbDir: string
): Promise<CompileQualityRecord[]>;
```

### `CompileQualityRecord` Type

The `CompileQualityRecord` type defines the structure of each record returned by `loadQualityHistory` [Source 1].

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

### Reading and Displaying Compile History

This example demonstrates how to load the quality history for a knowledge base located at `./my-kb` and print the mean grounding score for each recorded compile.

```typescript
import { loadQualityHistory } from 'yaaf';
import { join } from 'path';

async function analyzeCompileHistory() {
  const kbDir = join(process.cwd(), 'my-kb');
  
  try {
    const history = await loadQualityHistory(kbDir);

    if (history.length === 0) {
      console.log('No compile history found.');
      return;
    }

    console.log('Compile History Grounding Scores:');
    history.forEach((record, index) => {
      const score = record.grounding?.meanScore ?? 'N/A';
      console.log(`  Run ${index + 1} (${record.compiledAt}): ${score}`);
    });

  } catch (error) {
    console.error('Failed to load quality history:', error);
  }
}

analyzeCompileHistory();
```

## See Also

- `appendQualityRecord`: The function used to write a new entry to the quality history file.
- `compareCompiles`: A utility to compare two `CompileQualityRecord` objects and identify regressions or improvements.
- `CompileQualityRecord`: The data type for a single compile quality report.

## Sources

[Source 1] `src/knowledge/compiler/qualityHistory.ts`