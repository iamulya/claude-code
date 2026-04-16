---
summary: The data structure provided to memory strategies during each turn, containing conversation history and metadata.
export_name: MemoryContext
source_file: src/memory/types.ts
category: interface
title: MemoryContext
entity_type: api
stub: false
compiled_at: 2026-04-16T14:09:05.692Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/memory.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/strategies.ts
confidence: 1
---

## Overview
`MemoryContext` is a data structure passed to memory strategies during the agent's execution loop. It provides the necessary state—including conversation history, token counts, and tool usage—for a strategy to decide whether to extract new knowledge and which existing memories to retrieve for the current turn.

By providing this context, YAAF decouples the memory strategy logic from the internal implementation of the agent's context management.

## Signature / Constructor

```typescript
export type MemoryContext = {
  /** Current conversation messages (role + content) */
  messages: ReadonlyArray<{ role: string; content: string; timestamp?: number }>;
  /** The user's most recent query */
  currentQuery: string;
  /** Estimated total tokens in the conversation */
  totalTokens: number;
  /** Number of tool calls since last extraction */
  toolCallsSinceExtraction: number;
  /** Tool names used recently (for relevance filtering) */
  recentTools?: readonly string[];
  /** Abort signal for cancellation */
  signal?: AbortSignal;
};
```

## Methods & Properties

| Property | Type | Description |
| :--- | :--- | :--- |
| `messages` | `ReadonlyArray` | The current conversation history, including roles (user, assistant, system, tool) and content. |
| `currentQuery` | `string` | The latest message sent by the user that triggered the current agent run. |
| `totalTokens` | `number` | An estimate of the total tokens currently consumed by the conversation history. |
| `toolCallsSinceExtraction` | `number` | A counter tracking how many tool calls have occurred since the last memory extraction was performed. |
| `recentTools` | `readonly string[]` | (Optional) A list of tool names that were recently invoked, which can be used to filter for relevant memories. |
| `signal` | `AbortSignal` | (Optional) A standard web API signal used to cancel asynchronous extraction or retrieval operations. |

## Examples

### Using Context in a Custom Strategy
This example demonstrates how a custom strategy uses the `MemoryContext` to decide when to trigger an extraction based on the number of messages.

```typescript
import type { MemoryStrategy, MemoryContext, ExtractionResult, RetrievalResult } from 'yaaf';

class MyCustomStrategy implements MemoryStrategy {
  readonly name = 'message-count-strategy';

  // Use context to decide if we should extract
  shouldExtract(ctx: MemoryContext): boolean {
    // Trigger extraction every 10 messages
    return ctx.messages.length > 0 && ctx.messages.length % 10 === 0;
  }

  async extract(ctx: MemoryContext): Promise<ExtractionResult> {
    console.log(`Extracting from ${ctx.messages.length} messages...`);
    // Extraction logic here...
    return { extracted: true, factsExtracted: 1 };
  }

  async retrieve(ctx: MemoryContext): Promise<RetrievalResult> {
    // Use currentQuery to find relevant info
    const section = `Relevant info for: ${ctx.currentQuery}`;
    return {
      systemPromptSection: section,
      selectedMemories: [],
      tokenEstimate: section.length / 4,
    };
  }
}
```

### Accessing Tool Metadata
Strategies can use `toolCallsSinceExtraction` to ensure that knowledge gained from tool outputs is periodically persisted.

```typescript
function shouldUpdate(ctx: MemoryContext): boolean {
  const TOOL_THRESHOLD = 3;
  const TOKEN_THRESHOLD = 5000;

  return (
    ctx.toolCallsSinceExtraction >= TOOL_THRESHOLD || 
    ctx.totalTokens >= TOKEN_THRESHOLD
  );
}
```