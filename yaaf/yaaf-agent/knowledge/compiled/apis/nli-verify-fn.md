---
summary: Model-agnostic function type for Natural Language Inference (NLI) verification, used to classify claims against source passages.
export_name: NLIVerifyFn
source_file: src/knowledge/compiler/groundingPlugin.ts
category: type
title: NLIVerifyFn
entity_type: api
search_terms:
 - Natural Language Inference
 - NLI function
 - entailment contradiction neutral
 - claim verification
 - fact checking function
 - grounding claims
 - hallucination detection
 - custom NLI model
 - Transformers.js NLI
 - DeBERTa-MNLI
 - LLM fact checking
 - MultiLayerGroundingPlugin verifier
 - premise and hypothesis
 - structured output for classification
stub: false
compiled_at: 2026-04-25T00:10:34.180Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/groundingPlugin.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`NLIVerifyFn` is a function type that defines the contract for a model-agnostic Natural Language Inference (NLI) classifier. It is used within the `MultiLayerGroundingPlugin` as the optional fourth layer (L4) of its hallucination detection pipeline [Source 1].

An NLI function takes a `premise` (a source text passage) and a `hypothesis` (a synthesized claim) and determines the logical relationship between them. It returns a verdict of `entailment`, `contradiction`, or `neutral` [Source 1].

This function type allows developers to integrate various NLI backends into the grounding process, such as:
- Local ONNX models (e.g., DeBERTa-MNLI via Transformers.js) for zero API cost.
- Large Language Models (e.g., Gemini, GPT-4o, Claude) using structured prompting.
- Custom fine-tuned classifiers exposed via a REST endpoint [Source 1].

The primary role of `NLIVerifyFn` in the grounding pipeline is to definitively identify *contradictions*—claims that are explicitly refuted by the source material. This is a more powerful check than the L3 verification, which only assesses if a claim is supported, and is critical for catching hallucinations where a model asserts the opposite of the source text [Source 1].

## Signature

`NLIVerifyFn` is an asynchronous function that accepts a premise and a hypothesis, and returns a promise that resolves to an `NLIVerdict` object [Source 1].

```typescript
export type NLIVerifyFn = (
  premise: string,
  hypothesis: string
) => Promise<NLIVerdict>;
```

### NLIVerdict Type

The `NLIVerdict` type is the return value for an `NLIVerifyFn` implementation.

```typescript
export type NLIVerdict = {
  /**
   * The NLI classification label.
   * - `entailment`: The premise logically entails the hypothesis.
   * - `contradiction`: The premise explicitly contradicts the hypothesis.
   * - `neutral`: The premise neither supports nor refutes the hypothesis.
   */
  label: "entailment" | "contradiction" | "neutral";

  /**
   * Confidence score in the range [0, 1].
   * Optional but recommended for threshold-based filtering.
   */
  confidence?: number;
};
```

## Examples

The following examples demonstrate how to implement `NLIVerifyFn` using different backends.

### Using a Local Model with Transformers.js

This example uses the `@xenova/transformers` library to run a DeBERTa-MNLI model locally, incurring no API costs [Source 1].

```typescript
import { pipeline } from '@xenova/transformers';
import type { NLIVerifyFn, NLIVerdict } from 'yaaf';

// Initialize the pipeline once
const pipe = await pipeline(
  'zero-shot-classification',
  'Xenova/deberta-v3-xsmall-zeroshot-mnli-anli'
);

const nliVerifyFn: NLIVerifyFn = async (premise, hypothesis) => {
  // The library expects the text to classify first, then the candidate labels.
  // The premise is passed via the hypothesis_template.
  const result = await pipe(hypothesis, ['entailment', 'neutral', 'contradiction'], {
    hypothesis_template: `${premise} This example is {}.`,
    multi_label: false,
  });

  const label = result.labels[0] as NLIVerdict['label'];
  const confidence = result.scores[0];

  return { label, confidence };
};
```

### Using an LLM API (e.g., Gemini, OpenAI)

This example shows how to use a large language model with a structured JSON prompt to perform NLI classification [Source 1].

```typescript
import type { NLIVerifyFn } from 'yaaf';

// Assume 'model' is an initialized LLM client instance
const nliVerifyFn: NLIVerifyFn = async (premise, hypothesis) => {
  const prompt = `Classify whether the PREMISE entails, contradicts, or is neutral to the HYPOTHESIS.
Respond with JSON only: {"label":"entailment"|"contradiction"|"neutral","confidence":0.0-1.0}
PREMISE: ${premise}
HYPOTHESIS: ${hypothesis}`;

  const response = await model.complete({
    messages: [{
      role: 'user',
      content: prompt,
    }],
    // Ensure the model is configured for JSON output if available
  });

  try {
    return JSON.parse(response.content ?? '{}');
  } catch (error) {
    console.error("Failed to parse NLI JSON response:", error);
    return { label: 'neutral' }; // Fallback
  }
};
```

## See Also

- [MultiLayerGroundingOptions](./multi-layer-grounding-options.md): The configuration object for `MultiLayerGroundingPlugin` where an `NLIVerifyFn` is provided.

## Sources

[Source 1]: src/knowledge/compiler/groundingPlugin.ts