---
summary: Configuration options for the MultiLayerGroundingPlugin, including thresholds and optional functions for multi-stage grounding.
title: MultiLayerGroundingOptions
entity_type: api
export_name: MultiLayerGroundingOptions
source_file: src/knowledge/compiler/groundingPlugin.ts
category: type
search_terms:
 - grounding configuration
 - hallucination detection settings
 - L1 grounding threshold
 - L2 embedding similarity
 - L3 LLM verification
 - NLI verifier function
 - keyword overlap threshold
 - cosine similarity threshold
 - configure grounding plugin
 - fact checking options
 - vocabulary alias map
 - entailment threshold
 - contradiction detection
stub: false
compiled_at: 2026-04-25T00:10:14.789Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/groundingPlugin.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`MultiLayerGroundingOptions` is a type that defines the configuration for the `MultiLayerGroundingPlugin`, a built-in adapter for detecting hallucinations in synthesized knowledge base articles. It allows for fine-tuning a multi-stage verification pipeline that progressively checks if claims are supported by source material [Source 1].

The pipeline consists of up to four layers:

-   **L1: Vocabulary Overlap:** A fast, zero-cost check based on stemmed token overlap. This layer is always active.
-   **L2: Embedding [Cosine Similarity](../concepts/cosine-similarity.md):** An optional check that compares the semantic similarity of a claim and source chunks. Enabled by providing an `embedFn`.
-   **L3: [LLM](../concepts/llm.md) Verification:** An optional, higher-cost check where an [LLM](../concepts/llm.md) is asked to verify a claim against source passages. Enabled by providing a `generateFn`.
-   **L4: Natural Language Inference (NLI):** An optional check using a dedicated classifier to determine if a source entails, contradicts, or is neutral to a claim. Enabled by providing an `nliVerifyFn`.

This configuration object allows users to enable optional layers, set the thresholds for each layer's verdict, cap costs for expensive layers, and provide vocabulary context for more accurate keyword matching [Source 1].

## Signature

```typescript
export type MultiLayerGroundingOptions = {
  embedFn?: (text: string) => Promise<number[]>;
  generateFn?: (prompt: string) => Promise<string>;
  nliVerifyFn?: NLIVerifyFn;
  keywordSupportThreshold?: number;
  keywordRejectThreshold?: number;
  embeddingSupportThreshold?: number;
  embeddingRejectThreshold?: number;
  maxL3Claims?: number;
  maxL4Claims?: number;
  nliEntailmentThreshold?: number;
  nliContradictionThreshold?: number;
  vocabularyAliases?: Map<string, string[]>;
};
```

### Properties

-   **`embedFn`** `?: (text: string) => Promise<number[]>`
    An optional function for L2 verification. It takes a string of text and should return a numeric vector (embedding). Providing this function enables the L2 embedding similarity check [Source 1].

-   **`generateFn`** `?: (prompt: string) => Promise<string>`
    An optional [LLM](../concepts/llm.md) generation function for L3 verification. It takes a prompt and should return the model's textual response. Providing this function enables the L3 [LLM](../concepts/llm.md) verification check [Source 1].

-   **`nliVerifyFn`** `?: NLIVerifyFn`
    An optional Natural Language Inference (NLI) verifier function for L4 verification. This function takes a premise (source) and a hypothesis (claim) and returns a verdict of `entailment`, `contradiction`, or `neutral`. It is used to definitively flag contradictions, which is critical for detecting hallucinations where a model asserts the opposite of the source material. Providing this function enables the L4 NLI check [Source 1].

-   **`keywordSupportThreshold`** `?: number`
    The L1 threshold for minimum stemmed token overlap required to mark a claim as `supported`.
    **Default:** `0.40` (40% overlap) [Source 1].

-   **`keywordRejectThreshold`** `?: number`
    The L1 threshold for stemmed token overlap below which a claim is immediately marked as `unsupported`.
    **Default:** `0.15` (15% overlap) [Source 1].

