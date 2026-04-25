---
title: Tool Result Budget
entity_type: concept
summary: A mechanism for aggregate size limiting of tool results within the agent's context to prevent context blowout.
search_terms:
 - limit tool output size
 - prevent context window overflow
 - manage large tool results
 - context blowout
 - aggregate tool result size
 - how to handle many tool calls
 - tool result placeholder
 - context size management
 - YAAF tool budget
 - clearing old tool results
 - exempt tools from budget
 - keep recent tool results
stub: false
compiled_at: 2026-04-24T18:04:29.326Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/toolResultBudget.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is
The Tool Result Budget is a mechanism in YAAF that enforces a total size cap on the content returned by [Tools](../subsystems/tools.md) within an agent's conversation history [Source 1]. Its primary purpose is to prevent "[Context Blowout](./context-blowout.md)," a condition where numerous or verbose [tool results](./tool-results.md) consume the [LLM](./llm.md)'s entire [Context Window](./context-window.md), leading to errors or degraded performance. By managing the aggregate size of tool outputs, this mechanism ensures that the agent can continue to function reliably even [when](../apis/when.md) its tools produce large amounts of data [Source 1].

## How It Works in YAAF
The core logic is implemented in the `applyToolResultBudget` utility function. This function operates on an array of chat messages and does not mutate the original array [Source 1].

The process is as follows:
1. The function scans the message history for all messages with `role: 'tool'`.
2. It measures the total character count of the content from all identified tool result messages.
3. If this total exceeds the configured budget, the function begins replacing the content of the oldest tool results with a placeholder message.
4. This process continues, clearing older results one by one, until the total size is within the budget.
5. The tool call structure is preserved, so the LLM is aware that a tool was executed, but the large result content is removed to save space [Source 1].

The mechanism includes options to always keep a specified number of the most recent tool results intact and to exempt specific tools from budget enforcement entirely [Source 1]. The operation runs in O(n) time complexity relative to the number of messages [Source 1].

## Configuration
The behavior of the Tool Result Budget is controlled via the `ToolResultBudgetConfig` object. A developer can customize the following parameters [Source 1]:

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
   * Set of tool names that are exempt from budget enforcement
   * (their results are always kept). Default: none.
   */
  exemptTools?: Set<string>;
};
```

- **`maxTotalChars`**: The maximum combined character count allowed for all tool results in the context.
- **`keepRecent`**: Guarantees that the specified number of most recent tool results will not be cleared, regardless of the budget.
- **`clearedMessage`**: The string used to replace the content of a tool result that has been cleared by the budget.
- **`exemptTools`**: A `Set` of tool names whose results will never be cleared by the budget mechanism.

## Sources
[Source 1]: src/utils/toolResultBudget.ts