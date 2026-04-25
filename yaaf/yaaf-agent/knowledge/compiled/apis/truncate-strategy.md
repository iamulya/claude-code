---
summary: A simple compaction strategy that removes the oldest N% of messages without using an LLM.
export_name: TruncateStrategy
source_file: src/context/strategies.ts
category: class
title: TruncateStrategy
entity_type: api
search_terms:
 - context compaction
 - message history truncation
 - remove old messages
 - non-LLM compaction
 - fastest context strategy
 - simple context management
 - drop oldest messages
 - percentage-based truncation
 - context window overflow
 - how to shrink conversation history
 - memory management without LLM
 - dropRatio configuration
stub: false
compiled_at: 2026-04-24T17:45:54.056Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/strategies.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `TruncateStrategy` is a [Context Compaction](../concepts/context-compaction.md) strategy that reduces the number of messages in a conversation history by removing a configurable percentage of the oldest messages. It is the simplest and fastest built-in strategy because it does not require an [LLM](../concepts/llm.md) call to perform its function [Source 1].

This strategy is useful in scenarios where performance is critical, LLM Calls are expensive or unavailable, or [when](./when.md) a basic, predictable compaction mechanism is sufficient. The main trade-off is that it is the least context-preserving method, as it removes messages based solely on their age without considering their importance or content [Source 1].

It implements the `CompactionStrategy` interface.

## Signature / Constructor

The `TruncateStrategy` class is instantiated with an optional configuration object.

```typescript
import type { CompactionStrategy } from './strategies.js';

export type TruncateStrategyConfig = {
  /** Percentage of messages to drop (0-1). Default: 0.5 (50%) */
  dropRatio?: number;
};

export class TruncateStrategy implements CompactionStrategy {
  constructor(config?: TruncateStrategyConfig);
  // ...
}
```

### Configuration

The constructor accepts a `TruncateStrategyConfig` object with the following properties:

- **`dropRatio`** `number` (optional): A number between 0 and 1 representing the percentage of the oldest messages to remove from the history. If not provided, it defaults to `0.5`, which removes the oldest 50% of messages [Source 1].

## Methods & Properties

As an implementation of the `CompactionStrategy` interface, `TruncateStrategy` has the following public members:

### Properties

- **`name`**: `readonly string`
  A unique identifier for the strategy, used for logging and debugging.

### Methods

- **`compact(ctx: CompactionContext): Promise<StrategyResult | null>`**
  Executes the truncation logic. It calculates the number of messages to remove based on the `dropRatio` and the total message count, removes them from the beginning of the message array, and returns a `StrategyResult` object detailing the changes.

## Examples

### Basic Usage

Using `TruncateStrategy` with its default configuration to remove the oldest 50% of messages when the [Context Window](../concepts/context-window.md) is full.

```typescript
import { ContextManager, TruncateStrategy } from 'yaaf';
import { myLlmAdapter } from './myAdapter';

const contextManager = new ContextManager({
  llmAdapter: myLlmAdapter,
  strategy: new TruncateStrategy(), // Defaults to dropping 50% of messages
});

// When contextManager auto-compacts, it will use TruncateStrategy.
```

### Custom Drop Ratio

Configuring the strategy to remove only the oldest 25% of messages.

```typescript
import { ContextManager, TruncateStrategy } from 'yaaf';
import { myLlmAdapter } from './myAdapter';

const contextManager = new ContextManager({
  llmAdapter: myLlmAdapter,
  strategy: new TruncateStrategy({
    dropRatio: 0.25, // Drop the oldest 25% of messages
  }),
});
```

## See Also

- `CompactionStrategy`: The interface that all compaction strategies implement.
- `SummarizeStrategy`: A more advanced strategy that uses an LLM to summarize the conversation.
- `SlidingWindowStrategy`: A strategy that keeps a fixed number of recent messages based on a [Token Budget](../concepts/token-budget.md).
- `CompositeStrategy`: A strategy that allows chaining multiple compaction strategies together.

## Sources

[Source 1]: src/context/strategies.ts