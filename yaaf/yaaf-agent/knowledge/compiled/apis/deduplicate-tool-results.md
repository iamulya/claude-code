---
title: "`deduplicateToolResults`"
entity_type: api
summary: Deduplicates consecutive identical tool results in conversation history.
export_name: deduplicateToolResults
source_file: src/context/historySnip.ts
category: function
search_terms:
 - remove duplicate tool outputs
 - history optimization
 - context window management
 - pre-compaction
 - clean up conversation history
 - repeated tool calls
 - identical tool results
 - history snipping
 - reduce context size
 - how to handle repeated file reads
 - conversation history pre-processing
 - SnipResult
stub: false
compiled_at: 2026-04-24T17:00:56.706Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/historySnip.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `deduplicateToolResults` function is a history pre-processing utility that identifies and removes consecutive, identical [tool results](../concepts/tool-results.md) from an array of messages [Source 1]. [when](./when.md) a tool is called multiple times in a row and produces the exact same output (e.g., repeatedly reading the same file), this function keeps only the last occurrence and replaces the earlier ones with a placeholder string [Source 1].

This function is part of a broader set of "[History Snipping](../concepts/history-snipping.md)" optimizations. These are lightweight, inexpensive pre-passes designed to clean up conversation history and reduce token count before running more complex and costly compaction strategies [Source 1]. Using `deduplicateToolResults` can make subsequent processing, such as [LLM](../concepts/llm.md)-based [Context Compaction](../concepts/context-compaction.md), faster and more efficient by removing redundant information [Source 1].

## Signature

The function takes an array of messages and an optional placeholder string, and returns a `SnipResult` object.

```typescript
export function deduplicateToolResults(
  messages: MessageLike[],
  placeholder = "[Duplicate result — see below]",
): SnipResult;
```

### Parameters

-   **`messages`** `MessageLike[]`: An array of message-like objects representing the conversation history.
-   **`placeholder`** `string` (optional): The text to replace the content of the removed duplicate tool results. Defaults to `"[Duplicate result — see below]"`.

### Return Value

The function returns a `SnipResult` object with the following properties:

-   **`snipped`** `MessageLike[]`: The new array of messages with duplicate tool results replaced.
-   **`tokensFreed`** `number`: An estimation of the number of tokens saved by removing the duplicate content.
-   **`itemsRemoved`** `number`: The total number of message items that were replaced.

### Supporting Types

```typescript
// A generic representation of a message in the conversation history.
export type MessageLike = {
  role: string;
  content: string;
  toolName?: string;
  toolCallId?: string;
};

// The result object returned by history snipping functions.
export type SnipResult = {
  /** Messages with old content snipped. */
  snipped: MessageLike[];
  /** Estimated tokens freed by snipping. */
  tokensFreed: number;
  /** Number of tool results snipped. */
  itemsRemoved: number;
};
```

## Examples

The following example demonstrates how to use `deduplicateToolResults` to clean up a message history containing two identical, consecutive results from a `readFile` tool.

```typescript
import { deduplicateToolResults } from 'yaaf';
import type { MessageLike } from 'yaaf';

const fileContent = 'const x = 1;';

const messages: MessageLike[] = [
  { role: 'user', content: 'What is in file.ts?' },
  { role: 'tool', toolName: 'readFile', content: fileContent },
  { role: 'user', content: 'Are you sure? Read it again.' },
  { role: 'tool', toolName: 'readFile', content: fileContent },
  { role: 'assistant', content: 'Yes, the content is definitely "const x = 1;".' }
];

const { snipped, tokensFreed, itemsRemoved } = deduplicateToolResults(messages);

console.log('Snipped Messages:', snipped);
/*
Snipped Messages: [
  { role: 'user', content: 'What is in file.ts?' },
  {
    role: 'tool',
    toolName: 'readFile',
    content: '[Duplicate result — see below]'
  },
  { role: 'user', content: 'Are you sure? Read it again.' },
  { role: 'tool', toolName: 'readFile', content: 'const x = 1;' },
  {
    role: 'assistant',
    content: 'Yes, the content is definitely "const x = 1;".'
  }
]
*/

console.log(`Items removed: ${itemsRemoved}`);
// Output: Items removed: 1

console.log(`Tokens freed: ${tokensFreed}`);
// Output: Tokens freed: 4 (based on an example estimation)
```

## See Also

-   `snipHistory`: A related function for removing old and large tool results from conversation history, often used as another pre-compaction step.

## Sources

[Source 1]: src/context/historySnip.ts