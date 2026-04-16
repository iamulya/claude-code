---
title: CandidateConcept
entity_type: api
summary: Represents a potential new concept identified during static analysis that is not yet in the knowledge base registry.
export_name: CandidateConcept
source_file: src/knowledge/compiler/extractor/types.ts
category: type
stub: false
compiled_at: 2026-04-16T14:22:59.218Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/extractor/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/extractor/types.ts
confidence: 1
---

## Overview
`CandidateConcept` is a TypeScript type used within the YAAF knowledge compiler subsystem. It represents a concept discovered during the extraction phase that does not currently exist in the Knowledge Base (KB) registry. 

When the compiler's extractor identifies a term or entity that appears significant but lacks a corresponding article, it flags it as a candidate. The Knowledge Synthesizer can then use this information to generate stub articles or queue the concept for a future full compilation pass. High-confidence candidates are typically prioritized for stub creation.

## Signature
```typescript
export type CandidateConcept = {
  name: string
  entityType: string
  description: string
  mentionCount: number
}
```

## Methods & Properties
- `name`: The canonical name suggested by the LLM. This should ideally align with the ontology's vocabulary.
- `entityType`: The suggested entity type identifier. This must correspond to one of the entity types defined in the system ontology.
- `description`: A one-sentence description of the concept extracted directly from the source material.
- `mentionCount`: The total number of times this specific concept was mentioned within the analyzed source file.

## Examples
### Defining a Candidate Concept
This example demonstrates how a `CandidateConcept` is structured when returned by the extractor.

```typescript
import { CandidateConcept } from './types.js';

const newConcept: CandidateConcept = {
  name: "Vector Embeddings",
  entityType: "concept",
  description: "Numerical representations of data points in a high-dimensional space used for semantic search.",
  mentionCount: 5
};
```

### Usage in an Article Plan
`CandidateConcept` objects are typically found within the `candidateNewConcepts` array of an `ArticlePlan`.

```typescript
const plan = {
  docId: "concepts/retrieval-augmented-generation",
  canonicalTitle: "Retrieval-Augmented Generation",
  // ... other fields
  candidateNewConcepts: [
    {
      name: "Vector Embeddings",
      entityType: "concept",
      description: "Numerical representations of data points in a high-dimensional space.",
      mentionCount: 5
    }
  ]
};
```

## See Also
- `ArticlePlan`
- `CompilationPlan`