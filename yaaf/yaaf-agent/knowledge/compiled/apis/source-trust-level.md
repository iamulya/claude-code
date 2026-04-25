---
summary: Defines the trustworthiness level of a source document, used in the knowledge compilation process.
export_name: SourceTrustLevel
source_file: src/knowledge/compiler/ingester/types.ts
category: type
belongs_to: subsystems/knowledge-ingestion-system
title: SourceTrustLevel
entity_type: api
search_terms:
 - source credibility
 - document trust level
 - knowledge source quality
 - grounding score weighting
 - academic source type
 - documentation source type
 - web source type
 - how to classify source documents
 - source provenance
 - trustworthiness of knowledge sources
 - C4/A1
 - compiled_from_quality
 - SOURCE_TRUST_WEIGHTS
stub: false
compiled_at: 2026-04-24T17:39:19.446Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/extractor/types.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`SourceTrustLevel` is a type that classifies the credibility of a source document within the YAAF knowledge compilation pipeline [Source 2]. It is used during the grounding and synthesis stages to determine how much weight to give to the information from a particular source [Source 2].

This classification directly influences two key outcomes:
1.  It affects the weighting of the [Grounding Score](../concepts/grounding-score.md). The related `SOURCE_TRUST_WEIGHTS` constant applies multipliers to scores based on the trust level, preventing a single confident but untrustworthy source from passing the grounding check [Source 2].
2.  It determines the value of the `compiled_from_quality` [Frontmatter](../concepts/frontmatter.md) field in the final compiled knowledge base article [Source 2].

The trust level is typically set by the [Ingester](./ingester.md) based on heuristics, such as file location (e.g., files in a `papers/` directory are marked `academic`) or origin (e.g., web-clipped content is marked `web`). The default level is `unknown`. This automatically assigned level can be overridden by a user by setting a `source_trust` field in the frontmatter of a raw source file [Source 2].

[when](./when.md) multiple source documents contribute to a single compiled article, the system adopts a conservative approach: the final `sourceTrust` for the article plan is set to the lowest trust level among all contributing sources [Source 1].

## Signature

`SourceTrustLevel` is a string literal type with four possible values [Source 2].

```typescript
export type SourceTrustLevel = "academic" | "documentation" | "web" | "unknown";
```

The levels are defined as follows [Source 2]:

| Level         | Description                                      |
|---------------|--------------------------------------------------|
| `academic`      | Peer-reviewed paper, ArXiv preprint, conference proceedings. |
| `documentation` | Official library/product docs, RFCs, specifications. |
| `web`           | Blog post, news article, web-clipped content.    |
| `unknown`       | Default level when provenance has not been determined. |

## Examples

### Example 1: Ingested Content

An ingester processing a PDF from a directory named `papers/` would likely produce an `IngestedContent` object with the `sourceTrust` set to `academic`.

```typescript
import type { IngestedContent } from 'yaaf';

const ingestedPaper: IngestedContent = {
  text: "Attention is all you need...",
  images: [],
  mimeType: "application/pdf",
  sourceFile: "/path/to/raw/papers/attention-is-all-you-need.pdf",
  title: "Attention Is All You Need",
  lossy: true,
  sourceTrust: "academic", // Set by the ingester based on directory convention
};
```

### Example 2: Article Plan

The [Concept Extractor](../subsystems/concept-extractor.md) uses the `sourceTrust` from one or more `IngestedContent` objects to set the trust level on the resulting `ArticlePlan`.

```typescript
import type { ArticlePlan } from 'yaaf';

const plan: ArticlePlan = {
  docId: "concepts/attention-mechanism",
  canonicalTitle: "Attention Mechanism",
  entityType: "concept",
  action: "update",
  sourcePaths: ["/path/to/raw/papers/attention-is-all-you-need.pdf"],
  knownLinkDocIds: ["concepts/transformer-architecture"],
  candidateNewConcepts: [],
  suggestedFrontmatter: {
    // ...
  },
  confidence: 0.95,
  sourceTrust: "academic", // Inherited from the source document
};
```

## Sources

[Source 1]: src/knowledge/compiler/extractor/types.ts
[Source 2]: src/knowledge/compiler/ingester/types.ts