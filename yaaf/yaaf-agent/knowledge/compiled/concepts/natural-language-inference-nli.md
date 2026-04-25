---
summary: A natural language processing task that determines the logical relationship (entailment, contradiction, neutral) between two text passages.
title: Natural Language Inference (NLI)
entity_type: concept
related_subsystems:
 - knowledge
see_also:
 - "[Grounding (LLM)](./grounding-llm.md)"
 - "[Hallucination (LLM)](./hallucination-llm.md)"
search_terms:
 - entailment contradiction neutral
 - logical relationship between texts
 - how to detect contradictions
 - fact checking llm output
 - grounding claims in sources
 - NLI verifier function
 - DeBERTa-MNLI
 - zero-shot classification for verification
 - premise and hypothesis
 - using local models for fact checking
 - LLM-based verifiers
 - hallucination detection
stub: false
compiled_at: 2026-04-25T00:22:00.122Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/groundingPlugin.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

Natural Language Inference (NLI) is a task in natural language processing that assesses the logical relationship between two text passages: a **premise** (e.g., a source document) and a **hypothesis** (e.g., a claim synthesized by an [LLM](./llm.md)) [Source 1]. The goal is to classify this relationship into one of three categories [Source 1]:

*   **Entailment**: The premise logically entails the hypothesis. The hypothesis is true given the premise.
*   **Contradiction**: The premise explicitly contradicts the hypothesis. The hypothesis is false given the premise.
*   **Neutral**: The premise neither supports nor refutes the hypothesis. The truth of the hypothesis cannot be determined from the premise alone.

In YAAF, NLI serves as an advanced mechanism for [grounding](./grounding-llm.md) and detecting [hallucinations](./hallucination-llm.md). While other grounding methods might check for vocabulary overlap or semantic similarity to determine if a claim is "supported," NLI provides a more nuanced analysis. Its primary advantage is the ability to definitively identify contradictions, which are a critical form of hallucination where a model asserts the opposite of what a source document states [Source 1].

## How It Works in YAAF

NLI is implemented as an optional, fourth layer (L4) of verification within the built-in `MultiLayerGroundingPlugin` used by the knowledge base compiler [Source 1]. It is designed to be model-agnostic, allowing developers to integrate various NLI backends.

The core of the integration is the `NLIVerifyFn`, a function that a developer provides to the plugin's configuration. This function accepts a `premise` and a `hypothesis` and returns a promise resolving to an `NLIVerdict` object [Source 1]. The `NLIVerdict` contains two fields:
*   `label`: The classification (`entailment`, `contradiction`, or `neutral`).
*   `confidence`: An optional score from 0.0 to 1.0 indicating the model's confidence in its label [Source 1].

When enabled, claims that remain `uncertain` after the initial grounding layers (keyword overlap, embedding similarity, and LLM verification) are passed to the `nliVerifyFn`. The plugin then uses the returned verdict and confidence score, along with configurable thresholds (`nliEntailmentThreshold`, `nliContradictionThreshold`), to make a final decision:
*   An `entailment` verdict with confidence above the threshold marks the claim as `supported`.
*   A `contradiction` verdict with confidence above the threshold marks the claim as `unsupported`.
*   Any other outcome (e.g., `neutral` label, or confidence below the threshold) leaves the claim as `uncertain` [Source 1].

To manage cost and latency, the number of claims sent to the NLI verifier can be capped using the `maxL4Claims` option [Source 1].

The `NLIVerifyFn` can be implemented using various backends, including [Source 1]:
*   **Local ONNX models** (e.g., DeBERTa-MNLI via Transformers.js) for zero API cost.
*   **LLM APIs** (e.g., Gemini, GPT-4o, Claude) using a structured prompt that requests a JSON response with the NLI classification.
*   **Custom REST endpoints** that host a fine-tuned NLI classifier.

## Configuration

NLI is enabled by passing an `nliVerifyFn` to the `MultiLayerGroundingPlugin` constructor. Additional options control its behavior.

The following example demonstrates configuring the plugin with an `nliVerifyFn` backed by an LLM.

```typescript
import { MultiLayerGroundingPlugin } from 'yaaf-agent';
import type { NLIVerifyFn, NLIVerdict } from 'yaaf-agent';

// Example implementation of an NLI verifier using an external LLM
const nliVerifyFn: NLIVerifyFn = async (premise: string, hypothesis: string): Promise<NLIVerdict> => {
  const raw = await myLLM.complete({
    messages: [{
      role: 'user',
      content: `Classify whether the PREMISE entails, contradicts, or is neutral to the HYPOTHESIS.\n` +
        `Respond with JSON only: {"label":"entailment"|"contradiction"|"neutral","confidence":0.0-1.0}\n` +
        `PREMISE: ${premise}\nHYPOTHESIS: ${hypothesis}`,
    }],
  });
  return JSON.parse(raw.content ?? '{}');
};

// Instantiate the grounding plugin with the NLI verifier enabled
const groundingPlugin = new MultiLayerGroundingPlugin({
  // Enable L4 NLI verification
  nliVerifyFn: nliVerifyFn,

  // Optional: Cap the number of claims sent to the NLI function per article
  maxL4Claims: 20,

  // Optional: Set the minimum confidence required to accept an 'entailment' verdict
  nliEntailmentThreshold: 0.65,

  // Optional: Set the minimum confidence required to accept a 'contradiction' verdict
  nliContradictionThreshold: 0.65,

  // Other plugin options (e.g., embedFn for L2, generateFn for L3)
  // embedFn: ...,
  // generateFn: ...,
});
```
[Source 1]

## See Also

*   [Grounding (LLM)](./grounding-llm.md)
*   [Hallucination (LLM)](./hallucination-llm.md)

## Sources

[Source 1]: src/knowledge/compiler/groundingPlugin.ts