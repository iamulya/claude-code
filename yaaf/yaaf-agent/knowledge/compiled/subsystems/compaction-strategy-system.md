---
summary: Provides a pluggable architecture for context compaction strategies, allowing users to choose, compose, or implement custom methods for managing LLM context windows.
primary_files:
 - src/context/strategies.ts
title: Compaction Strategy System
entity_type: subsystem
exports:
 - CompactionStrategy
 - CompactionContext
 - StrategyResult
 - SummarizeStrategy
 - TruncateStrategy
 - SlidingWindowStrategy
 - MicroCompactStrategy
 - TimeBasedMicroCompactStrategy
 - SessionMemoryStrategy
 - CompositeStrategy
 - defaultCompactionPipeline
 - lightweightCompactionPipeline
search_terms:
 - context window management
 - how to handle long conversations
 - LLM context overflow
 - conversation summarization
 - token limit
 - context compaction
 - pluggable context strategies
 - micro-compaction
 - sliding window context
 - composite compaction pipeline
 - preventing context length errors
 - SummarizeStrategy
 - TruncateStrategy
stub: false
compiled_at: 2026-04-24T18:10:46.967Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/strategies.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Purpose

The Compaction Strategy System addresses the fundamental limitation of Large Language Models ([LLM](../concepts/llm.md)s): finite context windows. As a conversation or task progresses, the number of messages and associated tokens can exceed the model's capacity, leading to errors. This subsystem provides a pluggable and extensible architecture for implementing different "compaction" strategies to reduce the token count of a conversation history while preserving essential context [Source 1].

It allows developers to select from pre-built strategies, compose them into sophisticated pipelines, or implement entirely custom logic for managing context, balancing trade-offs between cost, speed, and context fidelity [Source 1].

## Architecture

The system is designed around a core interface, `CompactionStrategy`, and a set of concrete implementations that can be used individually or combined [Source 1].

### Core Interface

The central component is the `CompactionStrategy` interface, which defines the contract for any compaction algorithm. Strategies are designed to be stateless; they receive the current context, process it, and return a result without retaining any internal state between calls. The interface specifies two key methods [Source 1]:

*   `compact(ctx: CompactionContext)`: The primary method that executes the strategy's logic. It receives a `CompactionContext` object and returns a `StrategyResult` or `null` if no action was taken.
*   `canApply?(ctx: CompactionContext)`: An optional method used by composite strategies to determine if a given strategy is applicable to the current context, allowing it to be skipped if not.

### Data Structures

*   **`CompactionContext`**: An object passed to strategies during execution. It provides a safe, encapsulated view of the conversation state, including the message list, token counts, model limits, and access to utility functions like `summarize` and `estimateTokens` [Source 1].
*   **`StrategyResult`**: An object returned by a successful compaction. It contains the new, compacted array of messages, along with metadata such as the number of messages removed, tokens freed, and a human-readable summary of the operation [Source 1].

### Built-in Strategies

YAAF provides several built-in strategies, each offering a different approach to [Context Management](./context-management.md) [Source 1]:

*   **`SummarizeStrategy`**: The most comprehensive strategy. It uses an LLM to generate a structured summary of the entire conversation, replacing the previous message history with this new summary.
*   **`TruncateStrategy`**: The simplest and fastest strategy. It drops a configurable percentage of the oldest messages without any [LLM Call](../concepts/llm-call.md).
*   **`SlidingWindowStrategy`**: Keeps a configurable number of the most recent messages that fit within a target [Token Budget](../concepts/token-budget.md).
*   **`MicroCompactStrategy`**: A lightweight strategy that clears the content of old tool result messages, replacing them with a placeholder. This saves tokens while preserving the structural history of [Tool Calls](../concepts/tool-calls.md).
*   **`TimeBasedMicroCompactStrategy`**: A variant of micro-compaction that triggers only if a significant time gap has occurred since the last assistant message. The rationale is that a long pause likely invalidates any server-side prompt caches, so shrinking the context before the next request is beneficial.
*   **`Session[[[[[[[[Memory]]]]]]]]Strategy`**: A hybrid approach that extracts key facts and decisions into a structured Memory document, replaces older messages with this document, and keeps the most recent messages intact to preserve working context.
*   **`CompositeStrategy`**: A meta-strategy that chains multiple strategies together into a pipeline. It tries each strategy in order until one successfully compacts the context. This is the recommended approach for production agents, allowing for a multi-tiered compaction process (e.g., try a cheap micro-compaction first, then fall back to an expensive full summarization).

## Integration Points

The Compaction Strategy System is primarily consumed by the `ContextManager`. The `ContextManager` is responsible for tracking the token count of the conversation. [when](../apis/when.md) the token count exceeds a configured threshold, it invokes the `compact` method of the registered `CompactionStrategy` instance to bring the context back within limits [Source 1].

## Key APIs

*   **`CompactionStrategy`**: The core interface that developers implement to create custom compaction logic.
*   **`SummarizeStrategy`**: A powerful, LLM-based strategy for full conversation summarization. It is configurable with custom prompts and fact-extraction hooks.
*   **`MicroCompactStrategy`**: A lightweight strategy for clearing old [tool results](../concepts/tool-results.md) to save tokens without an LLM call.
*   **`CompositeStrategy`**: A container strategy used to build multi-step compaction pipelines. It can be configured to stop after the first successful compaction or to continue even after a partial compaction.
*   **`defaultCompactionPipeline()`**: A factory function that creates a production-ready, multi-tier pipeline combining `TimeBasedMicroCompactStrategy`, `MicroCompactStrategy`, and `SummarizeStrategy` as a fallback.
*   **`lightweightCompactionPipeline()`**: A factory function for creating a compaction pipeline suitable for environments where no LLM calls are desired for compaction.

## Configuration

Developers configure the compaction behavior by instantiating a strategy class and passing it to the `ContextManager` during initialization. Each strategy class may have its own configuration object for fine-tuning its behavior [Source 1].

A simple configuration might involve a single strategy:

```typescript
// Simple: use the summarize strategy
const ctx = new ContextManager({
  // ... other options
  strategy: new SummarizeStrategy(),
});
```

A more advanced, production-ready configuration uses a `CompositeStrategy` to create a pipeline:

```typescript
// Advanced: compose a pipeline
const ctx = new ContextManager({
  // ... other options
  strategy: new CompositeStrategy([
    new TimeBasedMicroCompactStrategy({ gapThresholdMinutes: 60 }),
    new MicroCompactStrategy({ keepRecent: 5 }),
    new SummarizeStrategy({ customPrompt: myPrompt }),
  ]),
});
```

## Extension Points

The primary extension point is the `CompactionStrategy` interface itself. Developers can create custom context management logic by implementing this interface. A custom strategy must provide a unique `name` and a `compact` method [Source 1].

```typescript
// Custom: implement your own
class MyStrategy implements CompactionStrategy {
  name = 'my-strategy';
  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    // Custom logic to reduce message tokens...
    return {
      messages: newMessages,
      summary: 'Compacted using MyStrategy',
      messagesRemoved: 10,
      tokensFreed: 4000,
    };
  }
}
```

## Sources

[Source 1]: src/context/strategies.ts