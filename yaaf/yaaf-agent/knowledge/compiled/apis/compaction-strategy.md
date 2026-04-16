---
summary: The core interface that all context compaction strategies must implement to be used by the ContextManager.
export_name: CompactionStrategy
source_file: src/context/strategies.ts
category: interface
title: CompactionStrategy
entity_type: api
stub: false
compiled_at: 2026-04-16T14:17:29.882Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/strategies.ts
confidence: 1
---

## Overview
`CompactionStrategy` is the base interface for the YAAF context management system's pluggable architecture. It defines the contract for reducing the token footprint of an agent's conversation history when it approaches the model's context limit.

Strategies are designed to be stateless; they receive a `CompactionContext` containing the current state of the conversation and return a `StrategyResult` containing the modified message history. This interface allows for various approaches to context management, including simple truncation, LLM-powered summarization, and complex multi-tier pipelines.

## Signature / Constructor

```typescript
export interface CompactionStrategy {
  /** Unique name for logging and debugging */
  readonly name: string

  /**
   * Check if this strategy can handle the current context.
   * Used by CompositeStrategy to skip strategies that aren't applicable.
   * Default: always applicable.
   */
  canApply?(ctx: CompactionContext): boolean | Promise<boolean>

  /**
   * Execute the compaction strategy.
   * Returns the new message array and stats, or null if the strategy
   * decided not to compact (e.g., nothing to clear).
   */
  compact(ctx: CompactionContext): Promise<StrategyResult | null>
}
```

### Supporting Types

#### CompactionContext
The context object passed to the `compact` method, providing necessary data and utilities without exposing the full internal state of the manager.

| Property | Type | Description |
| :--- | :--- | :--- |
| `messages` | `readonly Message[]` | Current messages in the conversation history. |
| `totalTokens` | `number` | Estimated total tokens across all messages and sections. |
| `effectiveLimit` | `number` | The model's effective context limit (window minus output and sections). |
| `autoCompactThreshold` | `number` | The token threshold that triggered this compaction. |
| `compactionCount` | `number` | Number of previous compactions performed in this session. |
| `summarize` | `Function` | Optional utility to call the LLM for summarization. |
| `estimateTokens` | `Function` | Utility to estimate token count for a given string. |
| `signal` | `AbortSignal` | Optional signal for cancellation. |

#### StrategyResult
The object returned by a strategy after successful execution.

| Property | Type | Description |
| :--- | :--- | :--- |
| `messages` | `Message[]` | The new message array to replace the current history. |
| `summary` | `string` | A human-readable description of the compaction performed. |
| `messagesRemoved` | `number` | The count of messages removed from history. |
| `tokensFreed` | `number` | The estimated number of tokens removed. |
| `extractedFacts` | `string[]` | Optional facts extracted for memory persistence. |
| `isPartial` | `boolean` | Whether this was a partial compaction (e.g., micro-compaction). |
| `metadata` | `Record<string, any>` | Strategy-specific metadata. |

## Methods & Properties

### name
A readonly string property that provides a unique identifier for the strategy. This is primarily used for logging, debugging, and identifying the strategy within a pipeline.

### canApply(ctx)
An optional method that returns a boolean (or a Promise resolving to one) indicating if the strategy is suitable for the current context. This is frequently used in composite strategies to skip specialized logic (like time-based compaction) when conditions are not met.

### compact(ctx)
The primary execution method. It takes the current `CompactionContext` and returns a `StrategyResult` containing the new message list. If the strategy determines that no compaction is necessary or possible, it returns `null`.

## Examples

### Custom Strategy Implementation
Implementing a simple strategy that removes the oldest message.

```typescript
import { CompactionStrategy, CompactionContext, StrategyResult } from 'yaaf';

class DropOldestStrategy implements CompactionStrategy {
  name = 'drop-oldest';

  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    if (ctx.messages.length <= 1) return null;

    const removedMessage = ctx.messages[0];
    const newMessages = ctx.messages.slice(1);

    return {
      messages: newMessages,
      summary: 'Dropped the oldest message in history.',
      messagesRemoved: 1,
      tokensFreed: ctx.estimateTokens(JSON.stringify(removedMessage)),
    };
  }
}
```

### Usage with ContextManager
Strategies are passed to the `ContextManager` during initialization.

```typescript
import { ContextManager, SummarizeStrategy } from 'yaaf';

const ctx = new ContextManager({
  contextWindowTokens: 200_000,
  maxOutputTokens: 16_384,
  llmAdapter: myModel,
  strategy: new SummarizeStrategy(),
});
```

## See Also
- `SummarizeStrategy`
- `TruncateStrategy`
- `SlidingWindowStrategy`
- `MicroCompactStrategy`
- `CompositeStrategy`