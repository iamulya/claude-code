---
summary: An optional, LLM-based component in YAAF's GroundingValidator that provides human-quality semantic evaluation for borderline sentences, enhancing grounding accuracy.
title: LLM Semantic Scorer
entity_type: concept
related_subsystems:
 - security
see_also:
 - "[GroundingValidator](../apis/grounding-validator.md)"
 - "[Grounding (LLM)](./grounding-llm.md)"
 - "[Hallucination (LLM)](./hallucination-llm.md)"
search_terms:
 - semantic grounding check
 - LLM as a judge
 - borderline sentence evaluation
 - grounding validator fallback
 - paraphrase detection in grounding
 - how to improve hallucination detection
 - model-based fact checking
 - semantic similarity scoring
 - llmScorer configuration
 - human-quality evaluation
 - last-resort grounding
 - anti-hallucination
stub: false
compiled_at: 2026-04-25T00:21:02.667Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

The [LLM](./llm.md) Semantic Scorer is an optional, high-precision component within YAAF's [GroundingValidator](../apis/grounding-validator.md) subsystem. It serves as a final, "last-resort" evaluation layer to prevent [hallucinations](./hallucination-llm.md) [Source 1]. Its primary function is to provide a human-quality semantic assessment for sentences that are "borderline"—that is, sentences that have some keyword overlap with source evidence but not enough to be definitively considered grounded by faster, less expensive methods like [TF-IDF](./tf-idf.md) [Source 1].

This component solves the problem of accurately grounding paraphrased or summarized claims. Simpler methods based on keyword matching or token overlap can fail when an [LLM](./llm.md)'s response is semantically equivalent to the source material but uses different vocabulary (e.g., "the server returned a success code" when the evidence says "status code: 200"). The LLM Semantic Scorer acts as a semantic fallback, using the reasoning capability of another [LLM](./llm.md) to determine if a claim is truly supported by the provided evidence, thereby increasing the accuracy of the [grounding](./grounding-llm.md) process [Source 1].

## How It Works in YAAF

The LLM Semantic Scorer is part of the [GroundingValidator](../apis/grounding-validator.md)'s three-layer scoring model, which also includes TF-IDF keyword overlap and [Embedding Similarity](./embedding-similarity.md). The scorer is only invoked when the faster layers are inconclusive [Source 1].

The process is as follows:
1.  The [GroundingValidator](../apis/grounding-validator.md) first assesses a sentence from an agent's response using keyword overlap.
2.  If the sentence has some overlap with the evidence (more than zero tokens) but falls below the configured `minOverlapTokens` threshold, it is considered a borderline case.
3.  For these borderline cases, the validator escalates the sentence to the configured `llmScorer` function [Source 1].
4.  The validator passes an object containing the `sentence` to be evaluated and up to three of the most relevant `evidenceSnippets` to this function [Source 1].
5.  The developer-provided `llmScorer` function is expected to make an [LLM Call](./llm-call.md) to a model of choice (e.g., GPT-4o, Gemini, Claude) to evaluate if the claim is supported by the evidence. The scorer is model-agnostic [Source 1].
6.  The function must return a numeric score between 0 (completely ungrounded) and 1 (fully grounded) [Source 1].
7.  The [GroundingValidator](../apis/grounding-validator.md) compares this score to the `llmGroundingThreshold` (defaulting to 0.5). If the score is greater than or equal to the threshold, the sentence is marked as grounded [Source 1].
8.  When a sentence's grounding status is determined by this method, the resulting `GroundingSentence` object will have its `scoredBy` property set to `"llm"` [Source 1].

## Configuration

The LLM Semantic Scorer is an opt-in feature configured on the [GroundingValidator](../apis/grounding-validator.md). A developer must provide an asynchronous function to the `llmScorer` property in the `GroundingValidatorConfig`. The `llmGroundingThreshold` can also be adjusted from its default of 0.5 [Source 1].

The following example demonstrates how to configure a [GroundingValidator](../apis/grounding-validator.md) to use OpenAI's `gpt-4o-mini` as a semantic scorer:

```typescript
import { GroundingValidator } from 'yaaf';
import { openai } from '@openai/agents'; // Assuming an OpenAI client is available

const validator = new GroundingValidator({
  mode: 'annotate',
  minOverlapTokens: 3, // A sentence with 1 or 2 overlapping words is borderline
  llmGroundingThreshold: 0.7, // Require a higher confidence score from the LLM

  // Provide the scorer function
  llmScorer: async ({ sentence, evidenceSnippets }) => {
    try {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: 'You are a factual consistency evaluator. Respond with only a single floating point number from 0.0 to 1.0 indicating how well the claim is supported by the evidence. 1.0 means fully supported.'
        }, {
          role: 'user',
          content: `Score how well this claim is supported by the provided evidence snippets.\n\nClaim: "${sentence}"\n\nEvidence: "${evidenceSnippets.join(' | ')}"`
        }],
        temperature: 0,
      });
      // Safely parse the LLM's numeric output
      return parseFloat(resp.choices[0]?.message.content ?? '0');
    } catch (error) {
      console.error("LLM Scorer failed:", error);
      return 0; // Default to ungrounded on error
    }
  },
});

// This validator can now be used in an agent's hooks.
const agent = new Agent({
  hooks: {
    afterLLM: validator.hook(),
  },
});
```
[Source 1]

## See Also

*   [GroundingValidator](../apis/grounding-validator.md): The API that implements and uses the LLM Semantic Scorer.
*   [Grounding (LLM)](./grounding-llm.md): The core concept of ensuring an LLM's outputs are based on provided evidence.
*   [Hallucination (LLM)](./hallucination-llm.md): The problem that grounding and semantic scoring are designed to mitigate.

## Sources

[Source 1]: src/security/groundingValidator.ts