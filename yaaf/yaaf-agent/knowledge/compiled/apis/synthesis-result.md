---
title: SynthesisResult
entity_type: api
summary: Provides an aggregated summary of the entire knowledge base synthesis operation.
export_name: SynthesisResult
source_file: src/knowledge/compiler/synthesizer/types.ts
category: type
search_terms:
 - knowledge base compilation results
 - synthesis summary
 - how many articles were created
 - compilation statistics
 - knowledge synthesizer output
 - article creation count
 - updated articles report
 - failed synthesis report
 - skipped articles count
 - synthesis duration
 - per-article synthesis results
 - compilation time
stub: false
compiled_at: 2026-04-24T17:43:11.565Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/types.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `SynthesisResult` type represents the final output of a knowledge base synthesis operation performed by the [Knowledge Synthesizer](../subsystems/knowledge-synthesizer.md) [Source 2]. It provides a high-level, aggregated summary of the entire run, including statistics on article creation, updates, failures, and skips. This object is crucial for understanding the outcome of a compilation process, reporting results, and debugging failures [Source 2].

It contains both top-level counters for different article outcomes and a detailed array of `ArticleSynthesisResult` objects, each describing the fate of a single article in the compilation plan [Source 2].

## Signature / Properties

`SynthesisResult` is a TypeScript type definition [Source 1].

```typescript
export type SynthesisResult = {
  /** Articles created (new) */
  created: number;
  /** Articles updated (merged with new sources) */
  updated: number;
  /** Stub articles auto-created for candidate new concepts */
  stubsCreated: number;
  /** Articles that failed to synthesize */
  failed: number;
  /** Articles skipped by the differential engine (sources unchanged) */
  skipped: number;
  /** Per-article results */
  articles: ArticleSynthesisResult[];
  /** Total wall-clock time for the synthesis run */
  durationMs: number;
};
```

### Properties

- `created: number`
  The total number of new articles that were successfully created and written to disk [Source 2].

- `updated: number`
  The total number of existing articles that were successfully updated with new information from their source files [Source 2].

- `stubsCreated: number`
  The number of new, minimal "stub" articles that were automatically generated for newly discovered concepts [Source 2].

- `failed: number`
  The total number of articles that failed during the synthesis process due to errors such as API failures or validation issues [Source 2].

- `skipped: number`
  The number of articles that were intentionally skipped, typically by a [Differential Compiler](../concepts/differential-compiler.md) because their source files had not changed since the last compilation [Source 2].

- `articles: ArticleSynthesisResult[]`
  An array containing a detailed result object for each article that was processed. The `ArticleSynthesisResult` type is defined as:
  ```typescript
  export type ArticleSynthesisResult = {
    docId: string;
    canonicalTitle: string;
    action: "created" | "updated" | "skipped" | "failed";
    wordCount?: number;
    outputPath?: string;
    error?: Error;
    registryEntry?: ConceptRegistryEntry;
    groundingScore?: number;
    sourcePaths?: string[];
    body?: string;
  };
  ```
  This provides granular information about each article's outcome, including its ID, title, the action taken, and any associated errors or metadata [Source 2].

- `durationMs: number`
  The total wall-clock time, in milliseconds, that the entire synthesis operation took to complete [Source 2].

## Examples

The following example demonstrates a typical `SynthesisResult` object returned after a knowledge base compilation run and how to interpret its data.

```typescript
import type { SynthesisResult } from 'yaaf';

// This result would be returned from a call to the KnowledgeSynthesizer
const result: SynthesisResult = {
  created: 5,
  updated: 2,
  stubsCreated: 1,
  failed: 1,
  skipped: 10,
  durationMs: 125340,
  articles: [
    {
      docId: 'api/Agent.md',
      canonicalTitle: 'Agent',
      action: 'updated',
      wordCount: 1250,
      outputPath: '/path/to/kb/compiled/api/Agent.md',
      sourcePaths: ['/path/to/yaaf/src/agent.ts'],
    },
    {
      docId: 'api/Tool.md',
      canonicalTitle: 'Tool',
      action: 'created',
      wordCount: 800,
      outputPath: '/path/to/kb/compiled/api/Tool.md',
      sourcePaths: ['/path/to/yaaf/src/tools/tool.ts'],
    },
    {
      docId: 'concept/RAG.md',
      canonicalTitle: 'RAG',
      action: 'skipped',
    },
    {
      docId: 'plugin/OpenAPITool.md',
      canonicalTitle: 'OpenAPITool',
      action: 'failed',
      error: new Error('API quota exceeded during synthesis.'),
    },
    // ... more article results for the other 15 articles
  ],
};

// Reporting the summary
console.log(`Synthesis complete in ${result.durationMs / 1000}s.`);
console.log(`- Created: ${result.created}`);
console.log(`- Updated: ${result.updated}`);
console.log(`- Skipped: ${result.skipped}`);
console.log(`- Failed: ${result.failed}`);

// Finding details for a specific failed article
const failedArticles = result.articles.filter(a => a.action === 'failed');
for (const article of failedArticles) {
  console.error(`Failed to synthesize "${article.canonicalTitle}": ${article.error?.message}`);
}
```

## Sources

[Source 1]: `src/knowledge/compiler/synthesizer/index.ts`
[Source 2]: `src/knowledge/compiler/synthesizer/types.ts`