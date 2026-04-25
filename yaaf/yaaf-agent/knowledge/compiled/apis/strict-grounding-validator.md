---
title: strictGroundingValidator
entity_type: api
summary: A factory function to create a GroundingValidator instance pre-configured for strict validation mode.
export_name: strictGroundingValidator
source_file: src/security/groundingValidator.ts
category: function
search_terms:
 - strict hallucination check
 - prevent LLM from making things up
 - force agent to use tool results
 - grounding validator strict mode
 - anti-hallucination hook
 - validate agent responses
 - override ungrounded LLM output
 - ensure factual accuracy
 - agent security
 - response validation
 - how to block bad agent responses
 - YAAF security features
 - content safety
 - factual consistency
stub: false
compiled_at: 2026-04-24T17:41:13.854Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `strictGroundingValidator` is a factory function that creates and configures an instance of the `GroundingValidator` class for its most aggressive anti-hallucination mode [Source 1].

In `'strict'` mode, the validator assesses if a minimum fraction of the [LLM](../concepts/llm.md)'s response sentences are "grounded" in evidence from tool outputs. If the response's [Grounding Score](../concepts/grounding-score.md) falls below the configured `minCoverage` threshold, the entire response is discarded and replaced with a predefined `overrideMessage`. This provides a strong guarantee against agents presenting unverified or hallucinated information as fact [Source 1].

This function is a convenient alternative to manually instantiating `new GroundingValidator({ mode: 'strict', ... })` [Source 1].

## Signature

The function accepts an optional configuration object and returns a `GroundingValidator` instance. The `mode` property is omitted from the configuration type, as it is fixed to `'strict'` [Source 1].

```typescript
export function strictGroundingValidator(
  config?: Omit<GroundingValidatorConfig, "mode">,
): GroundingValidator;
```

### Configuration

The `config` object can include any property from `GroundingValidatorConfig` except for `mode` [Source 1]. Key properties for `strict` mode include:

| Property | Type | Description |
| --- | --- | --- |
| `minCoverage` | `number` | **(Required for strict mode)** The minimum fraction (0-1) of response sentences that must be grounded. If the score is below this, the response is overridden. Default: `0.3` [Source 1]. |
| `overrideMessage` | `string` | The message to use [when](./when.md) a response is overridden for failing the grounding check [Source 1]. |
| `minOverlapTokens` | `number` | Minimum number of significant words that must overlap between a sentence and tool evidence to be considered grounded by keyword matching. Default: `3` [Source 1]. |
| `onAssessment` | `(event: GroundingAssessment) => void` | An optional callback function that is invoked after every grounding assessment, providing detailed results [Source 1]. |
| `minSentenceWords` | `number` | The minimum number of words a sentence must have to be checked for grounding. Shorter sentences are skipped. Default: `5` [Source 1]. |
| `embedFn` | `(text: string) => Promise<number[]>` | An optional function to generate embeddings for semantic similarity checks, providing a more robust grounding signal than keyword overlap alone [Source 1]. |
| `embeddingThreshold` | `number` | The minimum [Cosine Similarity](../concepts/cosine-similarity.md) score (0-1) required to consider a sentence grounded via its embedding. Default: `0.75` [Source 1]. |
| `llmScorer` | `(opts: { sentence: string; evidenceSnippets: string[] }) => Promise<number>` | An optional LLM-based function to score borderline sentences that have some, but not enough, keyword overlap [Source 1]. |
| `llmGroundingThreshold` | `number` | The minimum score (0-1) from the `llmScorer` required to consider a sentence grounded. Default: `0.5` [Source 1]. |

## Examples

The following example demonstrates creating a strict validator and attaching it to an agent's `afterLLM` hook. If less than 50% of the LLM's response is grounded in tool evidence, the response will be replaced with a custom message.

```typescript
import { Agent, strictGroundingValidator } from 'yaaf';

// Create a validator that requires at least 50% of the response
// to be grounded in tool evidence.
const validator = strictGroundingValidator({
  minCoverage: 0.5,
  overrideMessage: "I'm sorry, I cannot provide a reliable answer based on the available information.",
  // Optional: Log every assessment for debugging
  onAssessment: (assessment) => {
    console.log(`Grounding check complete. Score: ${assessment.score}, Action: ${assessment.action}`);
  }
});

const agent = new Agent({
  // ... other agent configuration
  hooks: {
    // The hook will override the LLM response if the grounding check fails.
    afterLLM: validator.hook(),
  },
});

// When this agent runs, if its LLM response is not sufficiently
// supported by tool outputs, the user will receive the overrideMessage.
```

## See Also

- `GroundingValidator`: The class that performs the core anti-hallucination logic.
- `groundingValidator`: A factory for creating a `GroundingValidator` with default (non-strict) settings.

## Sources

[Source 1]: src/security/groundingValidator.ts