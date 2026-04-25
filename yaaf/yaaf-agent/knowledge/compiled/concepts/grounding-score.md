---
summary: A numeric score (0-1) that measures the factual accuracy and source attribution of synthesized content, adjusted by the trust level of the source documents.
title: Grounding Score
entity_type: concept
related_subsystems:
 - knowledge_compilation_and_synthesis
see_also:
 - "[Source Trust Classification](./source-trust-classification.md)"
 - "[SourceTrustLevel](../apis/source-trust-level.md)"
 - "[SOURCE_TRUST_WEIGHTS](../apis/source-trust-weights.md)"
 - "[CompileQualityRecord](../apis/compile-quality-record.md)"
 - "[Grounding (LLM)](./grounding-llm.md)"
search_terms:
 - factual accuracy metric
 - source attribution score
 - LLM grounding check
 - how is grounding score calculated
 - source trust level
 - knowledge base quality
 - preventing LLM hallucination
 - content synthesis validation
 - compile quality history
 - grounding score weighting
 - CI gate for knowledge base
 - meanScore
 - minScore
stub: false
compiled_at: 2026-04-25T00:19:40.020Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/types.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/qualityHistory.ts
compiled_from_quality: unknown
confidence: 0.9
---

## What It Is

The Grounding Score is a metric, ranging from 0 to 1, that indicates the factual accuracy and source attribution of content synthesized by YAAF's Knowledge Compilation and Synthesis subsystem. A high score suggests that the generated content is well-supported by and directly traceable to the provided source documents, while a low score may indicate a [hallucination](./hallucination-llm.md) or content that deviates significantly from its sources. This score is a critical component of YAAF's quality control mechanisms for its knowledge base.

## How It Works in YAAF

The final Grounding Score for a piece of synthesized content is influenced by two main factors: the raw relevance score from the grounding model and the credibility of the source documents.

### Source Trust Weighting

YAAF applies a multiplier to the raw grounding score based on the [Source Trust Classification](./source-trust-classification.md) of the source material [Source 1]. Each [SourceTrustLevel](../apis/source-trust-level.md) has a predefined weight, which adjusts the score to account for source credibility. For example, content derived from peer-reviewed academic papers receives full weight, while content from unvetted web articles has its score reduced [Source 1].

This mechanism prevents a single, highly confident but untrustworthy source from producing a high final grounding score. For instance, if a synthesized article based solely on a `web` source achieves a raw score of 0.9, its final score is adjusted to `0.9 * 0.75 = 0.675` [Source 1].

### Quality Tracking and Regression Detection

After each compilation run, grounding scores are aggregated and logged in a [CompileQualityRecord](../apis/compile-quality-record.md) [Source 2]. This record captures summary statistics such as `meanScore` and `minScore` for all verified articles. These records are appended to a JSONL file (`.kb-quality-history.jsonl`), creating a historical log of knowledge base quality [Source 2].

This history enables tracking quality trends over time and is used for automated regression detection. By comparing the latest [CompileQualityRecord](../apis/compile-quality-record.md) with previous ones, the system can calculate a [QualityDelta](../apis/quality-delta.md), which highlights changes in the mean grounding score. This allows for CI/CD gates that can, for example, fail a build if the grounding score drops by a significant margin, such as 5% [Source 2].

## Configuration

The weights applied to the grounding score are defined as constants within the framework. These multipliers are associated with each [SourceTrustLevel](../apis/source-trust-level.md) and directly impact the final score calculation.

```typescript
// Source: src/knowledge/compiler/ingester/types.ts

/**
 * Score multipliers applied to the grounding score based on source trust.
 * A `web`-only article grounding at 0.9 becomes 0.9 × 0.75 = 0.675.
 * This prevents a single confident but untrustworthy source from passing grounding.
 */
export const SOURCE_TRUST_WEIGHTS: Record<SourceTrustLevel, number> = {
  academic:      1.00,   // Full weight — peer-reviewed
  documentation: 0.90,   // High weight — official primary source
  web:           0.75,   // Reduced — unvetted secondary source
  unknown:       0.80,   // Slight penalty until classified
};
```
[Source 1]

## See Also

- [Source Trust Classification](./source-trust-classification.md): The concept of categorizing sources by their credibility.
- [Grounding (LLM)](./grounding-llm.md): The general concept of connecting LLM outputs to verifiable sources.
- [SourceTrustLevel](../apis/source-trust-level.md): The API definition for the different trust classifications.
- [SOURCE_TRUST_WEIGHTS](../apis/source-trust-weights.md): The API definition for the score multipliers.
- [CompileQualityRecord](../apis/compile-quality-record.md): The data structure used to log quality metrics, including grounding scores, after a compile run.
- [QualityDelta](../apis/quality-delta.md): The data structure representing the change in quality metrics between two compiles.

## Sources

[Source 1] `src/knowledge/compiler/ingester/types.ts`
[Source 2] `src/knowledge/compiler/qualityHistory.ts`