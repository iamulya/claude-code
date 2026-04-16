---
export_name: AutoMemoryExtractor
source_file: src/memory/autoExtract.ts
category: class
title: AutoMemoryExtractor
entity_type: api
summary: A class for background extraction of durable memories from conversation history using configurable strategies and throttling.
stub: false
compiled_at: 2026-04-16T14:29:38.179Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/autoExtract.ts
confidence: 1
---

## Overview
`AutoMemoryExtractor` provides a mechanism for background extraction of durable memories from conversation history. It is designed to run after an agent's query-loop completion to scan for knowledge worth persisting without blocking the primary agent response.

The extractor implements several operational guards to ensure efficiency and data integrity:
1.  **Cursor tracking**: It tracks the last processed message to ensure only new content is scanned.
2.  **Overlap prevention**: It utilizes an in-progress guard and trailing-run coalescence to prevent concurrent extraction tasks from interfering with one another.
3.  **Mutual exclusion**: It can skip processing if the primary agent has already performed memory writes during the current turn.
4.  **Throttling**: Extraction frequency can be controlled via turn intervals and minimum message thresholds.

## Signature / Constructor

### Constructor
```typescript
constructor(config: AutoExtractorConfig)
```

### Configuration Types

```typescript
export type AutoExtractorConfig = {
  /** The extraction strategy to use for storing extracted memories. */
  extractionStrategy: MemoryExtractionStrategy
  /** Only extract every N turns. Default: 1 (every turn). */
  turnInterval?: number
  /** Only process messages if there are at least N new messages. Default: 3. */
  minNewMessages?: number
  /** Called when memories are extracted. */
  onExtracted?: (result: ExtractionResult) => void
  /** Called on extraction error. */
  onError?: (error: Error) => void
}

export type MessageLike = {
  role: string
  content: string
  id?: string
}
```

## Methods & Properties

### onTurnComplete()
```typescript
onTurnComplete(messages: MessageLike[], context?: string): void
```
Triggers the extraction logic. This method evaluates whether the current state meets the `turnInterval` and `minNewMessages` requirements before initiating a background extraction task.

### drain()
```typescript
drain(): Promise<void>
```
Returns a promise that resolves when all pending background extraction tasks have completed. This is typically used during application shutdown to ensure no data loss.

## Examples

### Basic Usage
The following example demonstrates how to initialize the extractor and hook it into an agent's lifecycle.

```typescript
const extractor = new AutoMemoryExtractor({
  extractionStrategy: myStrategy,
  turnInterval: 2,
  minNewMessages: 5
});

// Hook into agent post-turn:
agent.on('turn:complete', (messages) => {
  extractor.onTurnComplete(messages, 'User is discussing project architecture.');
});

// Ensure all memories are saved before exiting:
await extractor.drain();
```