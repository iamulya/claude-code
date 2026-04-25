---
title: Tool Result Budget Management
entity_type: subsystem
summary: A subsystem responsible for managing and limiting the aggregate size of tool results within the agent's conversation context.
primary_files:
 - src/utils/toolResultBudget.ts
exports:
 - applyToolResultBudget
 - ToolResultBudgetConfig
 - ToolResultBudgetResult
search_terms:
 - context window management
 - prevent context blowout
 - limit tool output size
 - tool result truncation
 - managing large tool results
 - how to handle too much tool data
 - context size optimization
 - aggregate tool result limit
 - clearing old tool results
 - keep context small
 - tool result placeholder
 - exempt tools from budget
stub: false
compiled_at: 2026-04-24T18:20:46.715Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/utils/toolResultBudget.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Purpose

The [Tool Result Budget](../concepts/tool-result-budget.md) Management subsystem addresses the problem of "[Context Blowout](../concepts/context-blowout.md)," which can occur [when](../apis/when.md) multiple [Tools](./tools.md) return large amounts of data, potentially exceeding the [Context Window](../concepts/context-window.md) limits of the underlying [LLM](../concepts/llm.md) [Source 1]. It enforces a configurable, total-size cap on all tool result content within a conversation history. By managing the aggregate size of this content, it ensures that the conversation remains within operational limits without losing the record that specific tools were executed [Source 1].

## Architecture

The core of this subsystem is the `applyToolResultBudget` function, which operates on an array of `ChatMessage` objects. The process is non-mutating, returning a new array with the budget applied, and runs in O(n) time complexity [Source 1].

The architectural flow is as follows:
1.  The function scans the message history for all messages with the `role: 'tool'`.
2.  It calculates the total character count of the content within these tool messages.
3.  If the total size exceeds the configured `maxTotalChars` budget, the function begins to prune content.
4.  Pruning starts with the oldest [tool results](../concepts/tool-results.md) in the message history. The content of these messages is replaced with a standard placeholder text, such as `'[Tool result cleared to save context — see tool call above for what was executed]'` [Source 1].
5.  This replacement preserves the tool call structure in the context, allowing the LLM to know which tools were called, even if their results have been cleared [Source 1].
6.  The process respects two key exceptions: a configurable number of the most recent tool results (`keepRecent`) are always kept intact, and a set of specified tools (`exemptTools`) can be excluded from budget enforcement entirely [Source 1].

The function returns a `ToolResultBudgetResult` object containing the modified message array, the number of results cleared, and an estimate of the characters freed [Source 1].

## Integration Points

This subsystem is designed to be integrated into the agent's core processing loop, specifically during the context preparation phase before a request is sent to the LLM. By applying the budget to the message history, other subsystems like the agent runner can ensure the final payload sent to the model provider is of a valid size.

## Key APIs

-   **`applyToolResultBudget(messages, config)`**: The primary function that takes an array of `ChatMessage` objects and a `ToolResultBudgetConfig` object, and returns a `ToolResultBudgetResult` containing the pruned message list and statistics [Source 1].
-   **`ToolResultBudgetConfig`**: A type definition for the configuration object that controls the budgeting behavior [Source 1].
-   **`ToolResultBudgetResult`**: A type definition for the object returned by `applyToolResultBudget`, which includes the new message array and metadata about the operation [Source 1].

## Configuration

The behavior of the Tool Result [Budget Management](./budget-management.md) subsystem is controlled via the `ToolResultBudgetConfig` object. The available options are:

-   **`maxTotalChars`**: The maximum total number of characters allowed for all tool result content combined. The default is 500,000 [Source 1].
-   **`keepRecent`**: The number of the most recent tool results to always preserve, regardless of the total size. The default is 10 [Source 1].
-   **`clearedMessage`**: The placeholder text used to replace the content of a pruned tool result. The default is `'[Tool result cleared to save context — see tool call above for what was executed]'` [Source 1].
-   **`exemptTools`**: A `Set<string>` containing the names of tools whose results should never be pruned by the budget manager. By default, no tools are exempt [Source 1].

## Sources

[Source 1]: src/utils/toolResultBudget.ts