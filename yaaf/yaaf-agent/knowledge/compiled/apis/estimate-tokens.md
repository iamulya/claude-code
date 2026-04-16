---
title: estimateTokens
entity_type: api
summary: Estimate token count from text using a conservative character-ratio heuristic.
export_name: estimateTokens
source_file: src/utils/tokens.ts
category: function
stub: false
compiled_at: 2026-04-16T14:40:20.238Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/tokens.ts
confidence: 1
---

## Overview
`estimateTokens` is a utility function designed to provide a fast, local approximation of token counts for a given string. It is used primarily to manage LLM context windows and prevent overflow errors without the performance overhead or dependency requirements of a full byte-pair encoding (BPE) tokenizer.

The function employs a character-ratio heuristic of approximately 4 characters per token, which is a standard approximation for English text and source code. It is designed to be "conservative" by intentionally overestimating token counts—typically by 5–10% for prose and 10–15% for code—ensuring that the actual token count processed by a model provider is unlikely to exceed the estimate. The resulting value is always rounded up to the nearest integer.

## Signature
```typescript
export function estimateTokens(text: string): number;
```

### Parameters
*   `text`: The string content to be evaluated for token estimation.

### Returns
*   `number`: The estimated token count, rounded up to the nearest whole number.

## Examples

### Basic Usage
This example demonstrates estimating tokens for a simple sentence.

```typescript
import { estimateTokens } from 'yaaf';

const prose = "The quick brown fox jumps over the lazy dog.";
const tokens = estimateTokens(prose);

console.log(`Estimated tokens: ${tokens}`);
// "The quick brown fox jumps over the lazy dog." is 44 characters.
// 44 / 4 = 11 tokens.
```

### Estimating Code
Because code often has a higher character-to-token density, the heuristic's 10–15% overestimate provides a safety buffer for context window management.

```typescript
import { estimateTokens } from 'yaaf';

const code = `function add(a, b) {
  return a + b;
}`;

const tokens = estimateTokens(code);
console.log(`Estimated tokens for code: ${tokens}`);
```