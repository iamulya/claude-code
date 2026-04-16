---
summary: The design principle of ensuring LLM responses are strictly derived from provided context or tool execution results.
title: Grounding
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:27:26.389Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/knowledge/compiler/validator.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/security/groundingValidator.ts
confidence: 0.95
---

---
title: Grounding
entity_type: concept
summary: The design principle of ensuring LLM responses are strictly derived from provided context or tool execution results.
related_subsystems:
  - security
  - knowledge

## What It Is
Grounding is the design principle and technical process of ensuring that claims made by an LLM or a synthesis engine are strictly supported by provided evidence. In YAAF, grounding serves as a primary defense against hallucinations—instances where the model generates factual-sounding information that is not present in its source material or tool outputs.

The framework applies grounding in two primary contexts:
1.  **Knowledge Synthesis**: Validating that generated documentation or articles are backed by the raw source files provided to the compiler.
2.  **Agent Execution**: Validating that an agent's response to a user is supported by the results of tool executions within the conversation history.

## How It Works in YAAF
YAAF implements grounding using a lightweight keyword and phrase overlap algorithm. Unlike many other validation steps, YAAF's grounding mechanism does not require additional LLM calls, making it computationally efficient and suitable for production runtimes.

### Mechanism
The framework breaks down the generated text into individual sentences and evaluates them against "evidence" (either source texts or tool results). A sentence is considered grounded if it meets a specific threshold of keyword overlap with the evidence.

Key metrics used in grounding assessments include:
*   **Coverage Score**: The percentage of factual claims or sentences backed by source material (typically 0.0 to 1.0).
*   **Overlap Count**: The number of significant tokens that match between a claim and its source.
*   **Sentence Filtering**: The system ignores short sentences (e.g., greetings or acknowledgments) to focus validation on "factual claims," which are typically defined as sentences exceeding a specific word count (defaulting to 5).

### Implementation Classes
*   `GroundingValidator`: A security utility used in agent runtimes to cross-reference LLM responses against tool results. It can be integrated via the `afterLLM` hook.
*   `validateGrounding`: A function within the knowledge compiler's validation phase that scores synthesized articles against their source texts.

## Configuration
Grounding behavior is highly configurable, particularly when used within the agent's security subsystem. Developers can choose between different enforcement modes and adjust sensitivity thresholds.

### Validation Modes
The `GroundingValidator` supports three operational modes:
*   `warn`: Logs ungrounded claims but allows the response to pass through to the user.
*   `annotate`: Appends markers (e.g., `[⚠️ ungrounded]`) to specific sentences that lack sufficient evidence.
*   `strict`: Overrides the LLM's response entirely if the overall grounding score falls below a defined threshold.

### Example Configuration
```ts
import { GroundingValidator, Agent } from 'yaaf';

const validator = new GroundingValidator({
  mode: 'strict',
  minCoverage: 0.3,        // 30% of sentences must be grounded
  minOverlapTokens: 3,     // At least 3 matching words per sentence
  minSentenceWords: 5,     // Only check sentences with 5+ words
  overrideMessage: "I'm sorry, but I cannot verify that information with my available tools."
});

const agent = new Agent({
  hooks: {
    afterLLM: validator.hook(),
  },
});
```

### Knowledge Validation
In the knowledge compiler, grounding is used during the post-synthesis phase to detect potential hallucinations in generated articles. The `validateGrounding` function returns a `GroundingResult` containing the support score and a list of specific unsupported claims for manual review.

## Sources
* `src/knowledge/compiler/validator.ts`
* `src/security/groundingValidator.ts`---