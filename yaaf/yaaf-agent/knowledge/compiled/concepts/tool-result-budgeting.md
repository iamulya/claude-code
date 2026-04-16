---
summary: A mechanism to prevent context window overflow by enforcing a total size limit on tool execution results within a conversation.
title: Tool Result Budgeting
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:40:30.579Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/toolResultBudget.ts
confidence: 0.95
---

---
title: Tool Result Budgeting
entity_type: concept
summary: A mechanism to prevent context window overflow by enforcing a total size limit on tool execution results within a conversation.
related_subsystems:
  - agents
  - utils

## What It Is
Tool Result Budgeting is a resource management pattern in YAAF designed to prevent "context blowout." In LLM-powered applications, tools may return large volumes of data (e.g., file contents, database exports, or API responses) that can quickly exhaust the model's context window or increase latency and costs.

This mechanism enforces an aggregate size limit on the content of tool results within a conversation history. Unlike simple message truncation, Tool Result Budgeting specifically targets `tool` role messages. It preserves the structural integrity of the conversation by keeping the original tool call metadata intact while replacing the heavy result content with lightweight placeholders. This ensures the LLM remains aware that a tool was executed and which tool it was, even if the specific output has been purged to save space.

## How It Works in YAAF
The framework implements this concept through the `applyToolResultBudget` function located in the `utils/toolResultBudget` module. 

The process follows these steps:
1. **Scanning**: The function performs an $O(n)$ scan of the `ChatMessage` array to identify messages with the `role: 'tool'`.
2. **Measurement**: It calculates the total character count of all tool result content.
3. **Prioritization**: The mechanism identifies which results to keep based on recency and exemption status. It always protects a configurable number of the most recent tool results.
4. **Replacement**: If the total character count exceeds the defined budget, the oldest non-exempt tool results are replaced with a placeholder message.
5. **Output**: The function returns a `ToolResultBudgetResult` object, which contains the new array of messages (the original array is not mutated), the number of results cleared, and an estimate of the total characters freed.

## Configuration
Developers configure the budgeting behavior using the `ToolResultBudgetConfig` object. This can be applied during agent execution or within custom message processing pipelines.

```typescript
import { applyToolResultBudget, ToolResultBudgetConfig } from './utils/toolResultBudget';

const config: ToolResultBudgetConfig = {
  /** Maximum total characters allowed across all tool results (default: 500,000) */
  maxTotalChars: 100000,
  
  /** Number of most-recent tool results to always keep (default: 10) */
  keepRecent: 5,
  
  /** Custom message to show when a result is cleared */
  clearedMessage: '[Result removed to optimize context window]',
  
  /** Tools that should never have their results cleared */
  exemptTools: new Set(['critical_system_check', 'user_identity_verify'])
};

const result = applyToolResultBudget(messages, config);
console.log(`Freed ${result.charsFreed} characters by clearing ${result.cleared} results.`);
```

### Default Values
If no configuration is provided, YAAF uses the following defaults:
* **maxTotalChars**: 500,000 (approximately 125,000 tokens at a 4:1 character-to-token ratio).
* **keepRecent**: 10 results.
* **clearedMessage**: `[Tool result cleared to save context — see tool call above for what was executed]`.
* **exemptTools**: None.

## Sources
* `src/utils/toolResultBudget.ts`