---
summary: A method of comparing the semantic closeness of text segments by measuring the similarity of their vector embeddings, used in YAAF for semantic grounding.
title: Embedding Similarity
entity_type: concept
related_subsystems:
 - security
see_also:
 - "[Grounding (LLM)](./grounding-llm.md)"
 - "[Hallucination (LLM)](./hallucination-llm.md)"
 - "[Cosine Similarity](./cosine-similarity.md)"
 - "[GroundingValidator](../apis/grounding-validator.md)"
 - "[LLM Semantic Scorer](./llm-semantic-scorer.md)"
 - "[TF-IDF](./tf-idf.md)"
search_terms:
 - semantic similarity
 - vector similarity
 - cosine distance
 - how to compare text meaning
 - grounding with embeddings
 - paraphrase detection
 - anti-hallucination check
 - semantic grounding
 - vector search
 - embedFn
 - embeddingThreshold
 - semantic text comparison
 - vector space model
stub: false
compiled_at: 2026-04-25T00:18:58.599Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

Embedding Similarity is a method for quantifying the semantic closeness of two pieces of text. It works by first converting each text segment into a high-dimensional numerical vector, known as an embedding, using a feature-extraction model. Then, a mathematical function, typically [Cosine Similarity](./cosine-similarity.md), is used to measure the distance or angle between these vectors in the vector space. A smaller angle (higher cosine similarity score) indicates greater semantic similarity.

In YAAF, this concept is a core component of the [Grounding (LLM)](./grounding-llm.md) mechanism, specifically within the [GroundingValidator](../apis/grounding-validator.md) [Source 1]. It serves as a powerful tool to combat [LLM hallucinations](./hallucination-llm.md) by verifying if an agent's claims are semantically supported by evidence, such as the output from [tool calls](./tool-calls.md). This approach is more robust than simple keyword matching (like [TF-IDF](./tf-idf.md)) because it can identify paraphrased or summarized claims that share meaning but not exact wording. For example, it can recognize that the claim "the server returned 200" is grounded by tool output that says "status code: 200" [Source 1].

## How It Works in YAAF

Embedding Similarity is implemented as an optional, middle layer in the [GroundingValidator](../apis/grounding-validator.md)'s multi-layered scoring model, positioned between fast keyword overlap checks and slower, more expensive [LLM-based semantic scoring](./llm-semantic-scorer.md) [Source 1].

The process is as follows:
1.  **Opt-In Activation**: A developer enables this feature by providing an `embedFn` (an embedding function) in the [GroundingValidator](../apis/grounding-validator.md) configuration [Source 1].
2.  **Evidence Embedding**: During a grounding assessment, the validator takes the entire corpus of evidence (e.g., all tool results from the current turn) and uses the `embedFn` to convert it into a single aggregated embedding. This result is cached for the duration of the assessment to avoid redundant computations [Source 1].
3.  **Sentence Embedding**: Each sentence in the LLM's response that is identified as a factual claim is then individually converted into an embedding using the same `embedFn` [Source 1].
4.  **Similarity Calculation**: The framework calculates the [Cosine Similarity](./cosine-similarity.md) between each sentence's embedding and the cached evidence embedding [Source 1].
5.  **Grounding Decision**: If the resulting similarity score is greater than or equal to a configured `embeddingThreshold`, the sentence is considered grounded. This check can pass even if the keyword overlap is zero [Source 1].

When a sentence is successfully verified using this method, the `GroundingSentence` object in the assessment result will have its `scoredBy` property set to `"embedding"` [Source 1].

## Configuration

Embedding Similarity is configured on the [GroundingValidator](../apis/grounding-validator.md). The two primary options are `embedFn` and `embeddingThreshold`.

-   `embedFn`: An asynchronous function that accepts a string and returns a promise resolving to an array of numbers (`Promise<number[]>`). This function is responsible for generating the vector embeddings. It must produce embeddings of a consistent dimensionality [Source 1].
-   `embeddingThreshold`: A number between 0 and 1 representing the minimum [Cosine Similarity](./cosine-similarity.md) score required to consider a sentence grounded. The default value is `0.75` [Source 1].

```typescript
import { GroundingValidator } from 'yaaf';
import { pipeline } from '@xenova/transformers';

// Example using @xenova/transformers to create an embedding function
const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const validator = new GroundingValidator({
  mode: 'annotate',
  
  // Provide the embedding function to enable semantic grounding
  embedFn: async (text: string) => {
    const out = await embed(text, { pooling: 'mean', normalize: true });
    return Array.from(out.data as Float32Array);
  },

  // Set the minimum similarity score (optional, defaults to 0.75)
  embeddingThreshold: 0.8,
});

// This validator can now be used in an agent's hooks.
```
[Source 1]

## Sources
[Source 1]: src/security/groundingValidator.ts