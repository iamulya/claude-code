---
summary: An adapter interface for plugins that provide knowledge grounding and hallucination detection capabilities.
title: KB Grounding Adapter
entity_type: concept
related_subsystems:
 - "[Knowledge Base System](../subsystems/knowledge-base-system.md)"
see_also:
 - "[Adapter Interfaces](./adapter-interfaces.md)"
 - "[Grounding (LLM)](./grounding-llm.md)"
 - "[Hallucination (LLM)](./hallucination-llm.md)"
 - "[Knowledge Base System](../subsystems/knowledge-base-system.md)"
 - "[Cosine Similarity](./cosine-similarity.md)"
 - "[Jaccard Similarity](./jaccard-similarity.md)"
 - "[Ontology](./ontology.md)"
search_terms:
 - hallucination detection
 - grounding LLM output
 - fact checking agent responses
 - verifying claims against sources
 - multi-layer grounding
 - vocabulary overlap check
 - embedding similarity for verification
 - NLI for fact checking
 - natural language inference verification
 - prevent model from making things up
 - connect response to source material
 - MultiLayerGroundingPlugin
 - KBGroundingAdapter interface
 - claim entailment
 - contradiction detection
stub: false
compiled_at: 2026-04-25T00:20:16.163Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/groundingPlugin.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

A KB Grounding Adapter is a type of [Adapter Interface](./adapter-interfaces.md) within YAAF designed for plugins that perform [grounding](./grounding-llm.md) and [hallucination detection](./hallucination-llm.md) [Source 1]. When an agent synthesizes new content, such as a knowledge base article from various source documents, this adapter provides a standardized mechanism to verify that the generated claims are factually supported by the original source material. Its primary purpose is to enhance the reliability and trustworthiness of agent-generated content within the [Knowledge Base System](../subsystems/knowledge-base-system.md) by providing a pluggable fact-checking pipeline [Source 1].

## How It Works in YAAF

The primary built-in implementation of the `KBGroundingAdapter` interface is the `MultiLayerGroundingPlugin` [Source 1]. This plugin uses a multi-stage pipeline to validate claims, employing progressively more computationally expensive and sophisticated methods at each stage. This layered approach allows for efficient, low-cost rejection of clearly unsupported claims while reserving powerful [LLM](./llm.md)-based analysis for more ambiguous cases [Source 1].

The pipeline consists of up to four layers:

**L1: Vocabulary Overlap**
This layer is always active and incurs no [LLM](./llm.md) cost. It stems the tokens of both the generated claim and the source text and computes a "claim containment" score, which measures the fraction of the claim's stemmed tokens that appear in the source's stemmed tokens. This differs from a standard [Jaccard Similarity](./jaccard-similarity.md) index because it focuses on how much of the claim is supported, not how much of the source is covered [Source 1].
- Claims with high overlap (e.g., ≥40%) are marked `supported`.
- Claims with low overlap (e.g., <15%) are marked `unsupported`.
- Ambiguous claims, or those with high overlap but containing negation markers, are escalated to the next available layer [Source 1].
This layer can also use an [Ontology](./ontology.md) vocabulary alias map to expand synonyms, allowing it to match related terms (e.g., "attention blocks" and "transformer layers") [Source 1].

**L2: Embedding Cosine Similarity**
This is an optional layer that requires an embedding function (`embedFn`) to be configured. It generates vector embeddings for the claim and each source chunk and calculates their [Cosine Similarity](./cosine-similarity.md).
- Claims with high similarity (e.g., ≥0.75) to a source chunk are marked `supported`.
- Claims with low similarity (e.g., <0.4) are marked `unsupported`.
- Claims with intermediate scores are escalated to the next layer [Source 1].

**L3: LLM Verification**
This optional layer uses a configured generation function (`generateFn`) to ask an [LLM](./llm.md) to directly verify if the source passages support a given claim. To mitigate [Prompt Injection](./prompt-injection.md) risks, this layer relies on structured JSON-only responses from the [LLM](./llm.md) [Source 1].

**L4: NLI Verification**
This optional layer uses a Natural Language Inference (NLI) classifier (`nliVerifyFn`). It classifies the relationship between a source (premise) and a claim (hypothesis) into one of three categories: `entailment`, `contradiction`, or `neutral`. This layer is particularly effective at identifying claims that are explicitly refuted by the source material, a scenario that other layers might simply classify as `uncertain`. The NLI function can be backed by local models (e.g., ONNX), LLM APIs, or custom endpoints [Source 1].

## Configuration

The behavior of the `KBGroundingAdapter` is configured by instantiating an implementation like `MultiLayerGroundingPlugin` with a specific set of options. The layers that are active depend on which functions (`embedFn`, `generateFn`, `nliVerifyFn`) are provided [Source 1].

**Example: L1 Only (Zero Cost)**
```typescript
// L1 only (zero cost)
const grounding = new MultiLayerGroundingPlugin();
```

**Example: L1 + L2 (Embedding Cost)**
```typescript
// L1 + L2 (embedding cost)
const grounding = new MultiLayerGroundingPlugin({
  embedFn: async (text) => await model.embed(text),
});
```

**Example: L1 + L2 + L3 (Full Pipeline)**
```typescript
// L1 + L2 + L3 (full pipeline)
const grounding = new MultiLayerGroundingPlugin({
  embedFn: async (text) => await model.embed(text),
  generateFn: async (prompt) => await model.generate(prompt),
});
```

**Example: Using an NLI Verifier (L4)**
An NLI verifier function can be provided to enable the L4 contradiction detection layer.
```typescript
import { pipeline } from '@xenova/transformers';
const pipe = await pipeline('zero-shot-classification', 'Xenova/deberta-v3-xsmall-zeroshot-mnli-anli');

const nliVerifyFn: NLIVerifyFn = async (premise, hypothesis) => {
  const r = await pipe(hypothesis, ['entailment', 'neutral', 'contradiction'], {
    hypothesis_template: 'This example is {}.',
    multi_label: false,
  });
  const label = r.labels[0] as NLIVerdict['label'];
  return { label, confidence: r.scores[0] };
};

const grounding = new MultiLayerGroundingPlugin({
  nliVerifyFn: nliVerifyFn,
  // ... other options
});
```

Key configuration options in `MultiLayerGroundingOptions` include:
- `embedFn`: Function for L2 embedding generation.
- `generateFn`: Function for L3 LLM verification.
- `nliVerifyFn`: Function for L4 NLI classification.
- `keywordSupportThreshold` / `keywordRejectThreshold`: L1 overlap thresholds.
- `embeddingSupportThreshold` / `embeddingRejectThreshold`: L2 similarity thresholds.
- `nliEntailmentThreshold` / `nliContradictionThreshold`: L4 confidence thresholds.
- `maxL3Claims` / `maxL4Claims`: Cost-control limits for the number of claims sent to expensive layers.
- `vocabularyAliases`: A map for L1 synonym expansion, built from an [Ontology](./ontology.md) [Source 1].

## See Also

- [Adapter Interfaces](./adapter-interfaces.md)
- [Grounding (LLM)](./grounding-llm.md)
- [Hallucination (LLM)](./hallucination-llm.md)
- [Knowledge Base System](../subsystems/knowledge-base-system.md)
- [Cosine Similarity](./cosine-similarity.md)
- [Jaccard Similarity](./jaccard-similarity.md)
- [Ontology](./ontology.md)

## Sources
[Source 1]: src/knowledge/compiler/groundingPlugin.ts