---
title: exceedsBudget
entity_type: api
summary: Efficiently check if text exceeds a specific token budget without calculating the full count.
export_name: exceedsBudget
source_file: src/utils/tokens.ts
category: function
stub: false
compiled_at: 2026-04-16T14:40:27.715Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/tokens.ts
confidence: 1
---

## Overview
The `exceedsBudget` function is a utility used to determine if a given string of text exceeds a specified token limit. It is designed to be more efficient than calculating a full token count when only a boolean result is required for validation or flow control. This is particularly useful in LLM-powered applications for pre-flight checks before sending data to a provider, ensuring the payload fits within context window constraints.

## Signature / Constructor
```typescript
/**
 * Check if text exceeds a token budget.
 * More efficient than estimateTokens when you only need a boolean.
 *
 * @param text - The text to check
 * @param budgetTokens - The token limit to check against
 * @returns True if the estimated tokens exceed the budget, false otherwise
 */
export function exceedsBudget(text: string, budgetTokens: number): boolean;
```

### Parameters
*   `text`: The string content to evaluate.
*   `budgetTokens`: The maximum number of tokens allowed for the given text.

## Examples

### Basic Budget Validation
This example demonstrates how to use `exceedsBudget` to validate user input against a fixed token limit.

```typescript
import { exceedsBudget } from 'yaaf';

const userInput = "This is a potentially long string of text...";
const MAX_ALLOWED = 1000;

if (exceedsBudget(userInput, MAX_ALLOWED)) {
  console.error("The provided text is too long for the current context.");
} else {
  // Proceed with processing
}
```

### Conditional Truncation Logic
Using the function to decide whether a truncation strategy should be applied to a prompt.

```typescript
import { exceedsBudget } from 'yaaf';

function preparePrompt(content: string, limit: number) {
  if (exceedsBudget(content, limit)) {
    // Apply truncation or summarization logic
    return content.slice(0, limit * 4) + "... [truncated]";
  }
  return content;
}
```