---
summary: A constant record mapping `SourceTrustLevel` values to numerical weights used in grounding score calculations.
export_name: SOURCE_TRUST_WEIGHTS
source_file: src/knowledge/compiler/ingester/types.ts
category: constant
title: SOURCE_TRUST_WEIGHTS
entity_type: api
search_terms:
 - source credibility multiplier
 - grounding score weighting
 - trust level scores
 - how to weight different sources
 - academic vs web source
 - documentation source trust
 - untrustworthy source penalty
 - C4/A1 source classification
 - knowledge ingestion scoring
 - source provenance weight
 - compiled_from_quality influence
stub: false
compiled_at: 2026-04-24T17:39:20.377Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/ingester/types.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`SOURCE_TRUST_WEIGHTS` is a constant that provides numerical multipliers for different levels of source document credibility, as defined by the `SourceTrustLevel` type [Source 1]. It is a key component of the YAAF [Knowledge Compiler](../subsystems/knowledge-compiler.md)'s grounding and synthesis process.

These weights are used to adjust the final [Grounding Score](../concepts/grounding-score.md) of a compiled article. The purpose is to penalize articles generated from less trustworthy sources (e.g., unvetted web content) and assign full confidence to articles derived from high-credibility sources (e.g., peer-reviewed academic papers). This mechanism helps prevent a single, confident-sounding but untrustworthy source from passing the grounding check and being added to the knowledge base [Source 1].

The trust level and its corresponding weight also influence the `compiled_from_quality` field in a compiled article's [Frontmatter](../concepts/frontmatter.md) [Source 1].

## Signature

`SOURCE_TRUST_WEIGHTS` is a constant object of type `Record<SourceTrustLevel, number>`.

```typescript
export const SOURCE_TRUST_WEIGHTS: Record<SourceTrustLevel, number> = {
  academic:      1.00,
  documentation: 0.90,
  web:           0.75,
  unknown:       0.80,
};
```

### Values

| Key (`SourceTrustLevel`) | Value (Weight) | Description (from source comments) [Source 1] |
| :----------------------- | :------------- | :-------------------------------------------- |
| `academic`               | `1.00`         | Full weight — peer-reviewed                   |
| `documentation`          | `0.90`         | High weight — official primary source         |
| `web`                    | `0.75`         | Reduced — unvetted secondary source           |
| `unknown`                | `0.80`         | Slight penalty until classified               |

## Examples

### Calculating an Adjusted Grounding Score

This example demonstrates how the weights are applied to a raw grounding score calculated by the system.

```typescript
import { SOURCE_TRUST_WEIGHTS, SourceTrustLevel } from 'yaaf';

function calculateAdjustedScore(rawScore: number, trustLevel: SourceTrustLevel): number {
  const weight = SOURCE_TRUST_WEIGHTS[trustLevel];
  return rawScore * weight;
}

// A high score from an unvetted web source is penalized.
const webSourceScore = 0.9;
const adjustedWebScore = calculateAdjustedScore(webSourceScore, 'web');
console.log(`Web source: ${webSourceScore} -> ${adjustedWebScore}`);
// Expected output: Web source: 0.9 -> 0.675

// A high score from a peer-reviewed paper receives full weight.
const academicSourceScore = 0.9;
const adjustedAcademicScore = calculateAdjustedScore(academicSourceScore, 'academic');
console.log(`Academic source: ${academicSourceScore} -> ${adjustedAcademicScore}`);
// Expected output: Academic source: 0.9 -> 0.9

// A score from an official documentation source is slightly reduced.
const docSourceScore = 0.95;
const adjustedDocScore = calculateAdjustedScore(docSourceScore, 'documentation');
console.log(`Documentation source: ${docSourceScore} -> ${adjustedDocScore}`);
// Expected output: Documentation source: 0.95 -> 0.855
```

## Sources

[Source 1] src/knowledge/compiler/[Ingester](./ingester.md)/types.ts