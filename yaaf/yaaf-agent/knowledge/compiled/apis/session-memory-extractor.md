---
summary: A memory strategy that periodically extracts conversation summaries into structured markdown notes using a background LLM call.
export_name: SessionMemoryExtractor
source_file: src/memory/strategies.ts
category: class
title: SessionMemoryExtractor
entity_type: api
stub: false
compiled_at: 2026-04-16T14:30:12.585Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/strategies.ts
confidence: 1
---

## Overview
`SessionMemoryExtractor` is a core memory strategy in YAAF designed to maintain long-term working memory for an agent. It periodically processes the conversation history and extracts key information into a structured markdown file, referred to as "session notes." 

This strategy is modeled after the session memory system found in high-performance coding agents. It ensures that critical context persists even after conversation history is compacted or truncated. The extracted notes are injected back into the agent's system prompt during the retrieval phase.

## Signature / Constructor

The `SessionMemoryExtractor` implements the `MemoryStrategy` interface.

```typescript
export class SessionMemoryExtractor implements MemoryStrategy {
  constructor(config: SessionMemoryExtractorConfig);
}
```

### SessionMemoryExtractorConfig
The configuration object defines the behavior of the extraction triggers and the LLM interaction:

| Property | Type | Description |
| :--- | :--- | :--- |
| `extractFn` | `Function` | **Required.** LLM function that receives messages and current notes, returning updated notes. |
| `storagePath` | `string` | Optional. Path to persist session notes. Defaults to in-memory only. |
| `template` | `string` | Optional. Markdown template for notes. Defaults to `DEFAULT_SESSION_MEMORY_TEMPLATE`. |
| `minimumTokensToInit` | `number` | Minimum tokens accumulated before the first extraction. Default: `10,000`. |
| `minimumTokensBetweenUpdate` | `number` | Minimum token growth required between subsequent extractions. Default: `5,000`. |
| `toolCallsBetweenUpdates` | `number` | Minimum number of tool calls required between extractions. Default: `3`. |
| `maxSectionTokens` | `number` | Maximum tokens allowed per section in the notes. Default: `2,000`. |
| `maxTotalTokens` | `number` | Maximum total tokens for the session notes. Default: `12,000`. |
| `customPrompt` | `string` | Optional. Overrides the built-in extraction prompt. |
| `estimateTokens` | `Function` | Optional. Custom function to estimate token counts. |

## Methods & Properties

### Properties
*   **name** (`string`): The identifier for the strategy (used in logging).

### Methods
*   **shouldExtract(ctx: MemoryContext)**: Determines if an extraction should be triggered based on the current conversation state. It evaluates the cold-start threshold (`minimumTokensToInit`), token growth, tool call frequency, and "natural breaks" (turns where no tools were used).
*   **extract(ctx: MemoryContext)**: Executes the background LLM call via `extractFn` to synthesize new knowledge into the session notes. Returns an `ExtractionResult`.
*   **retrieve(ctx: MemoryContext)**: Formats the current session notes for injection into the system prompt. Returns a `RetrievalResult`.
*   **initialize()**: Optional. Prepares storage or loads existing notes from disk.
*   **destroy()**: Optional. Flushes buffers or closes storage connections.
*   **reset()**: Resets internal counters and state, typically called after conversation compaction.

## Examples

### Basic Usage
This example demonstrates configuring an agent with session memory using a custom LLM extraction function.

```typescript
import { Agent, SessionMemoryExtractor, DEFAULT_SESSION_MEMORY_TEMPLATE } from 'yaaf';

const agent = new Agent({
  memory: new SessionMemoryExtractor({
    storagePath: './logs/session_notes.md',
    extractFn: async ({ messages, currentNotes, systemPrompt }) => {
      // Call your LLM provider here to process the update
      const response = await myLLMProvider.generate({
        prompt: `${systemPrompt}\n\nExisting Notes: ${currentNotes}\n\nNew Messages: ${JSON.stringify(messages)}`
      });
      return response.text;
    },
    template: DEFAULT_SESSION_MEMORY_TEMPLATE,
    minimumTokensToInit: 5000,
  }),
});
```

## See Also
* `MemoryStrategy`: The interface implemented by this class.
* `MemoryContext`: The context object passed to strategy methods.
* `DEFAULT_SESSION_MEMORY_TEMPLATE`: The default markdown structure used for session notes.