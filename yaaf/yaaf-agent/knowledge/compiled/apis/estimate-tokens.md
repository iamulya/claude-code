---
title: estimateTokens
entity_type: api
summary: Estimates token count from text using a character-ratio heuristic, designed to be conservative to prevent context overflow.
export_name: estimateTokens
source_file: src/utils/tokens.ts
category: function
search_terms:
 - token counting
 - estimate text length
 - context window size
 - how to count tokens
 - token estimation heuristic
 - prevent context overflow
 - character to token ratio
 - cheap token estimation
 - LLM input size
 - calculate message tokens
 - token budget check
 - fast token count
stub: false
compiled_at: 2026-04-24T17:05:03.058Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/historySnip.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/compiler/postprocess.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/knowledge/store/store.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/base.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/tokens.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `estimateTokens` function provides a fast, lightweight, and provider-agnostic way to approximate the number of tokens in a given string of text. It is used throughout YAAF to manage [Context Window](../concepts/context-window.md) sizes, segment large documents, and perform pre-compaction optimizations without incurring the cost of a full, model-specific tokenizer [Source 1, Source 2, Source 3].

The function employs a character-ratio heuristic to perform the estimation [Source 5]:
- For English text and code, it assumes approximately 4 characters per token.
- For text with a high concentration of CJK (Chinese, Japanese, Korean) characters (over 30%), it uses a ratio of approximately 1.5 characters per token.

This heuristic is intentionally conservative, typically overestimating the token count by 5-15%. This design choice helps prevent accidental [Context Overflow](../concepts/context-overflow.md) [when](./when.md) sending data to an [LLM](../concepts/llm.md). The final result is always rounded up to the nearest whole number [Source 5].

## Signature

```typescript
export function estimateTokens(text: string): number;
```

**Parameters:**

- `text` (`string`): The input text for which to estimate the token count.

**Returns:**

- `number`: The estimated number of tokens.

## Examples

### Basic [Token Estimation](../concepts/token-estimation.md)

This example demonstrates how to estimate the token count for a simple string.

```typescript
import { estimateTokens } from 'yaaf';

const text = "This is a sample sentence for token estimation.";
const tokenCount = estimateTokens(text);

console.log(`The estimated token count is: ${tokenCount}`);
// Expected output is based on ceil(text.length / 4)
```

### Checking Against a [Token Budget](../concepts/token-budget.md)

A common use case is to check if a piece of content, like a knowledge base article, exceeds a predefined token budget before processing. This pattern is used internally by the [Knowledge Base Compiler](../subsystems/knowledge-base-compiler.md) [Source 2].

```typescript
import { estimateTokens } from 'yaaf';

const articleContent = "... a very long string of text from a document ...";
const TOKEN_BUDGET = 15000;

if (estimateTokens(articleContent) > TOKEN_BUDGET) {
  console.log("Article exceeds the token budget and requires segmentation.");
} else {
  console.log("Article is within the token budget.");
}
```

## See Also

- `estimateMessageTokens`: A related utility for estimating tokens in a structured message object, accounting for JSON overhead.
- `estimateConversationTokens`: A utility for estimating the total token count for an array of messages.
- `exceedsBudget`: A more efficient alternative when only a boolean check against a budget is needed.

## Sources

- [Source 1]: `src/context/historySnip.ts`
- [Source 2]: `src/knowledge/compiler/postprocess.ts`
- [Source 3]: `src/knowledge/store/store.ts`
- [Source 4]: `src/models/base.ts`
- [Source 5]: `src/utils/tokens.ts`