---
title: buildCompactionPrompt
entity_type: api
summary: Builds a structured compaction prompt with an analysis scratchpad and anti-tool preamble for high-quality conversation summarization.
export_name: buildCompactionPrompt
source_file: src/context/compactionPrompts.ts
category: function
search_terms:
 - conversation summarization prompt
 - context compaction
 - how to summarize chat history
 - prompt engineering for summaries
 - analysis scratchpad
 - anti-tool preamble
 - structured summarization
 - partial conversation summary
 - full conversation summary
 - reduce context window size
 - LLM memory management
 - prompt for summarizing messages
stub: false
compiled_at: 2026-04-24T16:52:46.158Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/compactionPrompts.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `buildCompactionPrompt` function constructs a carefully engineered, production-quality prompt designed to instruct a Large Language Model ([LLM](../concepts/llm.md)) to summarize a conversation. This is a key utility for [Context Compaction](../concepts/context-compaction.md), where older parts of a conversation are summarized to save space in the [Context Window](../concepts/context-window.md) [Source 1].

The generated prompt is structured to elicit high-quality summaries by including several features [Source 1]:
- An **analysis scratchpad** section, where the model is instructed to first think about the conversation before writing the final summary.
- An **anti-tool preamble**, which helps prevent the model from attempting to use [Tools](../subsystems/tools.md) during the summarization task.
- A requirement for **9 specific sections** in the summary, ensuring a comprehensive and [Structured Output](../concepts/structured-output.md).

This function is typically used [when](./when.md) implementing a [Context Management](../subsystems/context-management.md) strategy that requires summarizing parts of the message history to keep the token count manageable.

## Signature

The function takes an optional configuration object to customize the generated prompt [Source 1].

```typescript
export function buildCompactionPrompt(config: CompactionPromptConfig = {}): string;
```

### `CompactionPromptConfig`

The configuration object `CompactionPromptConfig` allows for customization of the prompt's behavior and content [Source 1].

```typescript
export type CompactionPromptConfig = {
  /**
   * If true, generates a "partial" prompt that only summarizes recent messages
   * (used when old messages are preserved and only the middle is compacted).
   * If false, generates a "full" prompt that summarizes the entire conversation.
   * @default false
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

## Examples

The following example demonstrates how to generate a compaction prompt, use it with a model, and then process the model's output to extract the clean summary [Source 1].

```typescript
import { buildCompactionPrompt, stripAnalysisBlock } from 'yaaf';
import { model } from './my-llm-provider.js';
import { Message } from 'yaaf';

// Assume `msgs` is an array of Message objects from a conversation
const msgs: Message[] = [
  // ... conversation history ...
];

// 1. Build the prompt for a full conversation summary.
const prompt = buildCompactionPrompt({ partial: false });

// 2. Send the history and the compaction prompt to the model.
const summaryCompletion = await model.complete({
  messages: [...msgs, { role: 'user', content: prompt }]
});

// 3. The model output contains both an <analysis> block and a <summary> block.
//    Use stripAnalysisBlock to extract only the clean summary text.
const cleanSummary = stripAnalysisBlock(summaryCompletion.content);

console.log(cleanSummary);
```

## See Also

- `stripAnalysisBlock`: A utility function to extract the `<summary>` block from the model's output, removing the analysis scratchpad.
- `extractAnalysisBlock`: A utility function to extract the `<analysis>` block, which can be useful for debugging summarization quality.

## Sources

[Source 1]: src/context/compactionPrompts.ts