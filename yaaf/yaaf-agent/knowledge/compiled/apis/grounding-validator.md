---
title: GroundingValidator
entity_type: api
summary: A class that validates LLM responses against tool evidence to detect and mitigate hallucination.
export_name: GroundingValidator
source_file: src/security/groundingValidator.ts
category: class
search_terms:
 - hallucination detection
 - fact checking LLM
 - grounding LLM responses
 - validate agent output
 - cross-reference tool results
 - preventing misinformation
 - semantic similarity check
 - keyword overlap validation
 - LLM response annotation
 - strict mode validation
 - how to stop agent from lying
 - TF-IDF grounding
 - embedding similarity grounding
 - anti-hallucination
 - response verification
stub: false
compiled_at: 2026-04-24T17:09:51.567Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/security/groundingValidator.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `GroundingValidator` class is a security and reliability component designed to mitigate [LLM](../concepts/llm.md) hallucination [Source 1]. It operates by cross-referencing claims made in an LLM's response against the evidence provided by tool outputs within the current conversation history. This process ensures that the agent's statements are "grounded" in factual data it has observed [Source 1].

The validator can be configured to operate in one of three modes [Source 1]:
- **`warn`**: Logs a warning for ungrounded claims but allows the original response to pass through. This is the default mode.
- **`annotate`**: Modifies the response by appending markers like `[ungrounded]` to sentences that cannot be verified against tool evidence.
- **`strict`**: If the fraction of grounded sentences falls below a configured threshold (`minCoverage`), the entire response is replaced with a predefined message.

Grounding is assessed using a multi-layered scoring model to balance performance and accuracy [Source 1]:
1.  **[TF-IDF](../concepts/tf-idf.md) Keyword Overlap**: A fast, zero-cost check that is always active. A sentence is considered grounded if it shares a minimum number of significant words with any tool result.
2.  **[Embedding Similarity](../concepts/embedding-similarity.md)**: An optional, more advanced check using an `embedFn`. It measures the semantic similarity between a sentence and the tool evidence, allowing it to ground paraphrased or summarized claims that have low keyword overlap.
3.  **[LLM Semantic Scorer](../concepts/llm-semantic-scorer.md)**: An optional, final-resort check using an `llmScorer` function. It is invoked for "borderline" sentences that have some keyword overlap but not enough to meet the threshold, providing a human-quality semantic evaluation.

This class is typically used by creating an instance and registering its `hook()` method with an agent's `afterLLM` lifecycle hook [Source 1].

## Constructor

The `GroundingValidator` is instantiated with a configuration object that defines its behavior.

```typescript
import type { GroundingValidatorConfig } from 'yaaf';

export class GroundingValidator {
  constructor(config?: GroundingValidatorConfig);
  // ...
}
```

### Configuration (`GroundingValidatorConfig`)

The constructor accepts the following configuration options [Source 1]:

| Property | Type | Description |
| --- | --- | --- |
| `mode` | `"warn" \| "annotate" \| "strict"` | The validation mode. Defaults to `warn`. |
| `minCoverage` | `number` | The minimum fraction (0-1) of sentences that must be grounded. Only used in `strict` mode. Default: `0.3`. |
| `minOverlapTokens` | `number` | The minimum number of overlapping significant words for a sentence to be grounded by keyword matching. Default: `3`. |
| `overrideMessage` | `string` | The message to use [when](./when.md) overriding a response in `strict` mode. |
| `onAssessment` | `(event: GroundingAssessment) => void` | A callback function invoked after each grounding assessment. |
| `minSentenceWords` | `number` | The minimum number of words a sentence must have to be checked. Shorter sentences are skipped. Default: `5`. |
| `llmScorer` | `(opts: { sentence: string; evidenceSnippets: string[] }) => Promise<number>` | An optional async function to score borderline sentences using an LLM. It should return a score between 0 (ungrounded) and 1 (fully grounded). |
| `llmGroundingThreshold` | `number` | The minimum score from `llmScorer` to consider a sentence grounded. Default: `0.5`. |
| `embedFn` | `(text: string) => Promise<number[]>` | An optional async function to generate [Vector Embeddings](../concepts/vector-embeddings.md) for semantic similarity checks. |
| `embeddingThreshold` | `number` | The minimum [Cosine Similarity](../concepts/cosine-similarity.md) score (0-1) to consider a sentence grounded via embeddings. Default: `0.75`. |

## Methods & Properties

### `hook()`

Creates an `afterLLM` hook function that can be registered with an agent. This method is the primary way to integrate the validator into the agent's lifecycle.

```typescript
// Signature not explicitly provided in source, inferred from usage
hook(): (context: { messages: ChatMessage[] }, result: ChatResult) => Promise<LLMHookResult | void>;
```

## Events

The `GroundingValidator` emits an `assessment` event via the `onAssessment` callback provided in its configuration.

### `assessment`

Fires after every grounding check is performed on an LLM response.

**Payload**: `GroundingAssessment`

```typescript
export type GroundingAssessment = {
  /** Overall grounding score (0-1) */
  score: number;
  /** Number of factual sentences checked */
  totalSentences: number;
  /** Number of grounded sentences */
  groundedSentences: number;
  /** Per-sentence breakdown */
  sentences: GroundingSentence[];
  /** Action taken */
  action: "passed" | "warned" | "annotated" | "overridden";
  /** Timestamp */
  timestamp: Date;
};

export type GroundingSentence = {
  /** The sentence text */
  text: string;
  /** Whether this sentence is grounded in tool evidence */
  grounded: boolean;
  /** Number of overlapping tokens with tool evidence */
  overlapCount: number;
  /** Which tool result provided the best evidence (if any) */
  bestSource?: string;
  /**
   * Which method determined grounding.
   * 'keyword' = TF-IDF overlap; 'embedding' = cosine similarity; 'llm' = LLM scorer.
   */
  scoredBy?: "keyword" | "embedding" | "llm";
};
```

## Examples

### Basic Usage

The following example demonstrates how to create a `GroundingValidator` in `warn` mode and attach it to an agent.

```typescript
import { Agent, GroundingValidator } from 'yaaf';

const validator = new GroundingValidator({
  mode: 'warn',
  minCoverage: 0.3,
  onAssessment: (assessment) => {
    console.log(`Grounding score: ${assessment.score}`);
  },
});

const agent = new Agent({
  hooks: {
    afterLLM: validator.hook(),
  },
  // ... other agent config
});
```

### Using an LLM Scorer

This example configures the validator to use an external LLM (`gpt-4o-mini`) to score sentences that have some, but not enough, keyword overlap.

```typescript
import { GroundingValidator } from 'yaaf';
import { openai } from '@openai/agents'; // Fictional import for example

const validator = new GroundingValidator({
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
});
```

### Using an Embedding Function

This example shows how to use a local embedding model (from `@xenova/transformers`) for semantic grounding, which avoids an extra [LLM Call](../concepts/llm-call.md).

```typescript
import { GroundingValidator } from 'yaaf';
import { pipeline } from '@xenova/transformers';

// Initialize the embedding pipeline
const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const validator = new GroundingValidator({
  mode: 'annotate',
  embedFn: async (text) => {
    const out = await embed(text, { pooling: 'mean', normalize: true });
    return Array.from(out.data as Float32Array);
  },
  embeddingThreshold: 0.8, // Set a custom threshold
});
```

## See Also

- `groundingValidator()`: A factory function to create a `GroundingValidator` with production defaults.
- `strictGroundingValidator()`: A factory function to create a `GroundingValidator` pre-configured for `strict` mode.

## Sources

[Source 1]: src/security/groundingValidator.ts