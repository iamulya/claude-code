---
title: "`snipHistory`"
entity_type: api
summary: Snips old, large tool results from conversation history to reduce context size.
export_name: snipHistory
source_file: src/context/historySnip.ts
category: function
search_terms:
 - reduce context size
 - history compaction
 - pre-compaction optimization
 - remove old tool results
 - clean conversation history
 - token saving
 - context window management
 - cheap history optimization
 - microCompact
 - prune agent memory
 - how to snip history
 - large tool output removal
stub: false
compiled_at: 2026-04-24T17:38:40.499Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/historySnip.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview
`snipHistory` is a pre-compaction optimization function that removes known low-value content from a conversation history before a more expensive, [LLM](../concepts/llm.md)-based compaction process runs [Source 1]. Its purpose is to make the main compaction step cheaper and faster by removing obvious noise first [Source 1].

This function performs a cheap, O(n) pass over the message history without any LLM calls. It identifies and replaces specific [tool results](../concepts/tool-results.md) with a placeholder string. The criteria for snipping a tool result are [Source 1]:
1. It is old (beyond `maxToolResultAge` turns from the end of the history).
2. It is large (over `minSnipTokens` estimated tokens).
3. Its tool name is not in the `exemptTools` list.
4. It is not one of the most recent tool results (as defined by `keepRecent`).

This process can dramatically reduce the context size sent to the main compaction agent [Source 1]. Other content that may be snipped includes duplicate file reads and empty or no-op tool results [Source 1].

## Signature
The function takes an array of messages and an optional configuration object, and returns an object containing the snipped messages and statistics about the operation [Source 1].

```typescript
export function snipHistory(
  messages: MessageLike[], 
  config?: SnipConfig
): SnipResult;
```

### `MessageLike` Type
A simplified representation of a message in the conversation history.

```typescript
export type MessageLike = {
  role: string;
  content: string;
  toolName?: string;
  toolCallId?: string;
};
```

### `SnipConfig` Type
Configuration options for the snipping process.

```typescript
export type SnipConfig = {
  /** Max number of old tool results to keep. Default: 15. */
  maxOldToolResults?: number;
  /** Tool results older than this many turns get snipped. Default: 20. */
  maxToolResultAge?: number;
  /** Replace snipped content with this placeholder. Default: "[Old tool result cleared]". */
  placeholderText?: string;
  /** Minimum token length of a tool result to be eligible for snipping. Default: 100. */
  minSnipTokens?: number;
  /** Keep the most recent N tool results untouched. Default: 5. */
  keepRecent?: number;
  /** Tool names whose results are never snipped. */
  exemptTools?: string[];
};
```

### `SnipResult` Type
The return value of the `snipHistory` function.

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

## Examples
The following example demonstrates how to use `snipHistory` to clean a message list.

```typescript
import { snipHistory, MessageLike } from 'yaaf';

const messages: MessageLike[] = [
  // ... a long history of messages and tool calls
];

const result = snipHistory(messages, { 
  maxOldToolResults: 10, 
  maxToolResultAge: 20 
});

// result.snipped contains the cleaned messages
console.log(`Snipped ${result.itemsRemoved} items, freeing ~${result.tokensFreed} tokens.`);

// result.tokensFreed shows the estimated tokens saved
// result.itemsRemoved is the count of removed items
```

## Sources
[Source 1]: src/context/historySnip.ts