---
title: GroundingValidatorConfig
entity_type: api
summary: Configuration interface for the GroundingValidator, specifying validation parameters and scoring methods.
export_name: GroundingValidatorConfig
source_file: src/security/groundingValidator.ts
category: type
search_terms:
 - hallucination detection config
 - grounding validator settings
 - configure anti-hallucination
 - strict mode grounding
 - annotate ungrounded claims
 - LLM response validation
 - semantic grounding options
 - embedding similarity for grounding
 - LLM scorer for validation
 - minCoverage setting
 - minOverlapTokens setting
 - how to configure GroundingValidator
 - fact-checking LLM output
stub: false
compiled_at: 2026-04-24T17:09:55.843Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`GroundingValidatorConfig` is a TypeScript type that defines the configuration options for the `GroundingValidator` class [Source 1]. This configuration object allows developers to customize the behavior of the anti-hallucination and fact-checking mechanism. It controls the validation mode, sets thresholds for [Grounding Score](../concepts/grounding-score.md)s, and enables advanced semantic scoring methods using embeddings or a separate [LLM](../concepts/llm.md) [Source 1].

This configuration is passed to the `GroundingValidator` constructor or to factory functions like `groundingValidator` and `strictGroundingValidator` [Source 1].

## Signature

`GroundingValidatorConfig` is a type alias for an object with the following properties [Source 1]:

```typescript
export type GroundingValidatorConfig = {
  /**
   * Validation mode:
   * - `warn` — log warning, pass response through (default)
   * - `annotate` — add [⚠️ ungrounded] markers to unverified sentences
   * - `strict` — override response if below threshold
   */
  mode?: "warn" | "annotate" | "strict";

  /**
   * Minimum fraction of response sentences that must be grounded (0-1).
   * Only used in `strict` mode.
   * Default: 0.3 (30% of factual sentences must be backed by tool results).
   */
  minCoverage?: number;

  /**
   * Minimum number of token overlap to consider a sentence "grounded".
   * Default: 3 (at least 3 significant words must overlap with tool evidence).
   */
  minOverlapTokens?: number;

  /**
   * Message to use [[[[[[[[when]]]]]]]] overriding in strict mode.
   */
  overrideMessage?: string;

  /**
   * Called on every grounding assessment.
   */
  onAssessment?: (event: GroundingAssessment) => void;

  /**
   * Minimum words for a sentence to be considered a "factual claim"
   * worth checking. Shorter sentences (greetings, acknowledgments)
   * are skipped.
   * Default: 5
   */
  minSentenceWords?: number;

  /**
   * Optional LLM-based semantic scorer for borderline sentences.
   */
  llmScorer?: (opts: {
    sentence: string;
    evidenceSnippets: string[];
  }) => Promise<number>;

  /**
   * Minimum LLM scorer confidence to mark a sentence as grounded.
   * Default: 0.5
   */
  llmGroundingThreshold?: number;

  /**
   * Optional embedding function for semantic grounding.
   */
  embedFn?: (text: string) => Promise<number[]>;

  /**
   * Minimum [[[[[[[[Cosine Similarity]]]]]]]] (0–1) to consider a sentence grounded via embedding.
   * Default: 0.75
   */
  embeddingThreshold?: number;
};
```

### Properties

*   **`mode`**: `GroundingMode` (optional) - Determines the action to take when ungrounded claims are detected.
    *   `'warn'`: (Default) Logs a warning and allows the original response to pass through.
    *   `'annotate'`: Modifies the response to include `[ungrounded]` markers next to suspicious sentences.
    *   `'strict'`: Replaces the entire response with `overrideMessage` if the `minCoverage` threshold is not met [Source 1].
*   **`minCoverage`**: `number` (optional) - In `'strict'` mode, this is the minimum fraction (0.0 to 1.0) of sentences that must be grounded. If the score is below this, the response is overridden. Defaults to `0.3` [Source 1].
*   **`minOverlapTokens`**: `number` (optional) - The minimum number of significant words that must overlap between a sentence and the tool evidence for the sentence to be considered grounded by the [TF-IDF](../concepts/tf-idf.md) keyword method. Defaults to `3` [Source 1].
*   **`overrideMessage`**: `string` (optional) - The message used to replace the LLM's response when validation fails in `'strict'` mode [Source 1].
*   **`onAssessment`**: `(event: GroundingAssessment) => void` (optional) - A callback function that is invoked after each grounding assessment, providing detailed results of the check [Source 1].
*   **`minSentenceWords`**: `number` (optional) - Sentences with fewer words than this value are considered non-factual (e.g., greetings) and are skipped during validation. Defaults to `5` [Source 1].
*   **`llmScorer`**: `(opts: { sentence: string; evidenceSnippets: string[] }) => Promise<number>` (optional) - An async function that uses an LLM to provide a semantic Grounding Score (0-1) for sentences that have some keyword overlap but are below the `minOverlapTokens` threshold. This is useful for paraphrased or summarized claims [Source 1].
*   **`llmGroundingThreshold`**: `number` (optional) - The minimum score (0.0 to 1.0) from the `llmScorer` required to consider a sentence grounded. Defaults to `0.5` [Source 1].
*   **`embedFn`**: `(text: string) => Promise<number[]>` (optional) - An async function that generates [Vector Embeddings](../concepts/vector-embeddings.md) for text. When provided, it enables semantic grounding by comparing the Cosine Similarity of sentence embeddings with evidence embeddings. This can ground claims with no direct keyword overlap [Source 1].
*   **`embeddingThreshold`**: `number` (optional) - The minimum cosine similarity (0.0 to 1.0) required to consider a sentence grounded via the `embedFn`. Defaults to `0.75` [Source 1].

## Examples

### Basic Configuration

This example configures a `GroundingValidator` to operate in `'warn'` mode with a minimum coverage threshold for potential use in strict mode later.

```typescript
import { GroundingValidator, GroundingValidatorConfig } from 'yaaf';

const config: GroundingValidatorConfig = {
  mode: 'warn',
  minCoverage: 0.3,
};

const validator = new GroundingValidator(config);
```

### Configuration with an LLM Scorer

This example shows how to provide a custom LLM-based function to score borderline sentences for semantic similarity.

```typescript
import { GroundingValidator, GroundingValidatorConfig } from 'yaaf';
import { openai } from '@openai/agents'; // Fictional import for example

const config: GroundingValidatorConfig = {
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
  llmGroundingThreshold: 0.6,
};

const validator = new GroundingValidator(config);
```

### Configuration with an Embedding Function

This example demonstrates how to use a local embedding model (from Hugging Face Transformers.js) to perform semantic grounding based on vector similarity.

```typescript
import { GroundingValidator, GroundingValidatorConfig } from 'yaaf';
import { pipeline } from '@xenova/transformers';

// This setup would typically be done once in your application's initialization
const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const config: GroundingValidatorConfig = {
  mode: 'annotate',
  embedFn: async (text: string) => {
    const out = await embed(text, { pooling: 'mean', normalize: true });
    return Array.from(out.data as Float32Array);
  },
  embeddingThreshold: 0.8,
};

const validator = new GroundingValidator(config);
```

## Sources

[Source 1]: src/security/groundingValidator.ts