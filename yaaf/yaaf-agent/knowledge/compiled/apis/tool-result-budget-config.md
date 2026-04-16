---
export_name: ToolResultBudgetConfig
source_file: src/utils/toolResultBudget.ts
category: type
summary: Configuration interface for defining tool result size limits, retention policies, and exempt tools.
title: ToolResultBudgetConfig
entity_type: api
stub: false
compiled_at: 2026-04-16T14:40:35.103Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/utils/toolResultBudget.ts
confidence: 0.98
---

## Overview
`ToolResultBudgetConfig` is a configuration interface used to manage the aggregate size of tool outputs within a conversation history. It is primarily utilized by the `applyToolResultBudget` utility to prevent "context blowout"—a condition where large tool results consume the LLM's available context window.

When the total character count of tool results exceeds the defined budget, the framework replaces older results with a placeholder message. This process preserves the original tool call structure so the LLM remains aware that a tool was executed, even if the specific output has been evicted from the immediate context.

## Signature / Constructor

```typescript
export type ToolResultBudgetConfig = {
  maxTotalChars?: number
  keepRecent?: number
  clearedMessage?: string
  exemptTools?: Set<string>
}
```

## Methods & Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `maxTotalChars` | `number` | The maximum total characters allowed for all tool result content combined. Defaults to `500,000` (approximately 125,000 tokens). |
| `keepRecent` | `number` | The number of most-recent tool results to always keep intact, regardless of the total character count. Defaults to `10`. |
| `clearedMessage` | `string` | The placeholder text inserted when a tool result is removed to save space. Defaults to `'[Tool result cleared to save context — see tool call above for what was executed]'`. |
| `exemptTools` | `Set<string>` | A set of tool names that are exempt from budget enforcement. Results from these tools are never cleared. Defaults to an empty set. |

## Examples

### Basic Configuration
Defining a strict budget for an agent with limited context window.

```typescript
import { ToolResultBudgetConfig } from 'yaaf';

const strictBudget: ToolResultBudgetConfig = {
  maxTotalChars: 50000, // Limit to ~12.5k tokens
  keepRecent: 3,        // Only guarantee the last 3 tool outputs
  clearedMessage: "Result removed for brevity."
};
```

### Exempting Specific Tools
Ensuring that critical data-gathering tools are never truncated.

```typescript
const config: ToolResultBudgetConfig = {
  maxTotalChars: 100000,
  exemptTools: new Set(['get_user_identity', 'get_system_status'])
};
```

## See Also
* `applyToolResultBudget` (function)
* `ToolResultBudgetResult` (type)