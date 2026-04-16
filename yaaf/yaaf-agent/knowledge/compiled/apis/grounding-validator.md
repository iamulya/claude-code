---
title: GroundingValidator
entity_type: api
summary: A validator that cross-references LLM responses against tool results to detect and mitigate hallucinations using keyword overlap scoring.
export_name: GroundingValidator
source_file: src/security/groundingValidator.ts
category: class
stub: false
compiled_at: 2026-04-16T14:33:59.814Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/groundingValidator.ts
confidence: 1
---

## Overview
`GroundingValidator` is a security and quality assurance utility designed to reduce LLM hallucinations. It performs an anti-hallucination cross-reference check by validating LLM responses against the "evidence" available in the conversation history—specifically the results returned by tools.

The validator uses a lightweight keyword and phrase overlap algorithm to score how well a response is supported by tool outputs. Because it does not require an additional LLM call to perform the validation, it is computationally efficient and suitable for production runtimes.

The validator supports three operational modes:
*   `warn`: Logs ungrounded claims but allows the response to pass through unchanged.
*   `annotate`: Appends `[⚠️ ungrounded]` markers to sentences that lack sufficient evidence.
*   `strict`: Overrides the LLM response with a fallback message if the grounding score falls below a defined threshold.

## Signature / Constructor

```typescript
export class GroundingValidator {
  constructor(config?: GroundingValidatorConfig)
}
```

### GroundingValidatorConfig
The configuration object defines the sensitivity and behavior of the validation logic.

| Property | Type | Description |
| :--- | :--- | :--- |
| `mode` | `GroundingMode` | The validation mode: `'warn'`, `'annotate'`, or `'strict'`. Defaults to `'warn'`. |
| `minCoverage` | `number` | The minimum fraction (0-1) of factual sentences that must be grounded. Used in `strict` mode. Defaults to `0.3`. |
| `minOverlapTokens` | `number` | The minimum number of overlapping tokens required to consider a sentence "grounded". Defaults to `3`. |
| `overrideMessage` | `string` | The message used to replace the LLM response when validation fails in `strict` mode. |
| `onAssessment` | `Function` | A callback triggered on every assessment, receiving a `GroundingAssessment` object. |
| `minSentenceWords` | `number` | The minimum word count for a sentence to be considered a "factual claim" worth checking. Defaults to `5`. |

### Supporting Types

#### GroundingMode
```typescript
export type GroundingMode = 'warn' | 'annotate' | 'strict'
```

#### GroundingAssessment
The result of a validation check, passed to the `onAssessment` callback.
```typescript
export type GroundingAssessment = {
  score: number
  totalSentences: number
  groundedSentences: number
  sentences: GroundingSentence[]
  action: 'passed' | 'warned' | 'annotated' | 'overridden'
  timestamp: Date
}
```

#### GroundingSentence
A breakdown of individual sentence validation results.
```typescript
export type GroundingSentence = {
  text: string
  grounded: boolean
  overlapCount: number
  bestSource?: string
}
```

## Methods & Properties

### hook()
Returns an LLM hook that can be integrated into an agent's lifecycle (typically the `afterLLM` hook).

### Factory Functions
The module also exports factory functions for common configurations:

*   **`groundingValidator(config?: GroundingValidatorConfig)`**: Creates a validator with production defaults.
*   **`strictGroundingValidator(config?: Omit<GroundingValidatorConfig, 'mode'>)`**: Creates a validator pre-configured to `strict` mode.

## Examples

### Basic Usage with Agent Hooks
This example demonstrates how to integrate the validator into an agent to log warnings when ungrounded claims are detected.

```typescript
import { GroundingValidator, Agent } from 'yaaf';

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

### Strict Mode with Custom Thresholds
In this configuration, the validator will override the agent's response if fewer than 50% of the factual claims are supported by tool evidence.

```typescript
import { strictGroundingValidator } from 'yaaf';

const validator = strictGroundingValidator({
  minCoverage: 0.5,
  minOverlapTokens: 5,
  overrideMessage: "I'm sorry, but I cannot verify the facts required to answer that accurately."
});
```

## See Also
*   `Agent`
*   `LLMHookResult`