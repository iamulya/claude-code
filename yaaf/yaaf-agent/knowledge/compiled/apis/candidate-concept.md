---
summary: Describes a concept discovered in source documents that does not yet have a KB article.
export_name: CandidateConcept
source_file: src/knowledge/compiler/extractor/types.ts
category: type
belongs_to: subsystems/knowledge-compilation-system
title: CandidateConcept
entity_type: api
search_terms:
 - new concept discovery
 - knowledge base stub generation
 - unidentified entities in source
 - concept extraction from documents
 - how to handle unknown terms
 - suggested new articles
 - ArticlePlan candidateNewConcepts
 - Knowledge Synthesizer stubs
 - LLM concept suggestion
 - ontology expansion
 - potential knowledge base entry
 - discovered term
stub: false
compiled_at: 2026-04-24T16:54:20.743Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/index.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`CandidateConcept` is a data structure that represents a new concept or entity discovered within source documents during the knowledge compilation process [Source 2]. It is used [when](./when.md) the [Concept Extractor](../subsystems/concept-extractor.md) identifies a term that does not correspond to an existing article in the knowledge base [Source 2].

This type is a key part of the `ArticlePlan`, which serves as the contract between the Concept Extractor and the [Knowledge Synthesizer](../subsystems/knowledge-synthesizer.md) subsystems. The `candidateNewConcepts` array within an `ArticlePlan` contains a list of `CandidateConcept` objects. The Knowledge Synthesizer consumes this list and may decide to create stub articles for these new concepts, or queue them for a more detailed compilation pass in the future. This mechanism allows the knowledge base to grow by automatically identifying and flagging potential new topics for inclusion [Source 2].

## Signature

The `CandidateConcept` type is defined as an object with the following structure [Source 2]:

```typescript
export type CandidateConcept = {
  /** Canonical name suggested by the [[[[[[[[LLM]]]]]]]] (should match Ontology [[[[[[[[Vocabulary]]]]]]]] if possible) */
  name: string;
  /** Suggested Entity Type — must be one of the Ontology's Entity Types */
  entityType: string;
  /** One-sentence description extracted from the source */
  description: string;
  /** Number of times this concept was mentioned in the source */
  mentionCount: number;
};
```

## Properties

- **`name`**: `string`
  The canonical name for the new concept, as suggested by the LLM. This name should ideally align with the project's [Ontology](../concepts/ontology.md) Vocabulary [Source 2].

- **`entityType`**: `string`
  The suggested [Entity Type](../concepts/entity-type.md) for the new concept. This must be a valid entity type defined in the project's ontology [Source 2].

- **`description`**: `string`
  A concise, one-sentence description of the concept, extracted directly from the source material [Source 2].

- **`mentionCount`**: `number`
  The total number of times this concept was mentioned in the source document(s) from which it was extracted [Source 2].

## Examples

A `CandidateConcept` is typically found within the `candidateNewConcepts` array of an `ArticlePlan`. The following example shows an `ArticlePlan` for updating an existing article on "Attention Mechanisms", where a new, related concept "FlashAttention" was discovered.

```typescript
import type { ArticlePlan } from 'yaaf';

const planForAttention: ArticlePlan = {
  docId: "concepts/attention-mechanism",
  canonicalTitle: "Attention Mechanism",
  entityType: "concept",
  action: "update",
  existingDocId: "concepts/attention-mechanism",
  sourcePaths: ["/path/to/new/paper-on-attention.pdf"],
  knownLinkDocIds: ["concepts/transformer-architecture"],
  candidateNewConcepts: [
    {
      name: "FlashAttention",
      entityType: "concept",
      description: "An IO-aware exact attention algorithm that uses tiling to reduce the number of memory reads/writes between GPU high bandwidth memory (HBM) and on-chip SRAM.",
      mentionCount: 12
    }
  ],
  suggestedFrontmatter: {
    tags: ["deep-learning", "nlp"]
  },
  confidence: 0.95,
  sourceTrust: 'high'
};
```

In this example, the Knowledge Synthesizer would process `planForAttention`, update the "Attention Mechanism" article, and also be prompted to create a new stub article for "FlashAttention" based on the provided `CandidateConcept` data.

## See Also

- `ArticlePlan`: The data structure that contains `CandidateConcept` objects and orchestrates the creation or update of a single knowledge base article.

## Sources

- [Source 1]: `src/knowledge/compiler/extractor/index.ts`
- [Source 2]: `src/knowledge/compiler/extractor/types.ts`