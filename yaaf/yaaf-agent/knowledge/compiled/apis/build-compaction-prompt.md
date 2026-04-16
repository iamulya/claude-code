---
title: buildCompactionPrompt
entity_type: api
summary: Generates a structured prompt for the LLM to perform context compaction with an analysis scratchpad and anti-tool preamble.
export_name: buildCompactionPrompt
source_file: src/context/compactionPrompts.ts
category: function
stub: false
compiled_at: 2026-04-16T14:16:51.465Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/compactionPrompts.ts
confidence: 1
---

## Overview
`buildCompactionPrompt` is a utility function designed to generate production-quality summarization prompts for context management. It is used to instruct an LLM to condense conversation history into a structured summary, allowing the agent to maintain long-term context while staying within token limits.

The generated prompt incorporates several advanced prompting techniques:
*   **Analysis Scratchpad**: Instructs the model to reason about the conversation within `<analysis>` tags before producing the final summary.
*   **Anti-tool Preamble**: Prevents the model from attempting to invoke tools or functions during the compaction process.
*   **Structured Output**: Requires the model to produce a summary across nine specific sections to ensure no critical information is lost.

## Signature / Constructor

```typescript
export function buildCompactionPrompt(config?: CompactionPromptConfig): string;

export type CompactionPromptConfig = {
  /**
   * If true, generates a "partial" prompt that only summarizes recent messages
   * (used when old messages are preserved and only the middle is compacted).
   * If false, generates a "full" prompt that summarizes the entire conversation.
   */
  partial?: boolean;
  /**
   * Custom sections to include in the summary. If omitted, uses all 9 defaults.
   */
  sections?: string[];
  /**
   * Extra instructions appended to the prompt.
   */
  additionalInstructions?: string;
};
```

## Methods & Properties

### CompactionPromptConfig
The configuration object accepts the following properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `partial` | `boolean` | Determines if the prompt should target the entire history or just a recent subset. |
| `sections` | `string[]` | An optional list of specific headers or categories the LLM should address in the summary. |
| `additionalInstructions` | `string` | Context-specific rules or constraints to append to the system prompt. |

## Examples

### Basic Usage
This example demonstrates generating a standard compaction prompt and cleaning the model's output.

```typescript
import { buildCompactionPrompt, stripAnalysisBlock } from './compactionPrompts.js';

// 1. Generate the prompt
const prompt = buildCompactionPrompt({ partial: false });

// 2. Send to the model (pseudo-code)
const response = await model.complete({ 
  messages: [
    ...history, 
    { role: 'user', content: prompt }
  ] 
});

// 3. Strip the <analysis> scratchpad to get the final summary
const cleanSummary = stripAnalysisBlock(response.content);
```

### Partial Compaction with Custom Instructions
Used when only a portion of the conversation needs to be summarized.

```typescript
const prompt = buildCompactionPrompt({
  partial: true,
  additionalInstructions: "Focus specifically on technical requirements mentioned in the last 5 turns."
});
```

## See Also
* `stripAnalysisBlock`: A utility to remove the reasoning scratchpad from the model's response.
* `extractAnalysisBlock`: A utility to isolate the reasoning scratchpad for debugging purposes.