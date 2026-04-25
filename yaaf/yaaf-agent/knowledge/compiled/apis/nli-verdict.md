---
summary: Type definition for the output of a Natural Language Inference (NLI) verifier, classifying the relationship between a premise and a hypothesis.
export_name: NLIVerdict
source_file: src/knowledge/compiler/groundingPlugin.ts
category: type
title: NLIVerdict
entity_type: api
search_terms:
 - natural language inference
 - NLI classification
 - entailment contradiction neutral
 - verify claim against source
 - hallucination detection type
 - grounding plugin output
 - premise hypothesis relationship
 - NLIVerifyFn return type
 - claim verification result
 - semantic relationship classification
 - textual entailment
 - logical inference type
stub: false
compiled_at: 2026-04-25T00:10:21.219Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/groundingPlugin.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `NLIVerdict` type defines the structure for the output of a Natural Language Inference (NLI) verification task. It is used to classify the logical relationship between a source text (the premise) and a generated statement (the hypothesis). This classification is a key part of the hallucination detection pipeline in YAAF, particularly within the `MultiLayerGroundingPlugin` [Source 1].

An NLI verifier, represented by the `NLIVerifyFn` type, returns an `NLIVerdict` to indicate whether a claim is supported by, contradicted by, or neutral with respect to the source material. This allows the system to identify and flag claims that are not just unsupported, but actively refuted by the provided context [Source 1].

## Signature

`NLIVerdict` is an object type with the following properties [Source 1]:

```typescript
export type NLIVerdict = {
  label: "entailment" | "contradiction" | "neutral";
  /** Confidence in [0, 1] — optional but used by threshold filtering. */
  confidence?: number;
};
```

### Properties

- **`label`**: ` "entailment" | "contradiction" | "neutral" `
  - The NLI classification, which can be one of three values:
    - `entailment`: The premise (source text) logically entails the hypothesis (the claim).
    - `contradiction`: The premise explicitly contradicts the hypothesis.
    - `neutral`: The premise neither supports nor refutes the hypothesis.
- **`confidence`**: ` number ` (optional)
  - A numerical score between 0 and 1 representing the model's confidence in its `label` classification. This value is used by grounding plugins for threshold-based filtering [Source 1].

## Examples

### Basic Verdict Objects

Here are examples of `NLIVerdict` objects representing each possible label.

```typescript
// A verdict indicating the claim is supported by the source.
const entailmentVerdict: NLIVerdict = {
  label: "entailment",
  confidence: 0.95,
};

// A verdict indicating the claim is contradicted by the source.
const contradictionVerdict: NLIVerdict = {
  label: "contradiction",
  confidence: 0.88,
};

// A verdict indicating no clear relationship between claim and source.
const neutralVerdict: NLIVerdict = {
  label: "neutral",
  confidence: 0.72,
};
```

### Return Value from an NLI Verifier

The `NLIVerdict` is the return type for an `NLIVerifyFn`. The following example shows a simplified implementation of such a function that produces an `NLIVerdict` by calling an LLM [Source 1].

```typescript
import { NLIVerdict, NLIVerifyFn } from 'yaaf'; // Assuming NLIVerifyFn is also exported

// A mock LLM completion function
async function llmComplete(prompt: string): Promise<string> {
  // In a real scenario, this would call an LLM API.
  // This mock response corresponds to the prompt below.
  return JSON.stringify({
    label: "entailment",
    confidence: 0.9
  });
}

const nliVerifyFn: NLIVerifyFn = async (premise, hypothesis) => {
  const prompt = `Classify whether the PREMISE entails, contradicts, or is neutral to the HYPOTHESIS.\n` +
    `Respond with JSON only: {"label":"entailment"|"contradiction"|"neutral","confidence":0.0-1.0}\n` +
    `PREMISE: ${premise}\nHYPOTHESIS: ${hypothesis}`;

  const rawResponse = await llmComplete(prompt);
  const verdict: NLIVerdict = JSON.parse(rawResponse);
  return verdict;
};

// Usage:
const premise = "The sky is blue during the day.";
const hypothesis = "The color of the daytime sky is blue.";

const result = await nliVerifyFn(premise, hypothesis);
console.log(result); // { label: 'entailment', confidence: 0.9 }
```

## See Also

- `NLIVerifyFn`: The function signature for NLI verifiers that return an `NLIVerdict`.
- `MultiLayerGroundingPlugin`: A built-in grounding adapter that uses an `NLIVerifyFn` to produce `NLIVerdict`s as part of its L4 verification step.

## Sources

[Source 1]: src/knowledge/compiler/groundingPlugin.ts