---
summary: Interface for logic that decides when and how to persist knowledge from a conversation into storage.
export_name: MemoryExtractionStrategy
source_file: src/memory/strategies.ts
category: interface
title: MemoryExtractionStrategy
entity_type: api
stub: false
compiled_at: 2026-04-16T14:30:10.847Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/strategies.ts
confidence: 1
---

## Overview
`MemoryExtractionStrategy` is a core interface in the YAAF memory strategy layer. It defines the "write" side of the memory lifecycle, determining both the **trigger policy** (when extraction should occur) and the **extraction logic** (how knowledge is processed and persisted).

In the agent loop, the framework calls this strategy on every turn to evaluate if the current conversation state warrants a memory update. This is typically used to move information from the volatile conversation context into long-term storage, such as structured session notes or individual topic files.

Common implementations include:
*   `SessionMemoryExtractor`: Periodically summarizes the conversation into a single structured markdown file.
*   `TopicFileExtractor`: Extracts specific facts into individual files with metadata.
*   `EphemeralBufferStrategy`: Maintains a rolling in-memory buffer of facts without disk persistence.

## Signature / Constructor

```typescript
export interface MemoryExtractionStrategy {
  /** Strategy name for logging */
  readonly name: string

  /**
   * Check if extraction should run this turn.
   * Called before every LLM call. Return true to trigger `extract()`.
   */
  shouldExtract(ctx: MemoryContext): boolean | Promise<boolean>

  /**
   * Extract knowledge from the conversation and persist it.
   * Only called when `shouldExtract()` returns true.
   */
  extract(ctx: MemoryContext): Promise<ExtractionResult>

  /**
   * Reset extraction state (e.g., after compaction clears messages).
   */
  reset?(): void
}
```

### Related Types

#### MemoryContext
The context provided to the strategy on each turn:
*   `messages`: Readonly array of conversation messages (role, content, timestamp).
*   `currentQuery`: The user's most recent input.
*   `totalTokens`: Estimated total tokens in the conversation.
*   `toolCallsSinceExtraction`: Number of tool calls executed since the last successful extraction.
*   `recentTools`: Optional list of tool names used recently.
*   `signal`: Optional `AbortSignal`.

#### ExtractionResult
The object returned by the `extract` method:
*   `extracted`: Boolean indicating if extraction was performed.
*   `summary`: Optional human-readable summary of the operation.
*   `factsExtracted`: Optional count of new or updated facts.
*   `tokenCost`: Optional token consumption for the operation.

## Methods & Properties

### name
A readonly string used for logging and debugging to identify which extraction strategy is active.

### shouldExtract(ctx)
Evaluates the `MemoryContext` to decide if an extraction cycle should begin. Implementations typically check thresholds such as:
*   Accumulated token counts.
*   Number of tool calls since the last update.
*   Presence of specific keywords or natural conversation breaks.

### extract(ctx)
Contains the logic for processing the conversation and updating the persistent store. This often involves a background LLM call to synthesize information from the `messages` in the `MemoryContext`.

### reset()
An optional method used to clear internal counters or state, such as when the framework performs context compaction or starts a new session.

## Examples

### Custom Tool-Based Trigger
This example shows a strategy that triggers extraction every 5 tool calls.

```typescript
import { MemoryExtractionStrategy, MemoryContext, ExtractionResult } from 'yaaf/memory';

class ToolCountStrategy implements MemoryExtractionStrategy {
  readonly name = 'ToolCountStrategy';

  shouldExtract(ctx: MemoryContext): boolean {
    // Trigger extraction every 5 tool calls
    return ctx.toolCallsSinceExtraction >= 5;
  }

  async extract(ctx: MemoryContext): Promise<ExtractionResult> {
    // Logic to summarize and save knowledge
    console.log('Extracting knowledge based on tool usage...');
    
    return {
      extracted: true,
      summary: 'Extracted knowledge after 5 tool calls',
      factsExtracted: 2
    };
  }
}
```

### Usage in Agent Configuration
```typescript
const agent = new Agent({
  memory: new CompositeMemoryStrategy({
    extraction: new TopicFileExtractor({ 
      store: myStore,
      extractFn: myLLMFunction 
    }),
    retrieval: new LLMRetrievalStrategy({ store: myStore })
  }),
});
```