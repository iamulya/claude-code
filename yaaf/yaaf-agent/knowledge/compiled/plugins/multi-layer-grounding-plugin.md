---
summary: A three-layer hallucination detection pipeline for KB article synthesis, validating content grounding.
capabilities:
 - grounding
title: MultiLayerGroundingPlugin
entity_type: plugin
built_in: true
search_terms:
 - hallucination detection
 - grounding LLM output
 - verify claims against sources
 - content validation pipeline
 - vocabulary overlap check
 - embedding similarity for grounding
 - LLM as a judge
 - NLI for fact checking
 - natural language inference verification
 - preventing model fabrication
 - source-based content verification
 - claim entailment
 - detecting contradictions
stub: false
compiled_at: 2026-04-25T00:27:15.960Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/groundingPlugin.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `MultiLayerGroundingPlugin` is a built-in plugin that provides a multi-stage pipeline for detecting hallucinations and verifying that content synthesized for a [Knowledge Base System](../subsystems/knowledge-base-system.md) is grounded in its source material [Source 1]. It implements the `KBGroundingAdapter` capability.

The plugin uses a series of progressively more expensive verification layers to check each claim [Source 1]:

*   **L1: Vocabulary Overlap:** A fast, zero-cost initial check that computes the overlap of stemmed tokens between a claim and the source text. It uses claim containment (`|A∩B|/|A|`) rather than Jaccard similarity to measure how much of the claim is supported by the source [Source 1].
*   **L2: Embedding [Cosine Similarity](../concepts/cosine-similarity.md):** An optional semantic check that embeds the claim and source chunks into vectors and measures their [Cosine Similarity](../concepts/cosine-similarity.md). This layer requires an embedding function to be provided [Source 1].
*   **L3: [LLM](../concepts/llm.md) Verification:** An optional high-level reasoning check that uses a generative [LLM](../concepts/llm.md) to verify claims against source passages. This requires a generation function [Source 1].
*   **L4: NLI Verification:** An optional Natural Language Inference (NLI) check that can definitively flag contradictions, where a source explicitly refutes a claim. This requires an NLI verifier function [Source 1].

Claims are passed down the pipeline until a definitive `supported` or `unsupported` verdict is reached. Claims that remain ambiguous after the final configured layer are marked `uncertain` [Source 1].

## Installation

As a built-in plugin, `MultiLayerGroundingPlugin` does not require separate installation. It can be imported from the YAAF package.

```typescript
import { MultiLayerGroundingPlugin } from 'yaaf';
```

## Configuration

The plugin is configured via its constructor, which accepts an options object of type [MultiLayerGroundingOptions](../apis/multi-layer-grounding-options.md).

```typescript
// L1 only (zero cost)
const grounding = new MultiLayerGroundingPlugin();

// L1 + L2 (embedding cost)
const groundingL2 = new MultiLayerGroundingPlugin({
  embedFn: async (text) => await model.embed(text),
});

// L1 + L2 + L3 (full pipeline)
const groundingL3 = new MultiLayerGroundingPlugin({
  embedFn: async (text) => await model.embed(text),
  generateFn: async (prompt) => await model.generate(prompt),
});
```

The following options are available [Source 1]:

*   `embedFn`: `(text: string) => Promise<number[]>` - An optional function for L2 verification that returns a numeric vector for a given text.
*   `generateFn`: `(prompt: string) => Promise<string>` - An optional [generation function](../apis/generate-fn.md) for L3 verification that returns an [LLM](../concepts/llm.md)'s response to a prompt.
*   `nliVerifyFn`: `(premise: string, hypothesis: string) => Promise<NLIVerdict>` - An optional function for L4 verification that classifies a claim (hypothesis) against a source passage (premise). It returns a verdict of `entailment`, `contradiction`, or `neutral`. This can be backed by local models or external APIs.
*   `keywordSupportThreshold`: `number` - The minimum stemmed token overlap for a claim to be considered `supported` in L1. Defaults to `0.40`.
*   `keywordRejectThreshold`: `number` - The maximum stemmed token overlap below which a claim is immediately considered `unsupported` in L1. Defaults to `0.15`.
*   `embeddingSupportThreshold`: `number` - The minimum [Cosine Similarity](../concepts/cosine-similarity.md) for a claim to be considered `supported` in L2. Defaults to `0.75`.
*   `embeddingRejectThreshold`: `number` - The maximum [Cosine Similarity](../concepts/cosine-similarity.md) below which a claim is considered `unsupported` in L2. Defaults to `0.40`.
*   `maxL3Claims`: `number` - The maximum number of uncertain claims to pass to L3 [LLM](../concepts/llm.md) verification to cap costs. Defaults to `10`.
*   `maxL4Claims`: `number` - The maximum number of uncertain claims to pass to L4 NLI verification. Defaults to `20`.
*   `nliEntailmentThreshold`: `number` - The minimum confidence score for an `entailment` verdict from the NLI model to be accepted as `supported`. Defaults to `0.65`.
*   `nliContradictionThreshold`: `number` - The minimum confidence score for a `contradiction` verdict from the NLI model to be accepted as `unsupported`. Defaults to `0.65`.
*   `vocabularyAliases`: `Map<string, string[]>` - An optional map for L1 synonym expansion. It allows claims to match source text even if they use different but related terms defined in an [Ontology](../concepts/ontology.md)'s [Vocabulary](../concepts/vocabulary.md). This map can be created using the `buildVocabularyAliasMap` utility function [Source 1].

## Capabilities

### Grounding

The `MultiLayerGroundingPlugin` implements the `KBGroundingAdapter` interface, providing a robust `grounding` capability. Its primary function is to take a synthesized article and a set of source documents and produce a per-claim verdict on whether each claim is supported by, contradicted by, or neutral with respect to the sources [Source 1].

The pipeline operates as follows:

1.  **L1 (Vocabulary Overlap):** All claims are first processed by this fast, lexical check. Claims with high token overlap are marked `supported`, and those with very low overlap are marked `unsupported`. Claims with intermediate scores, or those with high overlap but containing negation markers, are escalated [Source 1].
2.  **L2 (Embedding Similarity):** If `embedFn` is provided, escalated claims are compared semantically using vector embeddings. Claims with high [Cosine Similarity](../concepts/cosine-similarity.md) to a source chunk are marked `supported`, and those with low similarity are marked `unsupported`. Remaining claims are escalated [Source 1].
3.  **L3 ([LLM](../concepts/llm.md) Verification):** If `generateFn` is provided, the remaining uncertain claims are sent to an [LLM](../concepts/llm.md). The [LLM](../concepts/llm.md) is prompted to verify each claim against relevant source passages. The plugin uses JSON-only response parsing for improved safety against prompt injection [Source 1].
4.  **L4 (NLI Verification):** If `nliVerifyFn` is provided, any claims still uncertain are passed to a Natural Language Inference classifier. This layer is particularly effective at identifying explicit `contradictions`, where the source material directly refutes the claim, a type of hallucination that other layers might miss [Source 1].

The final output is a set of verdicts for each claim, complete with evidence, conforming to the [GroundingVerdictSchema](../apis/grounding-verdict-schema.md) [Source 1].

## Sources

[Source 1] src/knowledge/compiler/groundingPlugin.ts