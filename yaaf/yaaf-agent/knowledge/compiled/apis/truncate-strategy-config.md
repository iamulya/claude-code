---
summary: Configuration options for the TruncateStrategy, specifying the percentage of messages to drop.
export_name: TruncateStrategyConfig
source_file: src/context/strategies.ts
category: type
title: TruncateStrategyConfig
entity_type: api
search_terms:
 - truncate context
 - drop old messages
 - context compaction configuration
 - TruncateStrategy options
 - how to configure truncation
 - dropRatio setting
 - simple context management
 - non-LLM compaction
 - fastest compaction strategy
 - percentage of messages to remove
 - context window overflow
 - message history trimming
stub: false
compiled_at: 2026-04-24T17:46:01.930Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/strategies.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`TruncateStrategyConfig` is a type alias for the configuration object used by the `TruncateStrategy` class. This strategy provides a simple and fast method for [Context Compaction](../concepts/context-compaction.md) by dropping a specified percentage of the oldest messages from the conversation history [Source 1].

This approach does not involve any Large Language Model ([LLM](../concepts/llm.md)) calls, making it the fastest available compaction strategy. However, it is also the least context-preserving, as it discards messages based solely on their age without considering their content [Source 1]. It is suitable for scenarios where performance is critical and the loss of older context is acceptable.

## Signature

The `TruncateStrategyConfig` type defines the options for configuring a `TruncateStrategy`.

```typescript
export type TruncateStrategyConfig = {
  /**
   * Percentage of messages to drop, expressed as a decimal between 0 and 1.
   * For example, 0.5 means 50% of the oldest messages will be removed.
   * @default 0.5
   */
  dropRatio?: number;
};
```
[Source 1]

### Properties

- **`dropRatio`** `?number`
  - Specifies the fraction of the oldest messages to remove from the context.
  - The value must be between 0.0 (drop nothing) and 1.0 (drop everything).
  - If not provided, it defaults to `0.5`, which removes the oldest 50% of messages [Source 1].

## Examples

The following example demonstrates how to configure a `ContextManager` to use the `TruncateStrategy`, specifying that the oldest 75% of messages should be dropped [when](./when.md) compaction is triggered.

```typescript
import { ContextManager, TruncateStrategy } from 'yaaf';

// Assume myModel is a configured LLM adapter
const myModel = { /* ... */ };

// Configure the strategy to drop the oldest 75% of messages
const truncateStrategy = new TruncateStrategy({
  dropRatio: 0.75
});

const contextManager = new ContextManager({
  llmAdapter: myModel,
  contextWindowTokens: 8192,
  strategy: truncateStrategy,
});

// When contextManager's context exceeds its threshold, it will
// use the TruncateStrategy to remove the oldest 75% of messages.
```

## See Also

- `TruncateStrategy`: The compaction strategy class that uses this configuration.
- `CompactionStrategy`: The interface that all compaction strategies implement.
- `ContextManager`: The class responsible for managing the agent's conversational context and applying compaction strategies.

## Sources

- [Source 1]: `src/context/strategies.ts`