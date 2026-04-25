---
summary: A compaction strategy that clears the content of old tool results, preserving message structure while saving tokens.
export_name: MicroCompactStrategy
source_file: src/context/strategies.ts
category: class
title: MicroCompactStrategy
entity_type: api
search_terms:
 - clear tool results
 - token saving strategy
 - context compaction without LLM
 - micro-compaction
 - preserve message structure
 - reduce context size
 - how to handle large tool outputs
 - lightweight context management
 - placeholder for tool content
 - keep recent tool calls
 - optimizing agent history
 - YAAF compaction strategies
stub: false
compiled_at: 2026-04-24T17:22:20.867Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/strategies.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `MicroCompactStrategy` is a lightweight, non-[LLM](../concepts/llm.md)-based [Context Compaction](../concepts/context-compaction.md) strategy that reduces token count by clearing the content of old tool result messages [Source 1]. Instead of removing messages entirely or summarizing them, this strategy replaces the verbose output of a tool call with a simple placeholder message.

This approach preserves the structural integrity of the conversation history, allowing the language model to see that a specific tool was called, while significantly reducing the number of tokens consumed by its output. It is considered a "partial" or "micro" compaction because it modifies messages in place rather than replacing a large portion of the history with a summary [Source 1].

This strategy is particularly effective as a fast, initial step in a larger compaction pipeline, as it can free up tokens without the cost and latency of an [LLM Call](../concepts/llm-call.md). It is modeled after the micro-compaction service found in the main YAAF repository [Source 1].

## Signature / Constructor

`MicroCompactStrategy` implements the `CompactionStrategy` interface. Its constructor accepts an optional configuration object to customize its behavior.

```typescript
import type { CompactionStrategy } from './strategies.js';

export type MicroCompactStrategyConfig = {
  /** 
   * Number of most-recent tool results to keep intact. 
   * @default 5 
   */
  keepRecent?: number;

  /**
   * Set of tool names eligible for micro-compaction.
   * If not provided, all tool_result messages are eligible.
   */
  compactable[[[[[[[[Tools]]]]]]]]?: Set<string>;

  /** 
   * Sentinel text used to replace cleared content.
   */
  clearedMessage?: string;
};

export class MicroCompactStrategy implements CompactionStrategy {
  constructor(config?: MicroCompactStrategyConfig);
  // ...
}
```

### Configuration

- **`keepRecent`**: The number of the most recent tool result messages to leave untouched. This ensures that the immediate context for the agent's current task remains fully intact. Defaults to `5` [Source 1].
- **`compactableTools`**: An optional `Set` of strings containing the names of Tools whose results are eligible for compaction. If this is not provided, results from all tools are considered [Source 1].
- **`clearedMessage`**: An optional string to use as the placeholder for the cleared tool result content. If not provided, a default message is likely used [Source 1].

## Methods & Properties

As an implementation of `CompactionStrategy`, `MicroCompactStrategy` has the following public members:

### Properties

- **`name`**: `readonly string`
  A unique name for the strategy, used for logging and debugging [Source 1].

### Methods

- **`compact(ctx: CompactionContext): Promise<StrategyResult | null>`**
  Executes the compaction logic. It identifies `tool_result` messages that are older than the `keepRecent` threshold and whose tool name is in the `compactableTools` set (if provided). It then replaces the `content` of these messages with the placeholder text and returns a `StrategyResult` object detailing the changes, including the number of tokens freed. The result's `isPartial` property will be set to `true` [Source 1].

## Examples

### Standalone Usage

Using `MicroCompactStrategy` as the sole compaction method in a `ContextManager`.

```typescript
import { ContextManager, MicroCompactStrategy } from 'yaaf';
import { myModel } from './my-llm-adapter';

const ctx = new ContextManager({
  contextWindowTokens: 128_000,
  maxOutputTokens: 4_096,
  llmAdapter: myModel,
  strategy: new MicroCompactStrategy({
    // Keep the last 3 tool results intact
    keepRecent: 3,
    // Only compact results from these specific tools
    compactableTools: new Set(['file_reader', 'web_search']),
  }),
});
```

### Usage in a Composite Pipeline

The recommended approach is to use `MicroCompactStrategy` as the first step in a `CompositeStrategy` pipeline, falling back to more comprehensive strategies if more tokens need to be freed.

```typescript
import { 
  ContextManager, 
  CompositeStrategy, 
  MicroCompactStrategy, 
  SummarizeStrategy 
} from 'yaaf';
import { myModel } from './my-llm-adapter';

const compactionPipeline = new CompositeStrategy([
  // First, try to clear old tool results. This is fast and cheap.
  new MicroCompactStrategy({ keepRecent: 5 }),
  
  // If that's not enough, fall back to a full LLM-based summary.
  new SummarizeStrategy(),
]);

const ctx = new ContextManager({
  contextWindowTokens: 128_000,
  maxOutputTokens: 4_096,
  llmAdapter: myModel,
  strategy: compactionPipeline,
});
```

## Sources

[Source 1] src/context/strategies.ts