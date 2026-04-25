---
title: ToolResultBudgetConfig
entity_type: api
summary: Defines the configuration options for the tool result budget mechanism, including maximum characters, results to keep, and placeholder text.
export_name: ToolResultBudgetConfig
source_file: src/utils/toolResultBudget.ts
category: type
search_terms:
 - tool result size limit
 - context window management
 - prevent context blowout
 - limit tool output
 - tool result truncation
 - aggregate tool result size
 - maxTotalChars
 - keepRecent tool results
 - exemptTools from budget
 - clearedMessage placeholder
 - how to configure tool budget
 - tool result context saving
 - context length error
stub: false
compiled_at: 2026-04-24T17:45:19.929Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/toolResultBudget.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`ToolResultBudgetConfig` is a TypeScript type that defines the configuration for limiting the aggregate size of [tool results](../concepts/tool-results.md) within a conversation history [Source 1]. This mechanism is crucial for preventing the [LLM](../concepts/llm.md)'s [Context Window](../concepts/context-window.md) from overflowing [when](./when.md) multiple [Tools](../subsystems/tools.md) return large amounts of data.

This configuration object is passed to the `applyToolResultBudget` function. When the total character count of all tool results exceeds the configured budget, the oldest results are replaced with a placeholder message. This preserves the record of which tools were called while freeing up significant space in the context [Source 1].

## Signature

The `ToolResultBudgetConfig` type is an object with the following optional properties [Source 1]:

```typescript
export type ToolResultBudgetConfig = {
  /**
   * Maximum total characters of tool result content.
   * Default: 500_000 (~125K tokens at 4 chars/token)
   */
  maxTotalChars?: number;

  /**
   * Number of most-recent tool results to always keep intact.
   * Default: 10
   */
  keepRecent?: number;

  /**
   * Placeholder text for budget-cleared results.
   * Default: '[Tool result cleared to save context — see tool call above for what was executed]'
   */
  clearedMessage?: string;

  /**
   * Set of tool names that are exempt from budget enforcement
   * (their results are always kept). Default: none.
   */
  exemptTools?: Set<string>;
};
```

## Examples

The following example demonstrates how to create a `ToolResultBudgetConfig` object and pass it to the `applyToolResultBudget` function to enforce a custom budget.

```typescript
import { applyToolResultBudget, ToolResultBudgetConfig } from 'yaaf';
import type { ChatMessage } from 'yaaf';

// Assume 'messages' is an array of ChatMessage objects from a conversation
const messages: ChatMessage[] = [
  // ... many messages, including several large tool results
];

// Define a custom budget configuration
const budgetConfig: ToolResultBudgetConfig = {
  // Set a lower total character limit for all tool results
  maxTotalChars: 100000,

  // Always keep the 5 most recent tool results, regardless of size
  keepRecent: 5,

  // Define a custom placeholder for cleared results
  clearedMessage: '[Result removed to conserve context space]',

  // Ensure results from a critical tool are never cleared
  exemptTools: new Set(['critical_data_fetcher']),
};

// Apply the budget to the message history
const { messages: budgetedMessages, cleared, charsFreed } = applyToolResultBudget(
  messages,
  budgetConfig
);

console.log(`Cleared ${cleared} tool results, freeing ~${charsFreed} characters.`);
// `budgetedMessages` can now be safely sent to the LLM
```

## See Also

- `applyToolResultBudget`: The function that consumes this configuration to enforce the budget on a message array.
- `ToolResultBudgetResult`: The type returned by `applyToolResultBudget`, detailing the outcome of the operation.

## Sources

[Source 1]: src/utils/toolResultBudget.ts