---
summary: Removes old, large, or redundant tool results from conversation history based on configurable age and size thresholds.
export_name: snipHistory
source_file: src/context/historySnip.ts
category: function
title: snipHistory
entity_type: api
stub: false
compiled_at: 2026-04-16T14:17:15.311Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/historySnip.ts
confidence: 1
---

## Overview
`snipHistory` is a utility function designed for cheap, pre-compaction optimization of conversation history. It identifies and removes or replaces low-value content—specifically old, large, or redundant tool results—to reduce context size before more expensive LLM-based compaction processes occur. 

The function performs an $O(n)$ pass without requiring LLM calls, making it a high-performance method for managing token limits. It targets tool results that are:
*   Beyond a specific age (turn count).
*   Larger than a defined token threshold.
*   Duplicate outputs (e.g., repeated file reads).
*   Empty or no-op results.

## Signature / Constructor

```typescript
export function snipHistory(
  messages: MessageLike[],
  config?: SnipConfig
): SnipResult;
```

### Supporting Types

#### SnipConfig
The configuration object controls the aggressiveness and criteria of the snipping process.

| Property | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `maxOldToolResults` | `number` | Max number of old tool results to keep. | `15` |
| `maxToolResultAge` | `number` | Tool results older than this many turns get snipped. | `20` |
| `placeholderText` | `string` | Text to replace snipped content with. | `"[Old tool result cleared]"` |
| `minSnipTokens` | `number` | Minimum token length for a result to be eligible for snipping. | `100` |
| `keepRecent` | `number` | Number of most recent tool results to leave untouched. | `5` |
| `exemptTools` | `string[]` | List of tool names that should never be snipped. | `[]` |

#### MessageLike
```typescript
export type MessageLike = {
  role: string;
  content: string;
  toolName?: string;
  toolCallId?: string;
};
```

#### SnipResult
```typescript
export type SnipResult = {
  snipped: MessageLike[];
  tokensFreed: number;
  itemsRemoved: number;
};
```

## Methods & Properties

### deduplicateToolResults
A secondary utility exported from the same module that removes consecutive identical tool results.

```typescript
export function deduplicateToolResults(
  messages: MessageLike[],
  placeholder = '[Duplicate result — see below]',
): SnipResult;
```
When a tool is called multiple times with the same output (such as repeated file system reads), this function keeps only the last occurrence and replaces earlier instances with the placeholder.

## Examples

### Basic Snipping
This example demonstrates how to use `snipHistory` to clean up a message history before processing.

```typescript
import { snipHistory } from './src/context/historySnip';

const messages = [
  // ... existing conversation messages
];

const result = snipHistory(messages, { 
  maxOldToolResults: 10, 
  maxToolResultAge: 20 
});

console.log(`Snipped ${result.itemsRemoved} items.`);
console.log(`Estimated tokens saved: ${result.tokensFreed}`);

// Use the cleaned messages for the next LLM call
const cleanedMessages = result.snipped;
```

### Deduplication
Removing redundant tool outputs to save context space.

```typescript
import { deduplicateToolResults } from './src/context/historySnip';

const result = deduplicateToolResults(messages);
// result.snipped contains the history with duplicates replaced by placeholders
```