---
summary: A background process in YAAF for automatically extracting and storing durable memories from an agent's conversation history.
primary_files:
 - src/memory/autoExtract.ts
 - src/memory/strategies.js
title: Auto Memory Extraction
entity_type: concept
related_subsystems:
 - memory
search_terms:
 - background memory extraction
 - automatic knowledge capture
 - how to save agent memories
 - durable memory from conversation
 - conversation history processing
 - memory extraction strategy
 - turn-based memory saving
 - throttling memory extraction
 - preventing duplicate memories
 - agent memory persistence
 - extracting facts from chat
 - YAAF memory management
stub: false
compiled_at: 2026-04-24T17:52:46.056Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/autoExtract.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Auto [Memory](./memory.md) Extraction is a background process in YAAF designed to automatically identify and persist important information from an agent's ongoing conversation history into a durable memory store [Source 1]. This mechanism allows an agent to build a long-term knowledge base from its interactions without requiring explicit commands to save every piece of information. It solves the problem of knowledge loss in long-running conversations where context windows are finite.

The process runs asynchronously after an agent completes a conversational turn, ensuring it does not block the primary query loop [Source 1].

## How It Works in YAAF

The core implementation is the `AutoMemoryExtractor` class, which is typically hooked into an agent's `turn:complete` event. After each turn, the extractor scans the conversation history for new information that is worth storing permanently [Source 1].

To ensure efficiency and prevent data corruption, the process incorporates several key features [Source 1]:

1.  **Cursor Tracking**: The extractor maintains a cursor to track which messages have already been processed. This ensures that it only scans new messages added since its last run, avoiding redundant work.
2.  **Overlap Prevention**: It uses an in-progress guard to prevent multiple extraction processes from running simultaneously. It also coalesces trailing runs to manage overlapping triggers efficiently.
3.  **Mutual Exclusion**: The process will skip an extraction pass if it detects that the main agent has already explicitly written memories during the same turn. This prevents conflicts and duplicate memory entries.
4.  **Throttling**: The extraction can be configured to run only periodically (e.g., every N turns) or [when](../apis/when.md) a minimum number of new messages have accumulated, reducing computational overhead.

The actual logic for identifying and storing memories is delegated to a configurable `MemoryExtractionStrategy`. Before the application shuts down, a `drain()` method can be called to ensure all pending extraction tasks are completed [Source 1].

## Configuration

The behavior of the `AutoMemoryExtractor` is configured through the `AutoExtractorConfig` object passed to its constructor.

```typescript
import { AutoMemoryExtractor } from 'path/to/autoExtract';
import { myStrategy } from 'path/to/strategies';
import { myAgent } from 'path/to/agent';

const extractor = new AutoMemoryExtractor({
  extractionStrategy: myStrategy,
  turnInterval: 2, // Extract every 2 turns
  minNewMessages: 5, // Only run if there are at least 5 new messages
  onExtracted: (result) => console.log('Memories extracted:', result),
  onError: (error) => console.error('Extraction failed:', error),
});

// Hook into the agent's lifecycle
myAgent.on('turn:complete', (messages) => {
  // The prompt here guides the LLM-based extraction process
  extractor.onTurnComplete(messages, 'What new facts were learned about the user?');
});

// Before shutting down the application
await extractor.drain();
```

Key configuration options include [Source 1]:

*   `extractionStrategy`: The `MemoryExtractionStrategy` implementation that defines how memories are identified and stored. This is a required field.
*   `turnInterval`: An integer specifying that extraction should only run every N turns. Defaults to `1` (every turn).
*   `minNewMessages`: The minimum number of new messages required to trigger an extraction pass. Defaults to `3`.
*   `onExtracted`: An optional callback function that is invoked with the `ExtractionResult` upon successful extraction.
*   `onError`: An optional callback function that is invoked with an `Error` object if the extraction process fails.

## Sources

[Source 1]: src/memory/autoExtract.ts