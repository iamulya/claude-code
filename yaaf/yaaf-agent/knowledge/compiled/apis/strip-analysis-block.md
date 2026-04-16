---
title: stripAnalysisBlock
entity_type: api
summary: Utility to extract the final summary from a model's compaction output by removing the analysis scratchpad.
export_name: stripAnalysisBlock
source_file: src/context/compactionPrompts.ts
category: function
stub: false
compiled_at: 2026-04-16T14:16:58.894Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/compactionPrompts.ts
confidence: 1
---

## Overview
`stripAnalysisBlock` is a utility function used during the conversation compaction process. When using structured compaction prompts, Large Language Models (LLMs) are typically instructed to perform a "Chain of Thought" or internal reasoning inside an `<analysis>` tag before providing the final summary within a `<summary>` tag. 

This function parses the raw string output from the model and extracts only the content within the summary block, removing the analysis scratchpad. This ensures that the resulting context contains only the distilled information intended for the agent's long-term memory or subsequent turns.

## Signature / Constructor

```typescript
export function stripAnalysisBlock(text: string): string;
```

### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `text` | `string` | The raw text output from the model, containing both `<analysis>` and `<summary>` blocks. |

### Returns
`string`: The content extracted from the `<summary>` block.

## Examples

### Basic Usage
This example demonstrates how to use `stripAnalysisBlock` to clean a model's response after a compaction request.

```typescript
import { buildCompactionPrompt, stripAnalysisBlock } from './compactionPrompts.js';

// 1. Generate the structured prompt
const prompt = buildCompactionPrompt({ partial: false });

// 2. Get the completion from the model
const response = await model.complete({ 
  messages: [...messages, { role: 'user', content: prompt }] 
});

// 3. Strip the <analysis> scratchpad to get the clean summary
const cleanSummary = stripAnalysisBlock(response.content);

console.log(cleanSummary);
```

## See Also
- `buildCompactionPrompt`
- `extractAnalysisBlock`