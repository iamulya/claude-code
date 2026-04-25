---
summary: Configuration options for the SlidingWindowStrategy, defining the target token usage fraction.
export_name: SlidingWindowStrategyConfig
source_file: src/context/strategies.ts
category: type
title: SlidingWindowStrategyConfig
entity_type: api
search_terms:
 - context window management
 - sliding window context
 - keep recent messages
 - token budget strategy
 - compaction strategy configuration
 - SlidingWindowStrategy options
 - target token fraction
 - how to configure sliding window
 - context truncation by token count
 - message history limit
 - conversation buffer size
 - effective context limit
stub: false
compiled_at: 2026-04-24T17:38:19.587Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/strategies.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`SlidingWindowStrategyConfig` is a TypeScript type that defines the configuration options for the `SlidingWindowStrategy` [Context Compaction](../concepts/context-compaction.md) strategy [Source 1].

This strategy keeps the most recent messages that fit within a specified [Token Budget](../concepts/token-budget.md). Unlike a simple `TruncateStrategy` which drops a fixed percentage of messages, the `SlidingWindowStrategy` is more intelligent. It works backwards from the newest message, accumulating messages until the token budget is met or exceeded. This ensures the most recent conversational context is preserved up to a specific token limit [Source 1].

The `SlidingWindowStrategyConfig` object allows developers to specify this token budget as a fraction of the model's effective context limit [Source 1].

## Signature

The configuration is a plain object with the following structure:

```typescript
export type SlidingWindowStrategyConfig = {
  /** 
   * Target token usage as a fraction of the effective limit (0-1). 
   * Default: 0.6 
   */
  targetFraction?: number;
};
```
[Source 1]

### Properties

- **`targetFraction`** `number` (optional)
  - Defines the target token usage as a fraction of the effective [Context Window](../concepts/context-window.md) size (total context window minus `maxOutputTokens`).
  - The value must be between 0 and 1.
  - **Default**: `0.6` (i.e., 60% of the effective limit) [Source 1].

## Examples

The following example demonstrates how to configure a `ContextManager` to use the `SlidingWindowStrategy`, aiming to keep recent messages that occupy up to 80% of the available context window after compaction.

```typescript
import { ContextManager, SlidingWindowStrategy } from 'yaaf';
import { myModel } from './my-llm-adapter'; // Assuming a configured LLM adapter

// Configure the strategy to keep recent messages that fill up to
// 80% of the available context window after compaction.
const slidingWindowStrategy = new SlidingWindowStrategy({
  targetFraction: 0.8,
});

const contextManager = new ContextManager({
  contextWindowTokens: 128_000,
  maxOutputTokens: 4_096,
  llmAdapter: myModel,
  strategy: slidingWindowStrategy,
});

// When contextManager's history grows and triggers compaction, it will
// use the sliding window strategy. It will keep the most recent messages
// that fit within approximately (128_000 - 4_096) * 0.8 tokens.
```

## See Also

- `SlidingWindowStrategy`: The compaction strategy class that uses this configuration.
- `CompactionStrategy`: The interface that all compaction strategies implement.
- `ContextManager`: The class that manages the agent's conversational context and applies compaction strategies.

## Sources

[Source 1]: src/context/strategies.ts