---
title: ArticleSynthesisResult
entity_type: api
summary: Represents the detailed outcome of synthesizing a single knowledge base article.
export_name: ArticleSynthesisResult
source_file: src/knowledge/compiler/synthesizer/types.ts
category: type
search_terms:
 - synthesis result for one article
 - knowledge base compilation output
 - article creation status
 - what does synthesizer return for each file
 - failed article synthesis
 - skipped article compilation
 - grounding score for article
 - source files for compiled article
 - registry entry from synthesis
 - word count of generated article
 - individual article outcome
 - KnowledgeSynthesizer article result
stub: false
compiled_at: 2026-04-24T16:50:25.661Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/synthesizer/types.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `ArticleSynthesisResult` type is a data structure that represents the outcome of a synthesis operation for a single article within the YAAF [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) [Source 2]. It is a component of the broader `SynthesisResult` object, which aggregates the results for an entire compilation run [Source 2].

Each `ArticleSynthesisResult` object contains metadata about the operation performed (e.g., created, updated, skipped, or failed), file paths, and data passed between different phases of the compilation process, such as the article body for the grounding pass or a registry entry for later batch processing [Source 2]. This allows for detailed tracking and reporting of the knowledge base synthesis process on a per-article basis.

## Signature

`ArticleSynthesisResult` is a TypeScript type alias with the following properties [Source 2]:

```typescript
export type ArticleSynthesisResult = {
  /** The docId of this article (path relative to compiled/) */
  docId: string;
  /** Canonical article title */
  canonicalTitle: string;
  /** What was done */
  action: "created" | "updated" | "skipped" | "failed";
  /** Approximate word count of the written article */
  wordCount?: number;
  /** Absolute path to the written file */
  outputPath?: string;
  /** Error if action = 'failed' */
  error?: Error;
  /** Phase 1C: Registry entry for batch application after concurrent synthesis */
  registryEntry?: ConceptRegistryEntry;
  /** Phase 5C: Grounding validation score (0-1) */
  groundingScore?: number;
  /**
   * P0-1: Absolute paths of source files that contributed to this article.
   * Used by the grounding pass to scope validation to per-article sources only,
   * preventing false-positive hallucination scores from unrelated source pooling.
   */
  sourcePaths?: string[];
  /**
   * P2-1: The synthesized article body (without [[[[[[[[Frontmatter]]]]]]]]), available when not dryRun.
   * Passed directly to the grounding pass so it does not need to re-read the file from disk.
   */
  body?: string;
};
```

### Properties

*   **`docId`**: `string`
    The unique identifier for the article, which corresponds to its file path relative to the compiled output directory [Source 2].

*   **`canonicalTitle`**: `string`
    The canonical title of the article as determined during synthesis [Source 2].

*   **`action`**: `"created" | "updated" | "skipped" | "failed"`
    A string literal indicating the operation performed on the article during the synthesis run [Source 2].

*   **`wordCount`**: `number` (optional)
    An approximate count of the words in the generated article body [Source 2].

*   **`outputPath`**: `string` (optional)
    The absolute file system path to the compiled article file [Source 2].

*   **`error`**: `Error` (optional)
    An `Error` object containing details of the failure, present only if the `action` is `'failed'` [Source 2].

*   **`registryEntry`**: `ConceptRegistryEntry` (optional)
    Data intended for the `ConceptRegistry`, generated during synthesis for batch application after all articles are processed. This is part of the compiler's internal multi-phase architecture [Source 2].

*   **`groundingScore`**: `number` (optional)
    A score between 0 and 1 representing the result of the grounding validation pass, which checks the article for factual consistency against its source materials [Source 2].

*   **`sourcePaths`**: `string[]` (optional)
    An array of absolute paths to the source files that were used as input for synthesizing this specific article. This is crucial for the grounding pass to avoid false positives by scoping its validation [Source 2].

*   **`body`**: `string` (optional)
    The synthesized markdown body of the article (without Frontmatter). This is passed to subsequent compiler passes, like grounding, to avoid re-reading the file from disk [Source 2].

## Examples

### Successful Article Creation

This example shows a typical result for a new article that was successfully created.

```typescript
import type { ArticleSynthesisResult } from 'yaaf';

const result: ArticleSynthesisResult = {
  docId: 'api/agent.md',
  canonicalTitle: 'Agent',
  action: 'created',
  wordCount: 523,
  outputPath: '/path/to/project/compiled/api/agent.md',
  sourcePaths: [
    '/path/to/project/src/agent.ts',
    '/path/to/project/src/agent-executor.ts',
  ],
  body: '## Overview\nThe Agent class is the core of YAAF...',
  groundingScore: 0.95,
};
```

### Skipped Article

This result indicates that the article was skipped by the [Differential Compiler](../concepts/differential-compiler.md) because its source files had not changed since the last compilation.

```typescript
import type { ArticleSynthesisResult } from 'yaaf';

const result: ArticleSynthesisResult = {
  docId: 'guide/getting-started.md',
  canonicalTitle: 'Getting Started',
  action: 'skipped',
};
```

### Failed Synthesis

This example shows a result for an article that failed to synthesize, including an error object.

```typescript
import type { ArticleSynthesisResult } from 'yaaf';

const result: ArticleSynthesisResult = {
  docId: 'plugin/openai.md',
  canonicalTitle: 'OpenAI Plugin',
  action: 'failed',
  error: new Error('API rate limit exceeded during synthesis.'),
};
```

## See Also

*   `SynthesisResult`: The aggregate result object for a full synthesis run, which contains an array of `ArticleSynthesisResult` objects.
*   `SynthesisOptions`: Configuration options for the [Knowledge Synthesizer](../subsystems/knowledge-synthesizer.md).
*   `SynthesisProgressEvent`: Events emitted during synthesis to report real-time progress.

## Sources

*   [Source 1]: `src/knowledge/compiler/synthesizer/index.ts`
*   [Source 2]: `src/knowledge/compiler/synthesizer/types.ts`