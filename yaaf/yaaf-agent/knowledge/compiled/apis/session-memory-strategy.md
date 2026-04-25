---
title: SessionMemoryStrategy
entity_type: api
summary: A CompactionStrategy that leverages session memory to preserve key facts and recent context for long-running agents.
export_name: SessionMemoryStrategy
source_file: src/compaction/strategies/session-memory-strategy.ts
category: class
search_terms:
 - context compaction
 - long-running agent memory
 - preserve facts during conversation
 - summarize and keep recent messages
 - LLM memory management
 - session memory compact
 - extract key facts from chat
 - conversation history reduction
 - token limit management
 - hybrid summarization strategy
 - stateful agent context
 - reduce conversation tokens
stub: false
compiled_at: 2026-04-25T00:13:56.412Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/compaction.md
compiled_from_quality: documentation
confidence: 1
---

## Overview

`SessionMemoryStrategy` is a [CompactionStrategy](./compaction-strategy.md) that reduces the token count of a conversation by combining fact extraction with recency preservation. It uses an LLM to extract structured facts and key decisions from the conversation history, creating a "session memory" summary. It then discards older messages but retains a configurable number of the most recent messages verbatim [Source 1].

This hybrid approach offers a balance between the high-context preservation of a full summary and the speed of simpler strategies like truncation. It is particularly effective for long-running, stateful agents that need to remember important details from earlier in the conversation while also having immediate access to the most recent interactions [Source 1].

Using this strategy requires providing an [LLMAdapter](./llm-adapter.md), as it needs to make an LLM call to perform the fact extraction [Source 1]. It is often used as a primary compaction step within a [CompositeStrategy](./composite-strategy.md), preceded by faster, non-LLM strategies like `MicroCompactStrategy` [Source 1].

## Signature / Constructor

`SessionMemoryStrategy` is a class that implements the [CompactionStrategy](./compaction-strategy.md) interface. It is instantiated with a configuration object.

```typescript
import type { Message } from 'yaaf';

export interface SessionMemoryStrategyConfig {
  /**
   * An async function that receives the current messages and returns a
   * string summary of key facts, decisions, and context. This typically
   * involves an LLM call.
   */
  extractMemory: (messages: Message[]) => Promise<string>;

  /**
   * The minimum number of tokens to preserve from the most recent messages.
   * The strategy will keep recent messages until this token count is met or
   * exceeded.
   * @default 10000
   */
  minTokens?: number;

  /**
   * The minimum number of user and assistant messages to keep, regardless of
   * their token count. This ensures a minimum conversational context is
   * always preserved.
   * @default 5
   */
  minTextBlockMessages?: number;

  /**
   * A hard token limit for the recent messages being preserved. If `minTokens`
   * and `minTextBlockMessages` result in a token count greater than this,
   * the oldest messages will be dropped to stay under this cap.
   * @default 40000
   */
  maxTokens?: number;
}

public constructor(config: SessionMemoryStrategyConfig);
```

## Methods & Properties

As an implementation of [CompactionStrategy](./compaction-strategy.md), `SessionMemoryStrategy` has the following public properties and methods:

### Properties

*   `name`: `string` - The identifier for this strategy, which is `'session-memory'`.

### Methods

*   `canApply(ctx: CompactionContext): boolean` - Determines if the strategy can be applied to the current context.
*   `compact(ctx: CompactionContext): Promise<StrategyResult | null>` - Executes the compaction logic, returning the new message list and a summary of the operation.

## Examples

### Basic Usage

This example shows how to configure `SessionMemoryStrategy` with a custom function to extract key facts using an LLM adapter.

```typescript
import { SessionMemoryStrategy, type LLMAdapter } from 'yaaf';

declare const myModel: LLMAdapter;

const sessionMemory = new SessionMemoryStrategy({
  // Define the function to extract facts from the conversation
  extractMemory: async (messages) => {
    const result = await myModel.complete({
      messages: [
        ...messages,
        { role: 'user', content: 'Extract key facts, user preferences, and decisions from this conversation.' },
      ],
    });
    return result.content ?? '';
  },

  // Keep at least 10,000 tokens of recent messages
  minTokens: 10_000,

  // Always keep the last 5 user/assistant messages
  minTextBlockMessages: 5,

  // Do not exceed 40,000 tokens for the recent message block
  maxTokens: 40_000,
});
```

### In a Production Pipeline

`SessionMemoryStrategy` is most effective as part of a multi-stage pipeline using [CompositeStrategy](./composite-strategy.md). This allows faster, cheaper strategies to run first.

```typescript
import {
  CompositeStrategy,
  MicroCompactStrategy,
  SessionMemoryStrategy,
  SummarizeStrategy,
  type LLMAdapter,
} from 'yaaf';

declare const myModel: LLMAdapter;
declare const myExtractor: (messages: any[]) => Promise<string>;

const productionStrategy = new CompositeStrategy([
  // First, try to clear old tool results without an LLM call
  new MicroCompactStrategy({ keepRecent: 5 }),

  // If more space is needed, use session memory
  new SessionMemoryStrategy({ extractMemory: myExtractor }),

  // As a final fallback, perform a full summarization
  new SummarizeStrategy({ additionalInstructions: 'Focus on key outcomes.' }),
], { continueAfterPartial: true }); // Allows MicroCompact and SessionMemory to run in the same pass
```

## See Also

*   [CompactionStrategy](./compaction-strategy.md): The interface this class implements.
*   [ContextManager](./context-manager.md): The system that uses compaction strategies to manage token limits.
*   [CompositeStrategy](./composite-strategy.md): For combining multiple compaction strategies into a pipeline.
*   [SummarizeStrategy](./summarize-strategy.md): An alternative LLM-based strategy that performs a full summary.
*   [MicroCompactStrategy](./micro-compact-strategy.md): A non-LLM strategy often used before `SessionMemoryStrategy`.
*   [Memory](../concepts/memory.md): The high-level concept of agent memory that this strategy helps manage.

## Sources

*   [Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/compaction.md