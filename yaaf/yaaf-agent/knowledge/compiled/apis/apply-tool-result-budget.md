---
export_name: applyToolResultBudget
source_file: src/utils/toolResultBudget.ts
category: function
summary: A utility function that applies aggregate size limits to tool results within an array of chat messages.
title: applyToolResultBudget
entity_type: api
stub: false
compiled_at: 2026-04-16T14:40:34.808Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/toolResultBudget.ts
confidence: 0.98
---

## Overview
`applyToolResultBudget` is a utility function designed to prevent context window exhaustion (context blowout) in LLM conversations. It enforces an aggregate size limit on the content of tool results within a message history. 

When the total character count of tool results exceeds a defined threshold, the function replaces the content of older tool results with a placeholder message. This process preserves the original tool call structure—allowing the LLM to remain aware of which tools were executed—while significantly reducing the token footprint of the conversation. The function operates in $O(n)$ time and returns a new array of messages without mutating the original input.

## Signature / Constructor

```typescript
export function applyToolResultBudget(
  messages: ChatMessage[],
  config?: ToolResultBudgetConfig
): ToolResultBudgetResult
```

### ToolResultBudgetConfig
The configuration object controls the aggressiveness and behavior of the budget enforcement.

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `maxTotalChars` | `number` | `500_000` | The maximum aggregate characters allowed for all tool results. |
| `keepRecent` | `number` | `10` | The number of most-recent tool results to always keep intact, regardless of size. |
| `clearedMessage` | `string` | (See below) | The placeholder text used for cleared results. |
| `exemptTools` | `Set<string>` | `none` | A set of tool names whose results are never cleared. |

**Default Cleared Message:**
`'[Tool result cleared to save context — see tool call above for what was executed]'`

### ToolResultBudgetResult
The function returns an object containing the processed messages and metadata about the operation.

| Property | Type | Description |
| :--- | :--- | :--- |
| `messages` | `ChatMessage[]` | The new array of messages with the budget applied. |
| `cleared` | `number` | The total number of tool results that were replaced with placeholders. |
| `charsFreed` | `number` | The estimated number of characters removed from the conversation. |

## Examples

### Basic Usage
Applying the default budget to a conversation history.

```typescript
import { applyToolResultBudget } from 'yaaf/utils/toolResultBudget';

const history = [
  { role: 'user', content: 'Analyze these logs.' },
  { role: 'assistant', tool_calls: [{ id: 'call_1', name: 'read_logs', ... }] },
  { role: 'tool', tool_call_id: 'call_1', content: '...very large log content...' }
];

const { messages, cleared, charsFreed } = applyToolResultBudget(history, {
  maxTotalChars: 1000,
  keepRecent: 1
});

if (cleared > 0) {
  console.log(`Freed ${charsFreed} characters by clearing ${cleared} results.`);
}
```

### Exempting Specific Tools
Ensuring that critical tool outputs (like status checks) are never cleared.

```typescript
const config = {
  maxTotalChars: 50000,
  exemptTools: new Set(['get_system_status', 'check_auth'])
};

const result = applyToolResultBudget(messages, config);
```

## See Also
* `ChatMessage` (type)