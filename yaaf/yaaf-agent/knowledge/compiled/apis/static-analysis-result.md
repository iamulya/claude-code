---
summary: Represents the output of the static (non-LLM) analysis pass, providing initial entity mentions and token estimates.
export_name: StaticAnalysisResult
source_file: src/knowledge/compiler/extractor/types.ts
category: type
belongs_to: subsystems/knowledge-compilation-system
title: StaticAnalysisResult
entity_type: api
search_terms:
 - pre-LLM analysis
 - static knowledge extraction
 - token count estimation
 - entity mention detection
 - vocabulary scan results
 - knowledge compiler static pass
 - how to estimate tokens before LLM call
 - find existing entities in text
 - directory-based entity type
 - registry match
 - non-LLM analysis
 - initial source analysis
stub: false
compiled_at: 2026-04-24T17:40:29.392Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`StaticAnalysisResult` is a type that represents the data collected during the initial, static analysis phase of the knowledge compilation process [Source 2]. This phase runs before any calls to a Large Language Model ([LLM](../concepts/llm.md)) are made. Its purpose is to efficiently gather context about a source document, such as identifying mentions of known entities, estimating the document's size in tokens, and inferring potential [Entity Type](../concepts/entity-type.md)s from its file path [Source 2].

This preliminary analysis is a cost-saving and context-building measure. The token estimate helps manage LLM prompt sizes, while the identified entity mentions and registry matches provide valuable context for the subsequent LLM-powered extraction and synthesis steps [Source 2].

## Signature

`StaticAnalysisResult` is a TypeScript type alias with the following structure [Source 2]:

```typescript
export type StaticAnalysisResult = {
  /** Known entities mentioned in the source (from [[[[[[[[Vocabulary]]]]]]]] scan) */
  entityMentions: Array<{
    canonicalTerm: string;
    entityType?: string;
    docId?: string;
    count: number;
  }>;

  /** Registry entries that already have compiled articles for mentioned entities */
  registryMatches: Array<{
    docId: string;
    canonicalTitle: string;
    entityType: string;
    confidence: number; // 0-1, based on title similarity + mention count
  }>;

  /**
   * Entity type hint from directory convention.
   * e.g., raw/papers/ → 'research_paper', raw/tools/ → 'tool'
   */
  directoryHint?: string;

  /**
   * Approximate token count of the source text.
   * Used to decide how much to truncate for the LLM prompt.
   */
  tokenEstimate: number;
};
```

### Properties

*   **`entityMentions`**: An array of objects, where each object represents a known concept from the knowledge base's Vocabulary that was found in the source text. It includes the canonical name of the concept, its Entity Type, its unique document ID (`docId`) if an article for it exists, and the number of times it was mentioned (`count`) [Source 2].
*   **`registryMatches`**: An array of existing knowledge base articles that are likely related to the source document. The match is determined by factors like title similarity and the count of shared entity mentions. Each match includes the article's `docId`, title, entity type, and a confidence score between 0 and 1 [Source 2].
*   **`directoryHint`**: An optional string that suggests an entity type based on the source file's directory path. For example, a file in a `raw/papers/` directory might receive a hint of `'research_paper'` [Source 2].
*   **`tokenEstimate`**: A numerical approximation of the number of tokens in the source document. This is crucial for managing [Context Window](../concepts/context-window.md) limits and costs [when](./when.md) preparing prompts for an LLM [Source 2].

## Examples

Below is an example of a `StaticAnalysisResult` object that might be generated from analyzing a source file about FlashAttention located in a `papers` directory.

```json
{
  "entityMentions": [
    {
      "canonicalTerm": "Transformer",
      "entityType": "architecture",
      "docId": "architectures/transformer",
      "count": 12
    },
    {
      "canonicalTerm": "Attention Mechanism",
      "entityType": "concept",
      "docId": "concepts/attention-mechanism",
      "count": 8
    }
  ],
  "registryMatches": [
    {
      "docId": "concepts/attention-mechanism",
      "canonicalTitle": "Attention Mechanism",
      "entityType": "concept",
      "confidence": 0.85
    }
  ],
  "directoryHint": "research_paper",
  "tokenEstimate": 4520
}
```

## Sources

[Source 1]: src/knowledge/compiler/extractor/index.ts
[Source 2]: src/knowledge/compiler/extractor/types.ts