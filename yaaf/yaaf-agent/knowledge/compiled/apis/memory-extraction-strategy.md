---
summary: An interface defining the contract for memory extraction strategies used by the AutoMemoryExtractor.
export_name: MemoryExtractionStrategy
source_file: src/memory/strategies.js
category: type
title: MemoryExtractionStrategy
entity_type: api
search_terms:
 - memory extraction contract
 - how to create a memory strategy
 - AutoMemoryExtractor strategy
 - custom memory extraction logic
 - implementing memory storage
 - durable memory persistence
 - conversation knowledge extraction
 - long-term memory in agents
 - memory strategy interface
 - what is MemoryContext
 - what is ExtractionResult
 - pluggable memory systems
stub: false
compiled_at: 2026-04-24T17:21:39.287Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/autoExtract.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Overview

`[[[[[[[[Memory]]]]]]]]ExtractionStrategy` is a type that defines the contract for implementing custom Memory extraction logic. It allows developers to specify *how* an agent should identify and store important information from a conversation history for long-term recall.

This strategy is a required component for configuring the `AutoMemoryExtractor` class, which handles the orchestration of [when](./when.md) and how often to run the extraction process. By separating the strategy from the orchestrator, YAAF allows for flexible and pluggable memory systems. An implementation of `MemoryExtractionStrategy` is responsible for the core logic of processing messages and producing a result containing the memories to be stored.

## Signature

The specific signature for `MemoryExtractionStrategy` is defined in `src/memory/strategies.js`. While the source material for that file is not provided, its usage is demonstrated within the `AutoExtractorConfig` type [Source 1].

The strategy is consumed by `AutoMemoryExtractor` and is expected to produce an `ExtractionResult`. It likely operates on a `MemoryContext` which would contain the relevant messages and other contextual information.

The primary configuration point for this strategy is the `AutoExtractorConfig` interface:

```typescript
import type { MemoryExtractionStrategy, ExtractionResult } from "./strategies.js";

export type AutoExtractorConfig = {
  /** The extraction strategy to use for storing extracted memories. */
  extractionStrategy: MemoryExtractionStrategy;

  /** Only extract every N turns. Default: 1 (every turn). */
  turnInterval?: number;

  /** Only process messages if there are at least N new messages. Default: 3. */
  minNewMessages?: number;

  /** Called when memories are extracted. */
  onExtracted?: (result: ExtractionResult) => void;

  /** Called on extraction error. */
  onError?: (error: Error) => void;
};
```

## Examples

The following example shows how to provide a `MemoryExtractionStrategy` implementation to an `AutoMemoryExtractor`.

Note: The `myStrategy` implementation is a conceptual example to illustrate usage, as a concrete implementation is not provided in the source material.

```typescript
import { AutoMemoryExtractor } from 'yaaf/memory';
import type { MemoryExtractionStrategy, ExtractionResult, MessageLike } from 'yaaf/memory';

// A hypothetical implementation of the MemoryExtractionStrategy interface.
// This strategy would likely call an LLM to summarize messages.
const myStrategy: MemoryExtractionStrategy = {
  async extract(context: { messages: MessageLike[], prompt: string }): Promise<ExtractionResult> {
    console.log(`Extracting memories from ${context.messages.length} messages...`);
    
    // In a real implementation, this would involve an LLM call
    // to identify key facts from the conversation.
    const extractedMemories = [
      { content: "User's primary goal is to book a flight.", importance: 0.9 },
      { content: "User prefers window seats.", importance: 0.5 },
    ];

    return {
      memories: extractedMemories,
      // The ID of the last message processed
      cursor: context.messages[context.messages.length - 1].id, 
    };
  }
};

// Configure the AutoMemoryExtractor with the custom strategy.
const extractor = new AutoMemoryExtractor({
  extractionStrategy: myStrategy,
  turnInterval: 2, // Run every 2 turns
  onExtracted: (result) => {
    console.log(`Successfully extracted ${result.memories.length} memories.`);
  },
  onError: (error) => {
    console.error('Memory extraction failed:', error);
  }
});

// The extractor would then be hooked into an agent's lifecycle.
// For example, after each turn is complete:
// agent.on('turn:complete', (turn) => {
//   extractor.onTurnComplete(turn.messages, 'Extract key facts about the user.');
// });
```

## See Also

*   `AutoMemoryExtractor`: The class that consumes a `MemoryExtractionStrategy` to automate the process of extracting memories from conversations.

## Sources

*   [Source 1]: `src/memory/autoExtract.ts`