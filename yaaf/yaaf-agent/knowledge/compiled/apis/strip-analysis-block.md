---
title: stripAnalysisBlock
entity_type: api
summary: Extracts the summary block from a model's output, removing the analysis scratchpad.
export_name: stripAnalysisBlock
source_file: src/context/compactionPrompts.ts
category: function
search_terms:
 - clean LLM summary
 - remove analysis from model output
 - parse compaction prompt response
 - extract summary block
 - strip scratchpad text
 - how to get just the summary
 - compaction prompt post-processing
 - regex for summary block
 - handle large model responses
 - prevent regex DoS
 - lazy regex performance
 - context compaction utilities
stub: false
compiled_at: 2026-04-24T17:41:39.423Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/compactionPrompts.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `stripAnalysisBlock` function is a utility designed to process the raw string output from a Large Language Model ([LLM](../concepts/llm.md)) that has responded to a structured compaction prompt, such as one created by `buildCompactionPrompt`. Its primary purpose is to isolate and return the final `<summary>` block from the model's response, effectively removing the preceding `<analysis>` scratchpad block that the model uses for its reasoning process [Source 1].

This is a common post-processing step in [Context Compaction](../concepts/context-compaction.md) [workflow](../concepts/workflow.md)s. After the model generates a structured response containing both its thought process and the final summary, this function provides a clean, usable summary string for storage or further use [Source 1].

For performance and security, `stripAnalysisBlock` caps the input text at 512 KB before applying its regular expression. This prevents potential event-loop blocking or catastrophic backtracking if the LLM generates an extremely large response without the expected closing tag for the summary block [Source 1].

## Signature

```typescript
export function stripAnalysisBlock(text: string): string;
```

### Parameters

- **text** `string`: The raw string content from the model's completion, expected to contain `<analysis>` and `<summary>` blocks.

### Returns

- `string`: The extracted content of the `<summary>` block.

## Examples

The following example demonstrates the typical workflow of building a compaction prompt, receiving a model completion, and then using `stripAnalysisBlock` to clean the output.

```typescript
import { buildCompactionPrompt, stripAnalysisBlock } from 'yaaf';

// Assume `model` is an initialized LLM client and `msgs` is an array of messages.
const prompt = buildCompactionPrompt({ partial: false });
const summaryCompletion = await model.complete({ messages: [...msgs, { role: 'user', content: prompt }] });

// The model's raw output might be:
// "<analysis>The user is asking about X...</analysis><summary>The user inquired about X.</summary>"
const rawContent = summaryCompletion.content;

// Clean the output to get only the summary text.
const cleanSummary = stripAnalysisBlock(rawContent);
// cleanSummary is now "The user inquired about X."
```
[Source 1]

## See Also

- `buildCompactionPrompt`: A function to generate the structured prompts that produce output parsable by this function.
- `extractAnalysisBlock`: A related utility for extracting the `<analysis>` block instead of the summary, which is useful for debugging compaction quality.

## Sources

[Source 1]: src/context/compactionPrompts.ts