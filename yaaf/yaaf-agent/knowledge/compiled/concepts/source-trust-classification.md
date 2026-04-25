---
summary: A mechanism in YAAF's knowledge compilation pipeline to assess and weight the credibility of source documents.
title: Source Trust Classification
entity_type: concept
related_subsystems:
 - knowledge
search_terms:
 - source credibility
 - knowledge grounding score
 - trustworthy sources
 - how to weight documents
 - C4/A1
 - SourceTrustLevel
 - SOURCE_TRUST_WEIGHTS
 - academic vs web source
 - document ingestion pipeline
 - compiled_from_quality
 - preventing hallucinations from bad sources
 - source provenance
stub: false
compiled_at: 2026-04-24T18:02:19.612Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/types.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

Source Trust Classification is a mechanism within YAAF's knowledge compilation pipeline that assigns a credibility level to each source document [Source 1]. This classification, identified in the source code as `C4/A1`, serves two primary purposes: it influences the `compiled_from_quality` [Frontmatter](./frontmatter.md) field in the final compiled article, and it adjusts the weighting of the [Grounding Score](./grounding-score.md) during knowledge synthesis [Source 1]. The system is designed to prevent a single, confident but untrustworthy source from disproportionately influencing the compiled knowledge and passing grounding checks [Source 1].

## How It Works in YAAF

The classification is implemented through the `SourceTrustLevel` type, which defines four distinct levels of credibility for a source document [Source 1].

| Level         | Description                                      |
|---------------|--------------------------------------------------|
| `academic`      | Peer-reviewed paper, ArXiv preprint, conference proceedings  |
| `documentation` | Official library/product docs, RFCs, specifications       |
| `web`           | Blog post, news article, web-clipped content     |
| `unknown`       | Default level [when](../apis/when.md) provenance cannot be determined              |

*Table data from [Source 1].*

During the knowledge synthesis process, each trust level is mapped to a numerical weight via the `SOURCE_TRUST_WEIGHTS` constant. These weights act as multipliers on the grounding score calculated for claims derived from the source [Source 1].

```typescript
export const SOURCE_TRUST_WEIGHTS: Record<SourceTrustLevel, number> = {
  academic:      1.00,   // Full weight — peer-reviewed
  documentation: 0.90,   // High weight — official primary source
  web:           0.75,   // Reduced — unvetted secondary source
  unknown:       0.80,   // Slight penalty until classified
};
```

For example, a claim grounded solely in a `web` source with an initial score of 0.9 would have its final score adjusted to `0.9 * 0.75 = 0.675` [Source 1].

The initial `sourceTrust` level is set by the [Ingester](../apis/ingester.md) subsystem during the first stage of the pipeline. Ingesters use heuristics based on the source's location or origin to make a preliminary classification [Source 1]:
*   PDFs in directories named `papers/` or `arxiv/` are classified as `academic`.
*   Content clipped from a URL is classified as `web`.
*   Markdown files in `docs/` directories are classified as `documentation`.
*   All other sources default to `unknown`.

This classification is stored in the `sourceTrust` field of the `IngestedContent` object, which is the standard output of any Ingester [Source 1].

## Configuration

The trust level automatically assigned by an Ingester can be manually overridden by the user. To do so, a developer can add a `source_trust` field to the frontmatter of the raw source file itself [Source 1]. For example, a user can explicitly classify a local PDF as `academic` even if it is not in a recognized directory.

## Sources

[Source 1] src/knowledge/compiler/ingester/types.ts