-   **`embeddingSupportThreshold`** `?: number`
    The L2 threshold for minimum [Cosine Similarity](../concepts/cosine-similarity.md) required to mark a claim as `supported`.
    **Default:** `0.75` [Source 1].

-   **`embeddingRejectThreshold`** `?: number`
    The L2 threshold for [Cosine Similarity](../concepts/cosine-similarity.md) below which a claim is marked as `unsupported`.
    **Default:** `0.40` [Source 1].

-   **`maxL3Claims`** `?: number`
    The maximum number of claims to send to L3 ([LLM](../concepts/llm.md) verification) in a single run. This caps the potential cost for articles with many uncertain claims.
    **Default:** `10` [Source 1].

-   **`maxL4Claims`** `?: number`
    The maximum number of claims to send to L4 (NLI verification). This helps manage costs if the NLI backend is a paid API.
    **Default:** `20` [Source 1].

-   **`nliEntailmentThreshold`** `?: number`
    The minimum NLI confidence score for an `entailment` verdict to be considered `supported`. Claims with confidence below this threshold remain `uncertain`.
    **Default:** `0.65` [Source 1].

-   **`nliContradictionThreshold`** `?: number`
    The minimum NLI confidence score for a `contradiction` verdict to be considered `unsupported`. Claims with confidence below this threshold remain `uncertain`.
    **Default:** `0.65` [Source 1].

-   **`vocabularyAliases`** `?: Map<string, string[]>`
    An optional map for L1 synonym expansion. It maps a stemmed alias token to an array of its canonical and sibling stemmed tokens from an [Ontology](../concepts/ontology.md) [Vocabulary](../concepts/vocabulary.md). This allows the L1 check to match related terms (e.g., "attention blocks" and "transformer layers") if they are defined as aliases for the same concept. This map can be created using the `buildVocabularyAliasMap` function [Source 1].

## Examples

### Basic L1-Only Configuration

This configuration relies only on the default keyword overlap check, incurring no external API costs.

```typescript
import { MultiLayerGroundingPlugin, MultiLayerGroundingOptions } from 'yaaf';

// An empty options object uses L1 grounding with default thresholds.
const l1Options: MultiLayerGroundingOptions = {};

const groundingPlugin = new MultiLayerGroundingPlugin(l1Options);
```

### Enabling L2 Embedding Checks

Provide an `embedFn` to add the [Cosine Similarity](../concepts/cosine-similarity.md) verification layer.

```typescript
import { MultiLayerGroundingPlugin, MultiLayerGroundingOptions } from 'yaaf';
import { MyEmbeddingModel } from './models';

const l1AndL2Options: MultiLayerGroundingOptions = {
  embedFn: async (text: string) => await MyEmbeddingModel.embed(text),
  embeddingSupportThreshold: 0.80, // Override the default threshold
};

const groundingPlugin = new MultiLayerGroundingPlugin(l1AndL2Options);
```

### Enabling the Full L1-L3 Pipeline

Provide both `embedFn` and `generateFn` to enable all three main verification layers.

```typescript
import { MultiLayerGroundingPlugin, MultiLayerGroundingOptions } from 'yaaf';
import { MyEmbeddingModel, MyLLM } from './models';

const fullPipelineOptions: MultiLayerGroundingOptions = {
  embedFn: async (text: string) => await MyEmbeddingModel.embed(text),
  generateFn: async (prompt: string) => await MyLLM.generate(prompt),
  maxL3Claims: 5, // Limit LLM calls to cap costs
};

const groundingPlugin = new MultiLayerGroundingPlugin(fullPipelineOptions);
```

## See Also

-   `MultiLayerGroundingPlugin` (The plugin that uses these options)
-   `buildVocabularyAliasMap` (A utility function to create the `vocabularyAliases` map)
-   `NLIVerifyFn` (The type for the L4 verifier function)
-   [Ontology](../concepts/ontology.md)
-   [Cosine Similarity](../concepts/cosine-similarity.md)
-   Knowledge Compiler (subsystem)

## Sources

-   [Source 1]: `src/knowledge/compiler/groundingPlugin.ts`