---
title: applyToolResultBudget
entity_type: api
summary: Applies an aggregate tool result budget to a message array, replacing older results with placeholders when the budget is exceeded.
export_name: applyToolResultBudget
source_file: src/utils/toolResultBudget.ts
category: function
search_terms:
 - limit tool output size
 - context window management
 - prevent context blowout
 - tool result truncation
 - aggregate tool result size
 - how to manage large tool results
 - pruning conversation history
 - tool result placeholder
 - maxTotalChars
 - keepRecent tool results
 - exemptTools from budget
 - conversation summarization
 - token limit for tools
stub: false
compiled_at: 2026-04-24T16:48:48.676Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/toolResultBudget.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `applyToolResultBudget` function is a utility for managing the total size of [tool results](../concepts/tool-results.md) within a conversation history. Its primary purpose is to prevent the [Context Window](../concepts/context-window.md) from becoming excessively large ("[Context Blowout](../concepts/context-blowout.md)") [when](./when.md) multiple [Tools](../subsystems/tools.md) return large amounts of data [Source 1].

When the total character count of all tool result messages exceeds a configured budget, this function identifies the oldest tool results and replaces their content with a placeholder message. This process preserves the tool call structure, ensuring the [LLM](../concepts/llm.md) is aware that a tool was executed, even if its specific output has been cleared to save space. The function always keeps a configurable number of the most recent tool results intact, regardless of the budget [Source 1].

This operation is non-mutating; it returns a new array of messages rather than modifying the input array. The algorithm runs in O(n) time complexity [Source 1].

## Signature

The function takes an array of `ChatMessage` objects and an optional configuration object, and it returns an object containing the modified message array and statistics about the operation [Source 1].

```typescript
export function applyToolResultBudget(
  messages: ChatMessage[],
  config?: ToolResultBudgetConfig
): ToolResultBudgetResult;
```

### `ToolResultBudgetConfig`

This type defines the configuration options for the budgeting logic [Source 1].

```typescript
export type ToolResultBudgetConfig = {
  /**
   * Maximum total characters of tool result content.
   * Default: 500_000
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
   * A set of tool names that are exempt from budget enforcement.
   * Their results are always kept.
   * Default: undefined (no exemptions)
   */
  exemptTools?: Set<string>;
};
```

### `ToolResultBudgetResult`

This type describes the object returned by the function [Source 1].

```typescript
export type ToolResultBudgetResult = {
  /** The messages with the budget applied. */
  messages: ChatMessage[];
  /** The number of tool results that were cleared. */
  cleared: number;
  /** An estimate of the number of characters freed by clearing results. */
  charsFreed: number;
};
```

## Examples

### Basic Usage

The following example demonstrates applying a strict budget to a message history, causing the oldest tool result to be replaced with a placeholder.

```typescript
import { applyToolResultBudget } from 'yaaf';
import type { ChatMessage } from 'yaaf';

const messages: ChatMessage[] = [
  {
    role: 'assistant',
    content: null,
    tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '{"city": "London"}' } }],
  },
  {
    role: 'tool',
    tool_call_id: 'call_1',
    name: 'get_weather',
    content: 'The weather in London is sunny with a high of 20°C. It is a very long description that takes up a lot of space.', // 115 chars
  },
  {
    role: 'assistant',
    content: null,
    tool_calls: [{ id: 'call_2', type: 'function', function: { name: 'get_stock_price', arguments: '{"ticker": "ACME"}' } }],
  },
  {
    role: 'tool',
    tool_call_id: 'call_2',
    name: 'get_stock_price',
    content: 'The stock price for ACME is $150. This is also a very long description designed to exceed the budget.', // 103 chars
  },
];

// Apply a budget of 150 characters, keeping only the most recent result.
const { messages: budgetedMessages, cleared, charsFreed } = applyToolResultBudget(messages, {
  maxTotalChars: 150,
  keepRecent: 1,
});

console.log(budgetedMessages);
/*
[
  {
    role: 'assistant',
    content: null,
    tool_calls: [ { id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '{"city": "London"}' } } ]
  },
  {
    role: 'tool',
    tool_call_id: 'call_1',
    name: 'get_weather',
    content: '[Tool result cleared to save context — see tool call above for what was executed]'
  },
  {
    role: 'assistant',
    content: null,
    tool_calls: [ { id: 'call_2', type: 'function', function: { name: 'get_stock_price', arguments: '{"ticker": "ACME"}' } } ]
  },
  {
    role: 'tool',
    tool_call_id: 'call_2',
    name: 'get_stock_price',
    content: 'The stock price for ACME is $150. This is also a very long description designed to exceed the budget.'
  }
]
*/

console.log(`Cleared: ${cleared}, Chars Freed: ${charsFreed}`);
// Cleared: 1, Chars Freed: 115
```

## Sources

[Source 1]: src/utils/toolResultBudget.ts