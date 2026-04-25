---
summary: A compaction strategy that keeps the most recent messages fitting within a specified token budget, working backwards from the newest message.
export_name: SlidingWindowStrategy
source_file: src/context/strategies.ts
category: class
title: SlidingWindowStrategy
entity_type: api
search_terms:
 - context compaction
 - keep recent messages
 - token budget strategy
 - sliding window context
 - message history management
 - how to keep newest messages
 - context window overflow
 - simple compaction without LLM
 - truncate old messages
 - fixed token window
 - conversation history pruning
 - alternative to truncation
stub: false
compiled_at: 2026-04-24T17:38:19.398Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/strategies.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `SlidingWindowStrategy` is a [Context Compaction](../concepts/context-compaction.md) strategy that preserves the most recent messages from a conversation history that fit within a specified [Token Budget](../concepts/token-budget.md) [Source 1]. It provides a more intelligent alternative to simple truncation by considering the token count of messages rather than just the number of messages [Source 1].

This strategy operates by iterating backwards from the newest message, accumulating messages until the target token budget is reached. Any messages older than those that fit within the window are discarded. This process does not require an [LLM](../concepts/llm.md) call, making it a fast and efficient method for managing context size [Source 1].

It is useful in scenarios where maintaining the most recent conversational turn is critical, and a simple, non-LLM-based approach to context control is desired.

## Signature / Constructor

The `SlidingWindowStrategy` class is instantiated with an optional configuration object.

```typescript
import type { CompactionStrategy } from 'yaaf';

export class SlidingWindowStrategy implements CompactionStrategy {
  constructor(config?: SlidingWindowStrategyConfig);
  // ... methods
}
```

### Configuration

The constructor accepts a `SlidingWindowStrategyConfig` object with the following properties:

```typescript
export type SlidingWindowStrategyConfig = {
  /** 
   * Target token usage as a fraction of the effective context limit (0-1). 
   * Default: 0.6 
   */
  targetFraction?: number;
};
```

- **`targetFraction`**: A number between 0 and 1 that determines the desired size of the [Context Window](../concepts/context-window.md) after compaction, relative to the model's effective token limit. For example, a `targetFraction` of `0.6` will keep the most recent messages that occupy up to 60% of the available context space. The default value is `0.6` [Source 1].

## Methods & Properties

`SlidingWindowStrategy` implements the `CompactionStrategy` interface.

### Properties

- **`name`**: `readonly string`
  A unique name for the strategy, used for logging and debugging [Source 1].

### Methods

- **`compact(ctx: CompactionContext): Promise<StrategyResult | null>`**
  Executes the sliding window compaction logic. It calculates the target token budget based on the `targetFraction` and the `effectiveLimit` from the context, then selects the most recent messages that fit within that budget. It returns a `StrategyResult` containing the new message list and compaction metadata, or `null` if no action is taken [Source 1].

- **`canApply?(ctx: CompactionContext): boolean | Promise<boolean>`**
  An optional method from the `CompactionStrategy` interface used by a `CompositeStrategy` to determine if this strategy is applicable to the current context. The default implementation considers the strategy always applicable [Source 1].

## Examples

The following examples demonstrate how to configure a `ContextManager` to use the `SlidingWindowStrategy`.

### Default Configuration

This example uses the `SlidingWindowStrategy` with its default `targetFraction` of 0.6 (60%).

```typescript
import { ContextManager, SlidingWindowStrategy } from 'yaaf';
import { myLlmAdapter } from './myAdapter'; // Assuming a configured LLM adapter

const contextManager = new ContextManager({
  llmAdapter: myLlmAdapter,
  strategy: new SlidingWindowStrategy(),
});

// When contextManager auto-compacts, it will keep the most recent
// messages that fit within 60% of the effective token limit.
```

### Custom Target Fraction

This example configures the strategy to be more aggressive, keeping messages that fit within 80% of the effective token limit.

```typescript
import { ContextManager, SlidingWindowStrategy } from 'yaaf';
import { myLlmAdapter } from './myAdapter'; // Assuming a configured LLM adapter

const contextManager = new ContextManager({
  llmAdapter: myLlmAdapter,
  strategy: new SlidingWindowStrategy({
    targetFraction: 0.8,
  }),
});

// Compaction will now aim to fill 80% of the context window
// with the most recent messages.
```

## See Also

- `CompactionStrategy`: The interface that all compaction strategies implement.
- `TruncateStrategy`: A simpler strategy that drops a fixed percentage of the oldest messages.
- `CompositeStrategy`: A strategy for chaining multiple compaction strategies together.
- `ContextManager`: The class responsible for managing conversation history and invoking compaction strategies.

## Sources

[Source 1] src/context/strategies.ts