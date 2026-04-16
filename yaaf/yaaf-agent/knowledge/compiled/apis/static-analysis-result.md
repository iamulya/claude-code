---
title: StaticAnalysisResult
entity_type: api
summary: The output of the static analysis phase, containing identified entity mentions and registry matches.
export_name: StaticAnalysisResult
source_file: src/knowledge/compiler/extractor/types.ts
category: type
stub: false
compiled_at: 2026-04-16T14:23:04.875Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/extractor/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/extractor/types.ts
confidence: 1
---

## Overview
`StaticAnalysisResult` is a TypeScript type representing the data produced during the initial, non-LLM phase of the Concept Extractor's workflow. This analysis is performed to identify known entities through vocabulary scanning and registry lookups before any generative models are invoked.

The primary purposes of this result are to provide context for subsequent LLM prompts, identify existing knowledge base articles that may need updating, and estimate token usage to manage prompt window constraints.

## Signature / Constructor

```typescript
export type StaticAnalysisResult = {
  /** Known entities mentioned in the source (from vocabulary scan) */
  entityMentions: Array<{
    canonicalTerm: string
    entityType?: string
    docId?: string
    count: number
  }>

  /** Registry entries that already have compiled articles for mentioned entities */
  registryMatches: Array<{
    docId: string
    canonicalTitle: string
    entityType: string
    confidence: number  // 0-1, based on title similarity + mention count
  }>

  /**
   * Entity type hint from directory convention.
   * e.g., raw/papers/ → 'research_paper', raw/tools/ → 'tool'
   */
  directoryHint?: string

  /**
   * Approximate token count of the source text.
   * Used to decide how much to truncate for the LLM prompt.
   */
  tokenEstimate: number
}
```

## Methods & Properties

### Properties
| Property | Type | Description |
| :--- | :--- | :--- |
| `entityMentions` | `Array<Object>` | A collection of entities identified in the source text via a vocabulary scan. Each entry includes the `canonicalTerm`, the number of occurrences (`count`), and optionally the `entityType` and `docId`. |
| `registryMatches` | `Array<Object>` | A list of existing articles in the knowledge base registry that match the identified entities. Includes a `confidence` score (0-1) based on title similarity and mention frequency. |
| `directoryHint` | `string` (optional) | A suggested entity type derived from the source file's directory path (e.g., files in `raw/papers/` may be hinted as `research_paper`). |
| `tokenEstimate` | `number` | An approximation of the source text's length in tokens, used to determine if truncation is necessary for LLM processing. |

## Examples

### Basic Usage
This example demonstrates a typical `StaticAnalysisResult` object generated after scanning a source file about the Transformer architecture.

```typescript
const analysis: StaticAnalysisResult = {
  entityMentions: [
    {
      canonicalTerm: "Attention Mechanism",
      entityType: "concept",
      docId: "concepts/attention-mechanism",
      count: 5
    }
  ],
  registryMatches: [
    {
      docId: "concepts/attention-mechanism",
      canonicalTitle: "Attention Mechanism",
      entityType: "concept",
      confidence: 0.95
    }
  ],
  directoryHint: "research_paper",
  tokenEstimate: 1250
};
```