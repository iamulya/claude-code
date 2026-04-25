---
summary: A micro-compaction strategy that clears old tool results when a significant time gap has passed since the last assistant message.
export_name: TimeBasedMicroCompactStrategy
source_file: src/context/strategies.ts
category: class
title: TimeBasedMicroCompactStrategy
entity_type: api
search_terms:
 - context compaction by time
 - clear tool results after idle
 - time-based micro-compaction
 - agent idle compaction
 - reduce context after time gap
 - stale tool output removal
 - optimizing context for expired cache
 - lightweight context management
 - compaction strategy pipeline
 - how to handle long conversations
 - TimeBasedMicroCompactConfig
 - YAAF compaction strategies
 - remove old tool calls
 - conversation history pruning
stub: false
compiled_at: 2026-04-24T17:44:08.465Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/strategies.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `TimeBasedMicroCompactStrategy` is a lightweight [Context Compaction](../concepts/context-compaction.md) strategy that clears the content of old tool result messages. This strategy is triggered [when](./when.md) the time elapsed since the last assistant message exceeds a configurable threshold [Source 1].

The primary rationale for this strategy is to optimize token usage when interacting with [LLM](../concepts/llm.md) providers. After a significant period of inactivity, any server-side prompt cache maintained by the provider is likely to have expired. This means the entire conversation history (prefix) will be sent and processed again. By clearing the verbose content of old [tool results](../concepts/tool-results.md) before this happens, the strategy reduces the size of the payload sent to the model, saving tokens and potentially reducing costs [Source 1].

This is a form of "micro-compaction" because it preserves the message structure—the agent still knows which [Tools](../subsystems/tools.md) were called and in what order—but replaces the potentially large tool output with a placeholder. It does not require an [LLM Call](../concepts/llm-call.md) to execute, making it a fast and efficient first step in a compaction pipeline [Source 1].

It is commonly used as the initial strategy within a `CompositeStrategy` to handle context bloat from old [Tool Calls](../concepts/tool-calls.md) after a user has been idle [Source 1].

## Signature / Constructor

`TimeBasedMicroCompactStrategy` is instantiated with an optional configuration object that defines its behavior.

```typescript
import type { CompactionStrategy } from 'yaaf';

export class TimeBasedMicroCompactStrategy implements CompactionStrategy {
  constructor(config?: TimeBasedMicroCompactConfig);
  // ... methods
}
```

### Configuration

The constructor accepts a `TimeBasedMicroCompactConfig` object with the following properties:

```typescript
export type TimeBasedMicroCompactConfig = {
  /**
   * The time gap in minutes that must pass since the last assistant message
   * to trigger this strategy.
   * @default 60
   */
  gapThresholdMinutes?: number;

  /**
   * The number of the most recent tool results to keep intact, even if the
   * time gap is exceeded.
   * @default 5
   */
  keepRecent?: number;

  /**
   * An optional set of tool names. If provided, only tool results from
   * these specific tools are eligible for clearing. If omitted, all
   * tool results are eligible.
   */
  compactableTools?: Set<string>;
};
```

## Methods & Properties

As an implementation of the `CompactionStrategy` interface, `TimeBasedMicroCompactStrategy` exposes the following public members:

### name

A read-only property that identifies the strategy.

```typescript
readonly name: string; // e.g., 'time-based-micro-compact'
```

### compact()

The core method that executes the compaction logic. It checks the timestamp of the last assistant message and, if the `gapThresholdMinutes` has been exceeded, it clears the content of old tool results.

```typescript
compact(ctx: CompactionContext): Promise<StrategyResult | null>;
```

It returns a `StrategyResult` object if compaction occurred, or `null` if the time gap was not met or there were no eligible tool results to clear.

## Examples

### Using in a Composite Pipeline

The most common use case is to place `TimeBasedMicroCompactStrategy` at the beginning of a `CompositeStrategy` pipeline. This allows it to run a cheap check for idle time before more expensive strategies are attempted.

```typescript
import {
  ContextManager,
  CompositeStrategy,
  TimeBasedMicroCompactStrategy,
  MicroCompactStrategy,
  SummarizeStrategy,
} from 'yaaf';

// Define a multi-tier compaction pipeline
const compactionPipeline = new CompositeStrategy([
  // 1. If the agent has been idle for over 30 minutes, clear old tool results.
  new TimeBasedMicroCompactStrategy({ gapThresholdMinutes: 30 }),

  // 2. As a regular check, always clear tool results except the last 5.
  new MicroCompactStrategy({ keepRecent: 5 }),

  // 3. As a last resort, perform a full LLM-based summarization.
  new SummarizeStrategy(),
]);

const contextManager = new ContextManager({
  // ... other configuration
  strategy: compactionPipeline,
});
```

### Standalone Usage

While less common, the strategy can also be used on its own if time-based tool result clearing is the only desired form of [Context Management](../subsystems/context-management.md).

```typescript
import { ContextManager, TimeBasedMicroCompactStrategy } from 'yaaf';

const contextManager = new ContextManager({
  // ... other configuration
  strategy: new TimeBasedMicroCompactStrategy({
    gapThresholdMinutes: 60,
    keepRecent: 3,
  }),
});
```

## See Also

- `CompositeStrategy`: For chaining multiple compaction strategies together.
- `MicroCompactStrategy`: A similar strategy that clears tool results based on count rather than time.
- `CompactionStrategy`: The interface that all compaction strategies implement.
- `SummarizeStrategy`: A common fallback strategy for full, LLM-based summarization.

## Sources

[Source 1]: src/context/strategies.ts