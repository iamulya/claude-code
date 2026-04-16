---
title: Preventing Hallucinations with Grounding
entity_type: guide
summary: How to configure the GroundingValidator to verify agent responses against tool evidence.
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:34:04.718Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/groundingValidator.ts
confidence: 0.85
---

## Overview
Grounding is a technique used to ensure that an LLM's response is supported by factual evidence retrieved during the conversation, typically from tool outputs. In YAAF, the `GroundingValidator` provides a lightweight, non-LLM-based mechanism to cross-reference agent claims against tool results.

By implementing grounding, developers can detect and mitigate hallucinations—instances where the LLM makes factual assertions that are not present in the provided context.

## Prerequisites
- A YAAF agent configured with at least one tool.
- Understanding of YAAF hooks, specifically the `afterLLM` hook.

## Step-by-Step

### 1. Basic Configuration (Warn Mode)
The least intrusive way to implement grounding is using the `warn` mode. This logs ungrounded claims but does not modify the agent's response.

```typescript
import { Agent, groundingValidator } from 'yaaf';

const validator = groundingValidator({
  mode: 'warn',
  minCoverage: 0.3, // 30% of factual sentences must be backed by tool results
});

const agent = new Agent({
  hooks: {
    afterLLM: validator.hook(),
  },
});
```

### 2. Implementing Strict Validation
In production environments where factual accuracy is critical, use `strict` mode. This will override the agent's response with a predefined message if the grounding score falls below the required threshold.

```typescript
import { Agent, strictGroundingValidator } from 'yaaf';

const validator = strictGroundingValidator({
  minCoverage: 0.5,
  overrideMessage: "I'm sorry, but I cannot verify the facts required to answer that accurately based on the available data."
});

const agent = new Agent({
  hooks: {
    afterLLM: validator.hook(),
  },
});
```

### 3. Annotating Responses
The `annotate` mode allows the agent to respond normally but appends warning markers (e.g., `[⚠️ ungrounded]`) to specific sentences that the validator could not verify against tool evidence.

```typescript
import { GroundingValidator } from 'yaaf';

const validator = new GroundingValidator({
  mode: 'annotate',
  minOverlapTokens: 4, // Require 4 matching words to consider a sentence grounded
});
```

### 4. Monitoring Grounding Assessments
You can capture detailed metrics on how well the agent is grounding its responses by providing an `onAssessment` callback.

```typescript
const validator = new GroundingValidator({
  mode: 'warn',
  onAssessment: (event) => {
    console.log(`Grounding Score: ${event.score}`);
    console.log(`Grounded Sentences: ${event.groundedSentences}/${event.totalSentences}`);
    
    event.sentences.forEach(s => {
      if (!s.grounded) {
        console.warn(`Ungrounded claim detected: "${s.text}"`);
      }
    });
  }
});
```

## Configuration Reference

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `mode` | `GroundingMode` | `'warn'` | Validation behavior: `warn`, `annotate`, or `strict`. |
| `minCoverage` | `number` | `0.3` | The fraction (0-1) of factual sentences that must be grounded. |
| `minOverlapTokens` | `number` | `3` | Minimum number of significant words that must overlap with tool evidence. |
| `minSentenceWords` | `number` | `5` | Minimum words for a sentence to be considered a "factual claim" worth checking. |
| `overrideMessage` | `string` | - | The message returned to the user if validation fails in `strict` mode. |
| `onAssessment` | `Function` | - | Callback triggered for every grounding check. |

## Common Mistakes

1.  **Setting `minOverlapTokens` Too High**: If this value is too high, the validator may flag legitimate, grounded responses as hallucinations simply because the LLM used synonyms or different phrasing than the tool output.
2.  **Applying Strict Mode Without Testing**: Strict mode can lead to a poor user experience if the `minCoverage` threshold is too aggressive. It is recommended to run in `warn` mode first to collect baseline data via `onAssessment`.
3.  **Ignoring Short Sentences**: The `minSentenceWords` setting defaults to 5 to avoid checking greetings (e.g., "Hello!") or transitions. If your tools return very short, concise data points, you may need to lower this value.

## Next Steps
- Explore other security hooks in the YAAF framework.
- Learn how to optimize tool output formatting to improve grounding overlap.