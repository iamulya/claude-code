---
summary: A class that provides automatic, background extraction of durable memories from conversation history.
export_name: AutoMemoryExtractor
source_file: src/memory/autoExtract.ts
category: class
title: AutoMemoryExtractor
entity_type: api
search_terms:
 - background memory extraction
 - automatic knowledge capture
 - long-term memory for agents
 - how to save important facts
 - conversation summarization
 - durable memory
 - extracting memories from chat
 - turn-based memory extraction
 - memory strategy
 - onTurnComplete memory
 - throttling memory writes
 - preventing duplicate memories
 - cursor tracking for messages
 - coalesce memory runs
stub: false
compiled_at: 2026-04-24T16:52:17.408Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/autoExtract.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `Auto[[[[[[[[Memory]]]]]]]]Extractor` class provides a mechanism for automatically extracting and storing durable memories from an agent's conversation history [Source 1]. It operates in the background, typically after an agent completes a turn, to scan the recent conversation for knowledge worth preserving for long-term use [Source 1].

This class is designed to be robust for production environments by implementing several key features [Source 1]:
- **Cursor Tracking**: It only processes messages that have appeared since the last extraction, preventing redundant work.
- **Overlap Prevention**: An in-progress guard ensures that only one extraction process runs at a time.
- **Mutual Exclusion**: It will skip an extraction pass if the main agent has already written memories during the same turn, avoiding conflicts.
- **Throttling**: The frequency of extraction can be controlled to run only every N turns or [when](./when.md) a minimum number of new messages are present.

You would use `AutoMemoryExtractor` to give an agent a sense of long-term Memory without needing to manually identify and save important facts within your agent's primary logic.

## Signature / Constructor

The `AutoMemoryExtractor` is instantiated with a configuration object that defines its behavior and strategy.

```typescript
import type { MemoryExtractionStrategy, ExtractionResult } from "./strategies.js";

export type MessageLike = {
  role: string;
  content: string;
  id?: string;
};

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

export class AutoMemoryExtractor {
  constructor(config: AutoExtractorConfig);
  // ... methods
}
```

### Configuration (`AutoExtractorConfig`)

- `extractionStrategy`: (Required) An instance of a `MemoryExtractionStrategy` that defines how and where the extracted memories are stored [Source 1].
- `turnInterval`: (Optional) A number specifying how many turns to wait between extraction attempts. A value of `1` (the default) means it runs after every turn [Source 1].
- `minNewMessages`: (Optional) The minimum number of new messages required since the last run to trigger an extraction. The default is `3` [Source 1].
- `onExtracted`: (Optional) A callback function that is invoked with the `ExtractionResult` upon successful extraction of memories [Source 1].
- `onError`: (Optional) A callback function that is invoked with an `Error` object if an extraction attempt fails [Source 1].

## Methods & Properties

Based on the source examples, the class exposes the following public methods.

### `onTurnComplete`

Triggers an extraction pass based on the latest conversation history. This method is typically called from an agent's `turn:complete` event listener.

**Signature**
```typescript
onTurnComplete(messages: MessageLike[], prompt: string): void;
```
- `messages`: An array of `MessageLike` objects representing the conversation history for the completed turn.
- `prompt`: A string prompt used to guide the [LLM](../concepts/llm.md) in identifying what information is important to extract. For example: `'What is the user doing?'` [Source 1].

### `drain`

Waits for any in-progress extraction operations to complete. This is useful for ensuring a clean shutdown of an application.

**Signature**
```typescript
drain(): Promise<void>;
```
Returns a `Promise` that resolves when all pending extraction tasks are finished.

## Examples

The following example demonstrates how to instantiate `AutoMemoryExtractor`, hook it into an agent's lifecycle, and ensure clean shutdown [Source 1].

```typescript
const extractor = new AutoMemoryExtractor({
  extractionStrategy: myStrategy, // An instance of a memory strategy
});

// Hook into agent post-turn:
agent.on('turn:complete', (messages) => {
  // The prompt guides the LLM on what to look for.
  extractor.onTurnComplete(messages, 'What is the user doing?');
});

// Drain pending extractions before shutdown:
await extractor.drain();
```

## Sources
[Source 1]: src/memory/autoExtract.ts