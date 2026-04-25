---
summary: The core interface that all context compaction strategies must implement to provide custom logic for reducing conversation history.
export_name: CompactionStrategy
source_file: src/context/strategies.ts
category: interface
title: CompactionStrategy
entity_type: api
search_terms:
 - custom context compaction
 - implementing a compaction strategy
 - how to reduce conversation history
 - context management plugin
 - conversation summarization logic
 - token reduction interface
 - pluggable context strategies
 - create my own compaction method
 - conversation history management
 - extending context manager
 - compact method
 - canApply method
 - StrategyResult type
 - CompactionContext type
stub: false
compiled_at: 2026-04-24T16:56:13.778Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/strategies.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `CompactionStrategy` interface is the core contract for implementing custom logic to reduce the size of a conversation's message history. It is a key part of YAAF's pluggable architecture for [Context Management](../subsystems/context-management.md), allowing developers to define how an agent's context is managed [when](./when.md) it approaches the [LLM](../concepts/llm.md)'s token limit [Source 1].

Strategies implementing this interface are designed to be stateless. They receive a `CompactionContext` object containing the current state of the conversation and return a `StrategyResult` object with the modified message list, or `null` if no action was taken. This pattern allows for composing different strategies together, such as in a `[[[[[[[[CompositeStrategy]]]]]]]]` [Source 1].

Developers would implement this interface to create novel ways of managing context beyond the built-in strategies like summarization or truncation, tailoring the behavior to specific agent needs [Source 1].

## Signature

`CompactionStrategy` is an interface with one required property and one required method. An optional method, `canApply`, is also available [Source 1].

```typescript
export interface CompactionStrategy {
  /** Unique name for logging and debugging */
  readonly name: string;

  /**
   * Check if this strategy can handle the current context.
   * Used by CompositeStrategy to skip strategies that aren't applicable.
   * Default: always applicable.
   */
  canApply?(ctx: CompactionContext): boolean | Promise<boolean>;

  /**
   * Execute the compaction strategy.
   * Returns the new message array and stats, or null if the strategy
   * decided not to compact (e.g., nothing to clear).
   */
  compact(ctx: CompactionContext): Promise<StrategyResult | null>;
}
```

### Supporting Types

The `compact` and `canApply` methods rely on the following types for their input and output [Source 1]:

**`CompactionContext` (Input)**
This object provides the strategy with all necessary information about the current conversation state without exposing the internal workings of the `ContextManager` [Source 1].

```typescript
export type CompactionContext = {
  messages: readonly Message[];
  totalTokens: number;
  effectiveLimit: number;
  autoCompactThreshold: number;
  compactionCount: number;
  summarize?: (params: {
    messages: Message[];
    systemPrompt: string;
    signal?: AbortSignal;
  }) => Promise<string>;
  estimateTokens: (text: string) => number;
  signal?: AbortSignal;
};
```

**`StrategyResult` (Output)**
If a compaction is successful, the `compact` method returns this object describing the changes [Source 1].

```typescript
export type StrategyResult = {
  messages: Message[];
  summary: string;
  messagesRemoved: number;
  tokensFreed: number;
  extractedFacts?: string[];
  isPartial?: boolean;
  metadata?: Record<string, unknown>;
};
```

## Methods & Properties

### `name`
- **Type**: `readonly string`
- **Description**: A unique, human-readable name for the strategy. This is used for logging and debugging purposes to identify which strategy was executed [Source 1].

### `canApply()`
- **Signature**: `(ctx: CompactionContext): boolean | Promise<boolean>`
- **Description**: An optional method that checks if the strategy is applicable to the current context. The `CompositeStrategy` uses this to determine whether to attempt running a strategy or skip it. If not implemented, the strategy is considered always applicable [Source 1].

### `compact()`
- **Signature**: `(ctx: CompactionContext): Promise<StrategyResult | null>`
- **Description**: The primary method that contains the compaction logic. It receives the current `CompactionContext` and must return a `Promise` that resolves to either a `StrategyResult` object containing the new message history and metadata, or `null` if the strategy determines that no compaction should occur [Source 1].

## Examples

The following example shows a custom strategy that implements `CompactionStrategy`. This strategy removes all but the most recent `tool_result` message to save tokens, a simple form of micro-compaction.

```typescript
import {
  CompactionStrategy,
  CompactionContext,
  StrategyResult,
  Message,
} from 'yaaf';

class KeepLastToolResultStrategy implements CompactionStrategy {
  readonly name = 'keep-last-tool-result';

  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    const toolResults = ctx.messages.filter(m => m.role === 'tool_result');
    
    // If there's one or zero [[[[[[[[tool results]]]]]]]], there's nothing to compact.
    if (toolResults.length <= 1) {
      return null;
    }

    const lastToolResult = toolResults[toolResults.length - 1];
    const messagesToRemove = new Set(toolResults.slice(0, -1));

    const newMessages: Message[] = ctx.messages.filter(m => !messagesToRemove.has(m));
    
    const newTokens = newMessages.reduce(
      (sum, msg) => sum + ctx.estimateTokens(JSON.stringify(msg.content)),
      0
    );

    const messagesRemovedCount = ctx.messages.length - newMessages.length;
    const tokensFreed = ctx.totalTokens - newTokens;

    return {
      messages: newMessages,
      summary: `Removed ${messagesRemovedCount} old tool results, keeping the most recent one.`,
      messagesRemoved: messagesRemovedCount,
      tokensFreed: tokensFreed,
      isPartial: true, // This is a micro-compaction
    };
  }
}

// This strategy could then be used in a ContextManager:
// const ctxManager = new ContextManager({
//   ...
//   strategy: new KeepLastToolResultStrategy(),
// });
```

## See Also

- **ContextManager**: The class that consumes `CompactionStrategy` implementations to manage conversation history.
- **CompositeStrategy**: A built-in strategy that allows chaining multiple `CompactionStrategy` instances into a pipeline.
- **SummarizeStrategy**: A built-in strategy that uses an LLM to summarize the conversation.
- **TruncateStrategy**: A built-in strategy that removes the oldest messages.
- **MicroCompactStrategy**: A built-in strategy that clears the content of old tool results.

## Sources
[Source 1] src/context/strategies.ts