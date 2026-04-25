---
title: "`SnipResult`"
entity_type: api
summary: The result object returned by history snipping functions, including snipped messages and estimated token savings.
export_name: SnipResult
source_file: src/context/historySnip.ts
category: type
search_terms:
 - history snipping result
 - context window optimization
 - token savings from snipping
 - message history cleaning
 - pre-compaction output
 - deduplicate tool results output
 - snipHistory return type
 - what does snipHistory return
 - snipped messages array
 - tokens freed by optimization
 - items removed from history
 - conversation pruning result
stub: false
compiled_at: 2026-04-24T17:38:37.381Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/historySnip.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`SnipResult` is a TypeScript type that represents the outcome of a [History Snipping](../concepts/history-snipping.md) operation [Source 1]. Functions like `snipHistory` and `deduplicateToolResults` return an object of this type after they process a message history.

This object contains three key pieces of information:
1.  The modified array of messages after snipping.
2.  An estimate of the number of tokens saved by the operation.
3.  A count of the number of items (e.g., [tool results](../concepts/tool-results.md)) that were removed or replaced.

It provides a structured way to receive the cleaned message history and metrics about the effectiveness of the snipping pre-pass optimization [Source 1].

## Signature

`SnipResult` is a type alias for an object with the following properties [Source 1]:

```typescript
export type SnipResult = {
  /** Messages with old content snipped. */
  snipped: MessageLike[];

  /** Estimated tokens freed by snipping. */
  tokensFreed: number;

  /** Number of tool results snipped. */
  itemsRemoved: number;
};
```

### Properties

| Property       | Type             | Description                                                              |
| -------------- | ---------------- | ------------------------------------------------------------------------ |
| `snipped`      | `MessageLike[]`  | The new array of messages after old or duplicate content has been removed. |
| `tokensFreed`  | `number`         | An estimated count of the tokens saved by the snipping operation.        |
| `itemsRemoved` | `number`         | The total number of individual messages that were snipped or replaced.   |

## Examples

### Basic Usage with `snipHistory`

The following example demonstrates calling `snipHistory` and accessing the properties of the returned `SnipResult` object.

```typescript
import { snipHistory, SnipResult, MessageLike } from 'yaaf';

const messages: MessageLike[] = [
  // ... a long history of messages and tool results
];

// Snip old tool results from the history
const result: SnipResult = snipHistory(messages, { maxToolResultAge: 10 });

// The cleaned message history is now in result.snipped
const cleanedHistory = result.snipped;

// Log the impact of the snipping operation
console.log(`Snipping removed ${result.itemsRemoved} items.`);
console.log(`Estimated tokens saved: ${result.tokensFreed}`);
```

### Usage with `deduplicateToolResults`

The `deduplicateToolResults` function also returns a `SnipResult` object.

```typescript
import { deduplicateToolResults, SnipResult, MessageLike } from 'yaaf';

const messagesWithDuplicates: MessageLike[] = [
  { role: 'tool', content: '{"status": "ok"}', toolName: 'checkStatus' },
  { role: 'assistant', content: 'Status is ok.' },
  { role: 'tool', content: '{"status": "ok"}', toolName: 'checkStatus' }, // Duplicate
  { role: 'assistant', content: 'Status is still ok.' },
];

const result: SnipResult = deduplicateToolResults(messagesWithDuplicates);

// result.snipped will have the first tool call's content replaced
// result.itemsRemoved will be 1
// result.tokensFreed will be the estimated size of the replaced content

console.log(`Deduplication removed ${result.itemsRemoved} item(s).`);
```

## See Also

- `snipHistory`: A function that removes old and large tool results from history.
- `deduplicateToolResults`: A function that removes consecutive identical tool results.

## Sources

[Source 1] `src/context/historySnip.ts`