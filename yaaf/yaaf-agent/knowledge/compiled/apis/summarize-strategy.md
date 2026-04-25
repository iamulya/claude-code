---
summary: A compaction strategy that uses an LLM to summarize the entire conversation, replacing old messages with a concise summary.
export_name: SummarizeStrategy
source_file: src/context/strategies.ts
category: class
title: SummarizeStrategy
entity_type: api
search_terms:
 - LLM summarization strategy
 - conversation summary
 - context compaction
 - how to summarize chat history
 - structured prompt for summary
 - replace messages with summary
 - full context summarization
 - memory management for agents
 - prevent context overflow
 - extract facts from conversation
 - custom summarization prompt
 - CompactionStrategy implementation
stub: false
compiled_at: 2026-04-24T17:42:27.470Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/context/strategies.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `SummarizeStrategy` is a [Context Compaction](../concepts/context-compaction.md) strategy that uses a Large Language Model ([LLM](../concepts/llm.md)) to perform a comprehensive summary of the entire conversation history. [when](./when.md) triggered, it sends all current messages to the LLM with a structured prompt and replaces the entire message history with a single, concise summary message [Source 1].

This strategy is considered the "gold standard" for its thoroughness, as it attempts to preserve the most important information from the conversation. By default, it uses a built-in, structured prompt that instructs the LLM to summarize key aspects like user intent, important concepts, files discussed, errors encountered, and next steps. This prompt can be customized or augmented by the user [Source 1].

`SummarizeStrategy` is often used as a final fallback in a multi-tiered compaction pipeline, after cheaper strategies like `MicroCompactStrategy` have been attempted. While powerful, it is the most resource-intensive strategy as it requires an [LLM Call](../concepts/llm-call.md) [Source 1].

## Signature / Constructor

`SummarizeStrategy` is a class that implements the `CompactionStrategy` interface. It is instantiated with an optional configuration object.

```typescript
import type { CompactionStrategy } from './strategies.js';

export class SummarizeStrategy implements CompactionStrategy {
  constructor(config?: SummarizeStrategyConfig);
  // ... implementation
}
```

### Configuration

The constructor accepts a `SummarizeStrategyConfig` object with the following properties [Source 1]:

```typescript
export type SummarizeStrategyConfig = {
  /**
   * Custom summarization prompt. If not provided, uses the built-in
   * structured prompt that covers: intent, concepts, files, errors,
   * problem solving, user messages, pending tasks, current work, next steps.
   */
  customPrompt?: string;
  /**
   * Additional instructions appended to the prompt (e.g., "focus on
   * TypeScript changes"). Merged with the default prompt when no
   * customPrompt is set.
   */
  additionalInstructions?: string;
  /**
   * Hook to extract facts before messages are replaced.
   * Extracted facts are included in the result for persistence.
   */
  onExtractFacts?: (messages: Message[]) => Promise<string[]> | string[];
  /**
   * If true, suppress follow-up questions in the summary message.
   * Default: true
   */
  suppressFollowUp?: boolean;
};
```

## Methods & Properties

### Properties

#### `name`

A read-only string property that provides a unique name for the strategy, used for logging and debugging. It implements the `name` property from the `CompactionStrategy` interface [Source 1].

```typescript
readonly name: string;
```

### Methods

#### `compact()`

Executes the summarization strategy. This method receives the current `CompactionContext`, which includes the message history and a `summarize` function for calling the LLM. It orchestrates the summarization and returns a `StrategyResult` containing the new summary message and metadata about the operation. It implements the `compact` method from the `CompactionStrategy` interface [Source 1].

```typescript
compact(ctx: CompactionContext): Promise<StrategyResult | null>;
```

## Examples

### Basic Usage

Using `SummarizeStrategy` as the sole compaction method for a `ContextManager`.

```typescript
import { ContextManager, SummarizeStrategy } from 'yaaf';
import { myModel } from './my-llm-adapter.js';

const ctx = new ContextManager({
  contextWindowTokens: 128_000,
  maxOutputTokens: 4_096,
  llmAdapter: myModel,
  strategy: new SummarizeStrategy(),
});

// When the context exceeds its threshold, it will be fully summarized.
```

### Advanced Configuration

Providing a custom prompt and a hook to extract facts before summarization.

```typescript
import { ContextManager, SummarizeStrategy } from 'yaaf';
import { myModel } from './my-llm-adapter.js';

const myPrompt = `
  Summarize the key technical decisions and code snippets from this conversation.
  Focus only on the final agreed-upon implementation details.
`;

const strategy = new SummarizeStrategy({
  customPrompt: myPrompt,
  onExtractFacts: async (messages) => {
    // A simple example of extracting facts from tool calls
    return messages
      .filter(msg => msg.role === 'tool' && msg.tool_name === 'file_write')
      .map(msg => `Wrote to file: ${msg.tool_input.path}`);
  },
});

const ctx = new ContextManager({
  llmAdapter: myModel,
  strategy: strategy,
});
```

### As a Fallback in a Pipeline

`SummarizeStrategy` is commonly used as the final step in a `CompositeStrategy` pipeline, ensuring that context is always managed, even if cheaper strategies fail to free enough tokens [Source 1].

```typescript
import {
  ContextManager,
  CompositeStrategy,
  MicroCompactStrategy,
  SummarizeStrategy,
} from 'yaaf';
import { myModel } from './my-llm-adapter.js';

const pipeline = new CompositeStrategy([
  // First, try to clear old [[[[[[[[tool results]]]]]]]] without an LLM call
  new MicroCompactStrategy({ keepRecent: 5 }),
  // If that's not enough, fall back to full summarization
  new SummarizeStrategy(),
]);

const ctx = new ContextManager({
  llmAdapter: myModel,
  strategy: pipeline,
});
```

## See Also

- `CompactionStrategy`: The interface that all compaction strategies implement.
- `CompositeStrategy`: A strategy for chaining multiple strategies together in a pipeline.
- `ContextManager`: The class that manages the agent's conversation history and uses compaction strategies.
- `MicroCompactStrategy`: A lighter-weight strategy that clears tool results instead of summarizing.
- `SessionMemoryStrategy`: An alternative LLM-based strategy that extracts key facts and preserves recent messages.

## Sources

[Source 1] `src/context/strategies.ts`