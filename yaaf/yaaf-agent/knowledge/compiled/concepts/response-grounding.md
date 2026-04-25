---
summary: The process of validating LLM responses against provided evidence (e.g., tool results) to prevent hallucinations and ensure factual accuracy.
title: Response Grounding
entity_type: concept
related_subsystems:
 - security
see_also:
 - "[GroundingValidator](../apis/grounding-validator.md)"
 - "[Hallucination (LLM)](./hallucination-llm.md)"
 - "[tool results](./tool-results.md)"
 - "[Grounding Score](./grounding-score.md)"
 - "[TF-IDF](./tf-idf.md)"
 - "[Embedding Similarity](./embedding-similarity.md)"
 - "[LLM Semantic Scorer](./llm-semantic-scorer.md)"
 - "[Agent Hooks](./agent-hooks.md)"
search_terms:
 - prevent LLM hallucination
 - validate agent response
 - fact-checking LLM output
 - grounding LLM claims
 - anti-hallucination check
 - cross-reference tool results
 - ensure factual accuracy
 - strict mode for agents
 - annotate ungrounded claims
 - semantic similarity for grounding
 - keyword overlap validation
 - how to stop agents from lying
 - response validation
 - evidence-based response
stub: false
compiled_at: 2026-04-25T00:23:58.325Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

Response Grounding is a security and reliability process in YAAF designed to mitigate [LLM hallucinations](./hallucination-llm.md) [Source 1]. It functions as an anti-hallucination cross-reference check by validating an [LLM](./llm.md)'s generated response against a set of trusted evidence, typically the [tool results](./tool-results.md) gathered during the current [Agent Turn](./agent-turn.md) [Source 1]. The primary goal is to detect and handle claims made by the LLM that are not supported by any of the provided evidence, thereby improving the factual accuracy and trustworthiness of the agent's output [Source 1].

YAAF's grounding mechanism can be configured to operate in one of three modes [Source 1]:
*   **`warn`**: Logs a warning when ungrounded claims are detected but allows the original response to pass through unmodified. This is the default mode.
*   **`annotate`**: Modifies the response by appending markers (e.g., `[ungrounded]`) to sentences that cannot be verified against the evidence.
*   **`strict`**: Replaces the entire LLM response with a predefined message if the overall [Grounding Score](./grounding-score.md) falls below a configurable threshold.

## How It Works in YAAF

Response Grounding is implemented by the [GroundingValidator](../apis/grounding-validator.md) class, which is typically integrated into an agent's lifecycle via an `afterLLM` [hook](./agent-hooks.md) [Source 1]. When the hook is triggered, the validator assesses the LLM's response by splitting it into sentences and evaluating each one against the collected [tool results](./tool-results.md) [Source 1].

The validation process uses a multi-layered scoring model to determine if a sentence is grounded [Source 1]:

1.  **[TF-IDF](./tf-idf.md) Keyword Overlap**: This is the default, always-active first layer. It performs a fast, zero-cost check for significant keyword overlap between a sentence and the evidence. A sentence is considered grounded if it shares at least a minimum number of tokens (`minOverlapTokens`) with any tool result [Source 1].

2.  **[Embedding Similarity](./embedding-similarity.md)**: This is an optional, more sophisticated layer that provides semantic validation. When an `embedFn` (embedding function) is configured, the validator creates vector embeddings of the evidence corpus. Each sentence from the LLM's response is also embedded, and its [Cosine Similarity](./cosine-similarity.md) is calculated against the evidence. If the similarity score meets or exceeds a defined `embeddingThreshold`, the sentence is considered grounded, even if it has low keyword overlap. This is effective for catching paraphrased or summarized claims [Source 1].

3.  **[LLM Semantic Scorer](./llm-semantic-scorer.md)**: This is an optional final layer used as a last resort for borderline cases. If a sentence has some keyword overlap but not enough to pass the `minOverlapTokens` threshold, it can be escalated to a separate [LLM Call](./llm-call.md). This scorer model is asked to provide a semantic similarity score (0-1) indicating how well the evidence supports the claim. This provides a high-quality semantic check without the cost of embedding the entire corpus [Source 1].

The validator skips short sentences like greetings or acknowledgements, focusing only on statements long enough to be considered factual claims, as determined by the `minSentenceWords` setting [Source 1].

The result of this process is a `GroundingAssessment` object containing an overall [Grounding Score](./grounding-score.md), a per-sentence breakdown of the analysis, and a record of the action taken (`passed`, `warned`, `annotated`, or `overridden`) [Source 1].

## Configuration

Response Grounding is configured by instantiating the [GroundingValidator](../apis/grounding-validator.md) class and passing it to an agent's hooks.

```typescript
import { Agent, GroundingValidator } from 'yaaf';

// Basic configuration for warning on ungrounded claims
const validator = new GroundingValidator({
  mode: 'warn',
  minCoverage: 0.3, // Used in 'strict' mode
  minOverlapTokens: 3,
});

const agent = new Agent({
  hooks: {
    afterLLM: validator.hook(),
  },
});
```
[Source 1]

### Advanced Configuration

For more robust semantic checking, an `embedFn` or `llmScorer` can be provided.

**Using an Embedding Function:**
```typescript
import { pipeline } from '@xenova/transformers';
import { GroundingValidator } from 'yaaf';

const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const validatorWithEmbeddings = new GroundingValidator({
  mode: 'annotate',
  embedFn: async (text) => {
    const out = await embed(text, { pooling: 'mean', normalize: true });
    return Array.from(out.data as Float32Array);
  },
  embeddingThreshold: 0.75,
});
```
[Source 1]

**Using an LLM-based Scorer:**
```typescript
import { openai } from '@openai/agents';
import { GroundingValidator } from 'yaaf';

const validatorWithLLMScorer = new GroundingValidator({
  mode: 'annotate',
  llmScorer: async ({ sentence, evidenceSnippets }) => {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Score 0-1 how well this claim is supported by evidence:\nClaim: ${sentence}\nEvidence: ${evidenceSnippets.join(' | ')}`
      }],
    });
    return parseFloat(resp.choices[0]?.message.content ?? '0');
  },
  llmGroundingThreshold: 0.5,
});
```
[Source 1]

## See Also

*   [GroundingValidator](../apis/grounding-validator.md): The API for implementing Response Grounding.
*   [Hallucination (LLM)](./hallucination-llm.md): The core problem that grounding aims to solve.
*   [tool results](./tool-results.md): The primary source of evidence for grounding.
*   [Grounding Score](./grounding-score.md): The metric produced by the grounding process.
*   [Agent Hooks](./agent-hooks.md): The mechanism used to integrate the validator into the agent lifecycle.
*   [TF-IDF](./tf-idf.md), [Embedding Similarity](./embedding-similarity.md), [LLM Semantic Scorer](./llm-semantic-scorer.md): The different methods used for scoring.

## Sources

[Source 1] src/security/groundingValidator.ts