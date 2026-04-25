---
title: ToolResultBudgetResult
entity_type: api
summary: Represents the output of applying the tool result budget, including the modified messages, count of cleared results, and estimated characters freed.
export_name: ToolResultBudgetResult
source_file: src/utils/toolResultBudget.ts
category: type
search_terms:
 - tool result budget output
 - applyToolResultBudget return type
 - context window management
 - tool output truncation
 - cleared tool results count
 - characters freed by budget
 - modified message list
 - tool result size limiting
 - conversation history pruning
 - LLM context optimization
 - what does applyToolResultBudget return
stub: false
compiled_at: 2026-04-24T17:45:36.538Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/toolResultBudget.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`ToolResultBudgetResult` is a TypeScript type that represents the outcome of applying a size budget to [tool results](../concepts/tool-results.md) within a conversation history. It is the return type of the `applyToolResultBudget` function [Source 1].

This object encapsulates the results of the budgeting process, providing both the modified array of messages and metadata about the changes made. This allows developers to not only use the pruned message list but also to log or inspect how many tool results were cleared and the estimated context space that was saved [Source 1].

## Signature

The `ToolResultBudgetResult` type is an object with the following properties [Source 1]:

```typescript
export type ToolResultBudgetResult = {
  /** The messages with budget applied */
  messages: ChatMessage[];
  /** Number of tool results cleared */
  cleared: number;
  /** Estimated characters freed */
  charsFreed: number;
};
```

### Properties

*   **`messages: ChatMessage[]`**
    The new array of chat messages after the [Tool Result Budget](../concepts/tool-result-budget.md) has been applied. Some older tool results may have their content replaced by a placeholder message [Source 1].

*   **`cleared: number`**
    The total number of `role: 'tool'` messages whose content was cleared and replaced with a placeholder to conform to the budget [Source 1].

*   **`charsFreed: number`**
    An estimate of the total number of characters removed from the tool result messages, providing a measure of the context space saved [Source 1].

## Examples

The following example demonstrates how to use the `applyToolResultBudget` function and inspect the resulting `ToolResultBudgetResult` object.

```typescript
import { applyToolResultBudget, ToolResultBudgetResult, ChatMessage } from 'yaaf';

// Assume 'longListOfMessages' is an array of ChatMessage objects
// containing many large tool results.
declare const longListOfMessages: ChatMessage[];

// Apply the budget
const result: ToolResultBudgetResult = applyToolResultBudget(longListOfMessages, {
  maxTotalChars: 50000, // Set a custom character limit
});

// Log the outcome of the budgeting process
console.log(`Budget applied. Cleared ${result.cleared} tool results.`);
console.log(`Freed approximately ${result.charsFreed} characters from the context.`);

// The modified messages are now ready to be sent to the LLM
// const llmResponse = await llm.chat(result.messages);
```

## See Also

*   `applyToolResultBudget`: The function that returns a `ToolResultBudgetResult`.
*   `ToolResultBudgetConfig`: The configuration object used to control the budgeting process.

## Sources

[Source 1]: src/utils/toolResultBudget.ts