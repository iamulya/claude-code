---
summary: A background process pattern in YAAF for distilling durable knowledge from conversation history without blocking the agent's main execution loop.
title: Auto Memory Extraction
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:29:41.901Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/autoExtract.ts
confidence: 0.95
---

---
title: Auto Memory Extraction
entity_type: concept
summary: A background process pattern in YAAF for distilling durable knowledge from conversation history without blocking the agent's main execution loop.
related_subsystems:
  - Memory
  - Agent Loop

## What It Is
Auto Memory Extraction is a background mechanism in YAAF designed to distill durable knowledge from ongoing conversation history. Its primary purpose is to ensure that an agent's long-term memory is updated with relevant facts and context without introducing latency into the primary agent execution loop. By offloading the extraction process to a post-turn phase, YAAF maintains high responsiveness while still capturing critical information for future interactions.

## How It Works in YAAF
The extraction process is managed by the `AutoMemoryExtractor` class. It typically hooks into the agent's lifecycle via the `turn:complete` event. When a turn finishes, the extractor evaluates the conversation history to determine if a new extraction pass is necessary.

The mechanism relies on four core principles to ensure efficiency and data integrity:

1.  **Cursor Tracking**: The extractor maintains a cursor to track which messages have already been processed. This ensures that only new messages since the last successful extraction are scanned, reducing redundant LLM processing.
2.  **Overlap Prevention**: To handle rapid-fire interactions, the system employs in-progress guards and trailing-run coalescence. This prevents multiple extraction tasks from running concurrently and ensures that any messages arriving during an active extraction are captured in a subsequent "trailing" run.
3.  **Mutual Exclusion**: The extractor can be configured to skip its pass if the main agent logic has already explicitly written memories during the current turn, preventing duplicate or conflicting knowledge entries.
4.  **Throttling**: Extraction is not necessarily performed after every message. It can be throttled based on a turn interval or a minimum threshold of new messages.

Before an application shuts down, the `drain()` method can be called to ensure all pending background extractions are completed.

## Configuration
Developers configure the extraction behavior using the `AutoExtractorConfig` object. This configuration defines the strategy for storage, the frequency of extractions, and hooks for handling results or errors.

```typescript
const extractor = new AutoMemoryExtractor({
  extractionStrategy: myStrategy, // Implementation of MemoryExtractionStrategy
  turnInterval: 1,               // How many turns to wait between extractions
  minNewMessages: 3,             // Minimum message count to trigger a pass
  onExtracted: (result) => {
    console.log('Memories distilled:', result);
  },
  onError: (error) => {
    console.error('Extraction failed:', error);
  }
});

// Integration with the agent loop
agent.on('turn:complete', (messages) => {
  extractor.onTurnComplete(messages, 'Contextual hint or query');
});

// Ensuring all tasks finish before shutdown
await extractor.drain();
```

### Configuration Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `extractionStrategy` | `MemoryExtractionStrategy` | The strategy used to process and store the extracted memories. |
| `turnInterval` | `number` | Optional. Only extract every N turns. Defaults to 1. |
| `minNewMessages` | `number` | Optional. Only process if there are at least N new messages since the last cursor. Defaults to 3. |
| `onExtracted` | `Function` | Optional. Callback triggered upon successful extraction. |
| `onError` | `Function` | Optional. Callback triggered when an extraction error occurs. |

## Sources
* `src/memory/autoExtract.ts`---