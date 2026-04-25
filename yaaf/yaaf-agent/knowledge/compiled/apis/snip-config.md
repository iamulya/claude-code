---
title: "`SnipConfig`"
entity_type: api
summary: Configuration options for the history snipping process.
export_name: SnipConfig
source_file: src/context/historySnip.ts
category: type
search_terms:
 - history snipping configuration
 - context window optimization
 - pre-compaction settings
 - snipHistory options
 - remove old tool results
 - message history cleanup
 - token reduction settings
 - maxOldToolResults
 - maxToolResultAge
 - exempt tools from snipping
 - context management parameters
 - placeholder for snipped content
stub: false
compiled_at: 2026-04-24T17:38:34.975Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/historySnip.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`SnipConfig` is a type alias that defines the configuration object for the `snipHistory` function. This object allows developers to customize the behavior of the [History Snipping](../concepts/history-snipping.md) process, which is a lightweight, pre-compaction optimization pass [Source 1].

History snipping is designed to remove known low-value content from a message history before running a more expensive, [LLM](../concepts/llm.md)-based compaction process. By removing obvious noise like old, large, or duplicate [tool results](../concepts/tool-results.md) first, the subsequent compaction becomes cheaper and faster. The `SnipConfig` type provides granular control over which tool results are considered eligible for removal based on their age, size, recency, and originating tool [Source 1].

## Signature

`SnipConfig` is a TypeScript type alias with the following properties:

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

### Properties

| Property            | Type       | Description                                                                    | Default Value                    |
| ------------------- | ---------- | ------------------------------------------------------------------------------ | -------------------------------- |
| `maxOldToolResults` | `number?`  | The maximum number of old tool results to retain in the history.               | `15`                             |
| `maxToolResultAge`  | `number?`  | Tool results older than this many turns from the end of the history are snipped. | `20`                             |
| `placeholderText`   | `string?`  | The text used to replace the content of a snipped tool result.                 | `"[Old tool result cleared]"`    |
| `minSnipTokens`     | `number?`  | The minimum token length a tool result must have to be eligible for snipping.  | `100`                            |
| `keepRecent`        | `number?`  | The number of most recent tool results to always keep, regardless of other rules. | `5`                              |
| `exemptTools`       | `string[]?`| A list of tool names whose results should never be snipped.                    | `undefined`                      |

## Examples

The following example demonstrates how to create a `SnipConfig` object and pass it to the `snipHistory` function to customize the snipping behavior.

```typescript
import { snipHistory, SnipConfig, MessageLike } from 'yaaf';

// Assume 'messages' is an array of MessageLike objects from a conversation
const messages: MessageLike[] = [
  // ... a long conversation history with many tool calls
];

// Define a custom configuration for the snipping process
const customSnipConfig: SnipConfig = {
  // Keep tool results that are no more than 10 turns old
  maxToolResultAge: 10,
  // Only snip tool results that are larger than 500 tokens
  minSnipTokens: 500,
  // Always preserve the 3 most recent tool results
  keepRecent: 3,
  // Never snip results from the 'core_memory' or 'file_system' tools
  exemptTools: ['core_memory', 'file_system'],
  // Use a custom placeholder for removed content
  placeholderText: '[...content removed for brevity...]',
};

// Apply the snipping process with the custom configuration
const result = snipHistory(messages, customSnipConfig);

console.log(`Snipped ${result.itemsRemoved} items, freeing ~${result.tokensFreed} tokens.`);
// result.snipped now contains the message history with old tool results replaced.
```

## See Also

*   `snipHistory`: The function that consumes the `SnipConfig` object to perform history snipping.

## Sources

[Source 1]: src/context/historySnip.ts