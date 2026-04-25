---
summary: Checks if text exceeds a specified token budget, providing a more efficient boolean check than full token estimation.
export_name: exceedsBudget
source_file: src/utils/tokens.ts
category: function
title: exceedsBudget
entity_type: api
search_terms:
 - token budget check
 - check if text is too long
 - validate token count
 - efficient token limit
 - context window overflow
 - prevent exceeding token limit
 - token estimation boolean
 - string length vs token budget
 - text token limit
 - YAAF token utilities
 - how to check token budget
stub: false
compiled_at: 2026-04-24T17:05:16.940Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/tokens.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

The `exceedsBudget` function is a utility that checks if a given string of text is likely to exceed a specified [Token Budget](../concepts/token-budget.md). It provides a simple boolean (`true`/`false`) result.

This function is designed to be more efficient than performing a full token count estimation with a function like `estimateTokens` [when](./when.md) the only required information is whether the text is over a certain limit [Source 1]. It is useful for implementing guard clauses or pre-checks to prevent sending overly long text to an [LLM](../concepts/llm.md), which could result in errors or unnecessary costs.

## Signature

```typescript
export function exceedsBudget(text: string, budgetTokens: number): boolean;
```

### Parameters

-   `text: string`: The input text to check against the budget.
-   `budgetTokens: number`: The maximum number of tokens allowed.

### Returns

-   `boolean`: Returns `true` if the estimated token count of the `text` exceeds `budgetTokens`, and `false` otherwise.

## Examples

Here is a basic example demonstrating how to use `exceedsBudget` to validate text length before processing.

```typescript
import { exceedsBudget } from 'yaaf';

const shortText = "This is a short sentence.";
const longText = "This is a very long sentence that is designed to demonstrate what happens when the estimated token count for a given piece of text potentially goes over the specified budget that has been set by the developer using the utility function.";

const budget = 20;

// Check the short text
if (exceedsBudget(shortText, budget)) {
  console.log(`Warning: Short text exceeds the budget of ${budget} tokens.`);
} else {
  console.log(`OK: Short text is within the budget of ${budget} tokens.`);
  // Expected output: OK: Short text is within the budget of 20 tokens.
}

// Check the long text
if (exceedsBudget(longText, budget)) {
  console.log(`Warning: Long text exceeds the budget of ${budget} tokens.`);
  // Expected output: Warning: Long text exceeds the budget of 20 tokens.
} else {
  console.log(`OK: Long text is within the budget of ${budget} tokens.`);
}
```

## See Also

-   `estimateTokens`: For when an actual estimated token count is needed, rather than just a boolean check.

## Sources

[Source 1] src/utils/tokens.ts