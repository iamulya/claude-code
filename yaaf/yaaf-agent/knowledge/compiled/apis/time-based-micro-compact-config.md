---
summary: Configuration options for the TimeBasedMicroCompactStrategy, setting the time threshold and number of recent tool results to keep.
export_name: TimeBasedMicroCompactConfig
source_file: src/context/strategies.ts
category: type
title: TimeBasedMicroCompactConfig
entity_type: api
search_terms:
 - time-based compaction
 - configure micro-compaction
 - clear old tool results
 - context strategy settings
 - idle agent compaction
 - gapThresholdMinutes setting
 - keepRecent tool results
 - compactableTools list
 - TimeBasedMicroCompactStrategy options
 - reduce context size after inactivity
 - agent prompt cache expiration
 - how to configure time-based micro-compact
stub: false
compiled_at: 2026-04-24T17:43:59.517Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/strategies.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

`TimeBasedMicroCompactConfig` is a TypeScript type alias that defines the configuration options for the `TimeBasedMicroCompactStrategy`. This strategy is a form of "micro-compaction" that clears the content of old tool result messages from the conversation history [when](./when.md) a significant time gap has occurred since the last assistant message [Source 1].

This approach is useful because long periods of inactivity often cause server-side prompt caches to expire. By clearing verbose tool outputs before the next interaction, the strategy reduces the amount of context that needs to be resent to the language model, saving tokens and potentially reducing latency [Source 1].

This configuration object allows developers to specify the duration of the time gap that triggers compaction, the number of recent [tool results](../concepts/tool-results.md) to preserve, and which specific [Tools](../subsystems/tools.md) are eligible for clearing [Source 1].

## Signature

`TimeBasedMicroCompactConfig` is a type alias for an object with the following properties:

```typescript
export type TimeBasedMicroCompactConfig = {
  /** 
   * Trigger when (now − last assistant timestamp) exceeds this many minutes. 
   * Default: 60 
   */
  gapThresholdMinutes?: number;
  /** 
   * Number of most-recent tool results to keep. 
   * Default: 5 
   */
  keepRecent?: number;
  /** Set of tool names eligible for clearing */
  compactableTools?: Set<string>;
};
```

### Properties

- **`gapThresholdMinutes`** `?number`
  - The time gap in minutes since the last assistant message that must be exceeded to trigger this compaction strategy.
  - If not specified, the default value is `60` [Source 1].

- **`keepRecent`** `?number`
  - The number of the most recent tool result messages to keep intact, even if the time threshold is met. This preserves the immediate working context.
  - If not specified, the default value is `5` [Source 1].

- **`compactableTools`** `?Set<string>`
  - An optional set of tool names. If provided, only tool results from the specified tools are eligible for clearing.
  - If omitted, all tool result messages are considered eligible for compaction [Source 1].

## Examples

The following example demonstrates how to configure the `TimeBasedMicroCompactStrategy` using the `TimeBasedMicroCompactConfig` object within a `CompositeStrategy` pipeline.

```typescript
import { 
  ContextManager, 
  CompositeStrategy, 
  TimeBasedMicroCompactStrategy,
  SummarizeStrategy 
} from 'yaaf';

// Assume myModel is a configured LLM adapter
// const myModel = ...;

// Create a compaction pipeline with a custom time-based strategy
const compactionPipeline = new CompositeStrategy([
  // This strategy runs first.
  new TimeBasedMicroCompactStrategy({
    // Trigger compaction after 30 minutes of inactivity
    gapThresholdMinutes: 30,
    // Always keep the 3 most recent tool results
    keepRecent: 3,
  }),
  // Fall back to a full summarization if more compaction is needed
  new SummarizeStrategy(),
]);

const contextManager = new ContextManager({
  contextWindowTokens: 200_000,
  maxOutputTokens: 16_384,
  llmAdapter: myModel,
  strategy: compactionPipeline,
});
```

## Sources

[Source 1] `src/context/strategies.ts`