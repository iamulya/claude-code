---
export_name: ArticleSynthesisResult
source_file: src/knowledge/compiler/synthesizer/types.ts
category: type
title: ArticleSynthesisResult
entity_type: api
summary: Represents the outcome of synthesizing a single knowledge base article during a compilation run.
stub: false
compiled_at: 2026-04-16T14:27:09.868Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/synthesizer/types.ts
confidence: 1
---

## Overview
The `ArticleSynthesisResult` type defines the structure of the object returned by the `KnowledgeSynthesizer` for each individual article processed during a compilation run. It provides metadata about the synthesis operation, including the action taken, the location of the output file, and validation metrics such as grounding scores.

This type is primarily used by the YAAF knowledge compiler to track progress and report the final status of a synthesis batch within a `SynthesisResult` object.

## Signature
```typescript
export type ArticleSynthesisResult = {
  /** The docId of this article (path relative to compiled/) */
  docId: string
  /** Canonical article title */
  canonicalTitle: string
  /** What was done */
  action: 'created' | 'updated' | 'skipped' | 'failed'
  /** Approximate word count of the written article */
  wordCount?: number
  /** Absolute path to the written file */
  outputPath?: string
  /** Error if action = 'failed' */
  error?: Error
  /** Phase 1C: Registry entry for batch application after concurrent synthesis */
  registryEntry?: ConceptRegistryEntry
  /** Phase 5C: Grounding validation score (0-1) */
  groundingScore?: number
}
```

## Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `docId` | `string` | The unique identifier for the article, representing its path relative to the `compiled/` directory. |
| `canonicalTitle` | `string` | The official title of the article. |
| `action` | `'created' \| 'updated' \| 'skipped' \| 'failed'` | The outcome of the synthesis attempt for this specific article. |
| `wordCount` | `number` | (Optional) The approximate number of words in the synthesized markdown body. |
| `outputPath` | `string` | (Optional) The absolute path on the local filesystem where the article was written. |
| `error` | `Error` | (Optional) The error encountered if the synthesis action failed. |
| `registryEntry` | `ConceptRegistryEntry` | (Optional) The ontology registry entry associated with this article, used for batch updates after concurrent processing. |
| `groundingScore` | `number` | (Optional) A score between 0 and 1 representing how well the synthesized content is grounded in the source material. |

## Examples

### Successful Synthesis Result
```typescript
const successResult: ArticleSynthesisResult = {
  docId: 'api/ArticleSynthesisResult.md',
  canonicalTitle: 'ArticleSynthesisResult',
  action: 'created',
  wordCount: 245,
  outputPath: '/home/user/project/docs/compiled/api/ArticleSynthesisResult.md',
  groundingScore: 0.98
};
```

### Failed Synthesis Result
```typescript
const failureResult: ArticleSynthesisResult = {
  docId: 'concepts/Agent.md',
  canonicalTitle: 'Agent',
  action: 'failed',
  error: new Error('LLM provider timeout during synthesis')
};
```