---
summary: Provides mechanisms and APIs for enhancing the security and reliability of LLM-powered agents, focusing on response grounding to prevent hallucinations.
primary_files:
 - src/security/groundingValidator.ts
title: Security Subsystem
entity_type: subsystem
exports:
 - GroundingValidator
 - groundingValidator
 - strictGroundingValidator
search_terms:
 - LLM hallucination
 - preventing agent hallucinations
 - grounding LLM responses
 - fact-checking agent output
 - response validation
 - agent reliability
 - securing LLM agents
 - TF-IDF for grounding
 - embedding similarity for validation
 - LLM as a judge for grounding
 - strict mode for agents
 - annotate ungrounded claims
 - how to stop LLM from making things up
 - YAAF security features
stub: false
compiled_at: 2026-04-25T00:30:56.200Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
compiled_from_quality: unknown
confidence: 1
---

## Purpose

The Security System in YAAF provides mechanisms to improve the reliability and trustworthiness of LLM-powered agents. Its primary focus is on mitigating the risk of model "hallucination," where an agent generates claims that are not supported by factual evidence. It achieves this by validating an agent's responses against the evidence available in the conversation, such as the output from tool calls [Source 1].

## Architecture

The core component of the Security System is the [GroundingValidator](../apis/grounding-validator.md), an anti-hallucination utility that cross-references an LLM's generated sentences against tool results from the current conversation [Source 1].

The validator operates using a multi-layered scoring model to determine if a claim is "grounded":

1.  **TF-IDF Keyword Overlap**: This is the default, zero-cost validation layer. It calculates the number of significant, overlapping words between a sentence in the LLM's response and the text from tool results. A sentence is considered grounded if the overlap meets a configurable threshold (`minOverlapTokens`). This layer is always active [Source 1].

2.  **Embedding Similarity**: This is an optional layer enabled by providing an `embedFn` in the configuration. It offers a more robust semantic check by comparing the vector embeddings of a sentence and the evidence corpus. A sentence is considered grounded if the cosine similarity between its embedding and the evidence embedding is above a specified `embeddingThreshold`. This method can identify paraphrased or summarized claims that share few keywords with the source evidence [Source 1].

3.  **LLM Semantic Scorer**: This is an optional, final-resort layer for evaluating "borderline" sentences—those with some keyword overlap but not enough to pass the TF-IDF threshold. When an `llmScorer` function is provided, these sentences are sent to an external LLM, which provides a semantic similarity score. This allows for a human-quality evaluation of grounding for ambiguous cases [Source 1].

The validator only assesses sentences that are likely to be factual claims, skipping short sentences (e.g., greetings) based on a `minSentenceWords` configuration [Source 1].

Based on the validation results, the [GroundingValidator](../apis/grounding-validator.md) can operate in one of three modes:
*   **`warn`**: Logs a warning for ungrounded claims but allows the original response to pass through.
*   **`annotate`**: Modifies the response by appending markers like `[ungrounded]` to sentences that fail the grounding check.
*   **`strict`**: If the percentage of grounded sentences falls below a `minCoverage` threshold, the entire response is replaced with a pre-configured `overrideMessage` [Source 1].

## Integration Points

The Security System, via the [GroundingValidator](../apis/grounding-validator.md), is designed to integrate into the agent's lifecycle using hooks. The primary integration point is the `afterLLM` hook, which allows the validator to intercept and assess the LLM's response before it is finalized and sent to the user or used for subsequent actions [Source 1].

```ts
import { Agent, GroundingValidator } from 'yaaf';

const validator = new GroundingValidator({
  mode: 'warn',
  minCoverage: 0.3,
});

const agent = new Agent({
  hooks: {
    afterLLM: validator.hook(),
  },
});
```

## Key APIs

*   **[GroundingValidator](../apis/grounding-validator.md)**: The main class that performs the anti-hallucination checks. It is configured with a mode, thresholds, and optional scoring functions [Source 1].
*   **`groundingValidator(config)`**: A factory function that creates a [GroundingValidator](../apis/grounding-validator.md) instance with production-ready default settings [Source 1].
*   **`strictGroundingValidator(config)`**: A factory function that creates a [GroundingValidator](../apis/grounding-validator.md) pre-configured for `strict` mode [Source 1].
*   **`GroundingValidatorConfig`**: The configuration object used to initialize the validator. Key properties include `mode`, `minCoverage`, `minOverlapTokens`, `llmScorer`, and `embedFn` [Source 1].
*   **`GroundingAssessment`**: An object returned by the `onAssessment` callback, providing a detailed report of the grounding check, including the overall score, a per-sentence breakdown, and the action taken (`passed`, `warned`, `annotated`, `overridden`) [Source 1].

## Configuration

The behavior of the Security System is controlled through the `GroundingValidatorConfig` object when instantiating a [GroundingValidator](../apis/grounding-validator.md).

Key configuration options include:
*   `mode`: Sets the operational mode to `'warn'`, `'annotate'`, or `'strict'` (default: `'warn'`) [Source 1].
*   `minCoverage`: In `strict` mode, defines the minimum fraction (0-1) of sentences that must be grounded. Default is `0.3` [Source 1].
*   `minOverlapTokens`: The minimum number of overlapping keywords required for the TF-IDF check. Default is `3` [Source 1].
*   `minSentenceWords`: The minimum number of words a sentence must have to be checked for grounding. Default is `5` [Source 1].
*   `embeddingThreshold`: The minimum cosine similarity score (0-1) for a sentence to be considered grounded via embeddings. Default is `0.75` [Source 1].
*   `llmGroundingThreshold`: The minimum score (0-1) from the LLM scorer to consider a sentence grounded. Default is `0.5` [Source 1].
*   `overrideMessage`: A custom message to use when a response is rejected in `strict` mode [Source 1].
*   `onAssessment`: A callback function that receives a `GroundingAssessment` object after each validation [Source 1].

## Extension Points

The [GroundingValidator](../apis/grounding-validator.md) can be extended with more sophisticated semantic checking capabilities by providing custom functions in its configuration:

*   **`embedFn`**: Developers can supply an asynchronous function that takes text and returns a vector embedding. This enables the semantic grounding layer based on cosine similarity. This function is expected to be compatible with those used in other parts of the framework, such as `VectorMemoryConfig` [Source 1].
*   **`llmScorer`**: Developers can provide an asynchronous function that uses an external LLM to score the semantic similarity between a sentence and evidence snippets. This allows for model-agnostic, high-quality evaluation for ambiguous cases [Source 1].

Example of configuring an `llmScorer`:
```ts
import { openai } from '@openai/agents'
const validator = new GroundingValidator({
  mode: 'annotate',
  llmScorer: async ({ sentence, evidenceSnippets }) => {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Score 0-1 how well this claim is supported by evidence:\nClaim: ${sentence}\nEvidence: ${evidenceSnippets.join(' | ')}`
      }],
    })
    return parseFloat(resp.choices[0]?.message.content ?? '0')
  },
})
```

## Sources
[Source 1]: src/security/groundingValidator.ts