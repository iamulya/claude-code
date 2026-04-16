---
title: SynthesisResult
entity_type: api
summary: The overall result of a knowledge synthesis operation, containing generated articles and metadata.
export_name: SynthesisResult
source_file: src/knowledge/compiler/synthesizer/types.ts
category: type
stub: false
compiled_at: 2026-04-16T14:26:39.796Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/types.ts
confidence: 1
---

## Overview
`SynthesisResult` is the final output object returned by the knowledge synthesis process within the YAAF knowledge compiler. It provides a comprehensive summary of the operations performed during a compilation run, including aggregate statistics for created, updated, and failed articles, as well as a detailed list of results for every individual article processed.

This type is primarily used to report the outcome of a synthesis run to calling code or CLI interfaces, allowing for post-processing tasks such as logging, error reporting, or updating a central registry.

## Signature / Constructor

```typescript
export type SynthesisResult = {
  /** Articles created (new) */
  created: number
  /** Articles updated (merged with new sources) */
  updated: number
  /** Stub articles auto-created for candidate new concepts */
  stubsCreated: number
  /** Articles that failed to synthesize */
  failed: number
  /** Per-article results */
  articles: ArticleSynthesisResult[]
  /** Total wall-clock time for the synthesis run */
  durationMs: number
}
```

## Methods & Properties

### Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `created` | `number` | The total count of new articles successfully written to the compiled directory. |
| `updated` | `number` | The count of existing articles that were successfully merged with new source material. |
| `stubsCreated` | `number` | The count of minimal "stub" articles generated for concepts identified during extraction that did not yet have full source material. |
| `failed` | `number` | The count of articles that encountered errors during the synthesis process. |
| `articles` | `ArticleSynthesisResult[]` | An array containing the detailed status and metadata for every article involved in the run. |
| `durationMs` | `number` | The total execution time of the synthesis operation in milliseconds. |

### Related Type: ArticleSynthesisResult
Each entry in the `articles` array follows the `ArticleSynthesisResult` structure:

| Property | Type | Description |
| :--- | :--- | :--- |
| `docId` | `string` | The unique identifier/path of the article relative to the compiled directory. |
| `canonicalTitle` | `string` | The official title of the article. |
| `action` | `'created' \| 'updated' \| 'skipped' \| 'failed'` | The specific operation performed on this article. |
| `wordCount` | `number` (optional) | The approximate length of the generated article. |
| `outputPath` | `string` (optional) | The absolute filesystem path where the article was written. |
| `error` | `Error` (optional) | The error object if the action resulted in a failure. |
| `groundingScore` | `number` (optional) | A validation score (0-1) representing how well the article is supported by source material. |

## Examples

### Processing a Synthesis Result
This example demonstrates how to handle the result of a synthesis operation to provide a summary to the user.

```typescript
import { SynthesisResult } from './types';

function printSummary(result: SynthesisResult) {
  console.log(`Synthesis complete in ${result.durationMs}ms`);
  console.log(`Created: ${result.created}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`Failed:  ${result.failed}`);

  if (result.failed > 0) {
    const failures = result.articles.filter(a => a.action === 'failed');
    failures.forEach(f => {
      console.error(`Failed to synthesize ${f.canonicalTitle}: ${f.error?.message}`);
    });
  }
}
```

## See Also
* [[ArticleSynthesisResult]]
* [[SynthesisOptions]]