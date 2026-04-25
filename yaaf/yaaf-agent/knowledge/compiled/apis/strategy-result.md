---
summary: Defines the structure of the result returned by a compaction strategy, including new messages, summary, and statistics.
export_name: StrategyResult
source_file: src/context/strategies.ts
category: type
title: StrategyResult
entity_type: api
search_terms:
 - compaction strategy return value
 - what does a compaction strategy output
 - context compaction result
 - message history after compaction
 - tokens freed by compaction
 - extracted facts from context
 - partial compaction result
 - compaction metadata
 - CompactionStrategy compact method return
 - new message array from strategy
 - compaction statistics
 - isPartial compaction flag
stub: false
compiled_at: 2026-04-24T17:40:51.466Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/strategies.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `StrategyResult` type defines the object that a `CompactionStrategy` must return from its `compact` method [Source 1]. This object contains the result of a [Context Compaction](../concepts/context-compaction.md) operation, including the new, smaller array of messages that should replace the previous history. It also includes metadata about the operation, such as a human-readable summary, the number of messages removed, and the estimated number of tokens freed [Source 1].

This structure is used by the `ContextManager` to update its internal state after a compaction is triggered and successfully executed by a strategy.

## Signature

The `StrategyResult` type is an object with the following properties [Source 1]:

```typescript
export type StrategyResult = {
  /** New messages to replace the current history */
  messages: Message[];
  /** Human-readable summary of what was done */
  summary: string;
  /** Number of messages removed */
  messagesRemoved: number;
  /** Estimated tokens freed */
  tokensFreed: number;
  /** Facts extracted during compaction (for memory persistence) */
  extractedFacts?: string[];
  /** Whether the strategy considers this a partial compaction (micro-compact) */
  isPartial?: boolean;
  /** Additional metadata specific to the strategy */
  metadata?: Record<string, unknown>;
};
```

### Properties

| Property           | Type                     | Description                                                                                                                            |
| ------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `messages`         | `Message[]`              | The new array of messages that replaces the previous conversation history [Source 1].                                                  |
| `summary`          | `string`                 | A human-readable description of the compaction operation that was performed [Source 1].                                                |
| `messagesRemoved`  | `number`                 | The total number of messages that were removed from the history during this compaction [Source 1].                                     |
| `tokensFreed`      | `number`                 | An estimation of the number of tokens saved by the compaction operation [Source 1].                                                    |
| `extractedFacts`   | `string[]` (optional)    | An array of strings representing key facts or memories extracted from the removed messages, intended for persistence [Source 1].       |
| `isPartial`        | `boolean` (optional)     | If `true`, indicates that the compaction was a "micro-compaction" and not a full summarization. Used by `CompositeStrategy` [Source 1]. |
| `metadata`         | `Record<string, unknown>` (optional) | An open-ended object for strategy-specific metadata that may be useful for logging or debugging [Source 1].                  |

## Examples

A custom `CompactionStrategy` implementation would construct and return a `StrategyResult` object from its `compact` method.

```typescript
import type { CompactionStrategy, CompactionContext, StrategyResult, Message } from 'yaaf';

class MyCustomTruncateStrategy implements CompactionStrategy {
  readonly name = 'custom-truncate';

  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    const originalMessageCount = ctx.messages.length;
    const originalTokens = ctx.totalTokens;

    if (originalMessageCount < 10) {
      // Not enough messages to compact, do nothing.
      return null;
    }

    // Keep only the 5 most recent messages.
    const newMessages: Message[] = [...ctx.messages.slice(-5)];

    const newTokens = newMessages.reduce(
      (sum, msg) => sum + ctx.estimateTokens(msg.content || ''),
      0
    );

    const messagesRemoved = originalMessageCount - newMessages.length;
    const tokensFreed = originalTokens - newTokens;

    // Construct the result object
    const result: StrategyResult = {
      messages: newMessages,
      summary: `Truncated history, keeping the last 5 of ${originalMessageCount} messages.`,
      messagesRemoved,
      tokensFreed,
      isPartial: false,
      metadata: {
        originalCount: originalMessageCount,
        newCount: newMessages.length,
      },
    };

    return result;
  }
}
```

## See Also

- `CompactionStrategy`: The interface that defines a compaction strategy, whose `compact` method returns a `StrategyResult`.
- `CompactionContext`: The object passed to a `CompactionStrategy`, providing the context needed to perform compaction.

## Sources

[Source 1]: src/context/strategies.ts