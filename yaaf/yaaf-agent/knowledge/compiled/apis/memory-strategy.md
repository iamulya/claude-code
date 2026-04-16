---
summary: The primary interface combining extraction and retrieval capabilities for agent memory.
export_name: MemoryStrategy
source_file: src/memory/types.ts
category: interface
title: MemoryStrategy
entity_type: api
stub: false
compiled_at: 2026-04-16T14:09:02.030Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/memory.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/strategies.ts
confidence: 1
---

## Overview
`MemoryStrategy` is the core interface for the YAAF pluggable memory system. It decouples the logic of when and how an agent extracts knowledge from a conversation from the logic of how that knowledge is retrieved and injected into the system prompt. 

The architecture is inspired by multi-tier memory systems, allowing agents to maintain persistent state across long-running sessions or multiple conversations. A `MemoryStrategy` combines two distinct responsibilities:
1.  **Extraction**: Monitoring the conversation to identify and persist important facts or state changes.
2.  **Retrieval**: Selecting relevant historical context to include in the LLM's current context window.

## Signature / Constructor

`MemoryStrategy` is an interface that extends both `MemoryExtractionStrategy` and `MemoryRetrievalStrategy`.

```typescript
export interface MemoryStrategy extends MemoryExtractionStrategy, MemoryRetrievalStrategy {
  /** Initialize the strategy (create dirs, load state, etc.) */
  initialize?(): Promise<void>
  
  /** Shutdown (flush buffers, close connections) */
  destroy?(): Promise<void>
}
```

### Supporting Types

#### MemoryContext
The context object passed to strategy methods on every turn.
| Field | Type | Description |
| :--- | :--- | :--- |
| `messages` | `ReadonlyArray<{role, content}>` | The current conversation history. |
| `currentQuery` | `string` | The user's most recent input. |
| `totalTokens` | `number` | Estimated total tokens in the current context. |
| `toolCallsSinceExtraction` | `number` | Number of tool calls since the last extraction run. |
| `recentTools` | `string[]` | Names of tools used in recent turns. |
| `signal` | `AbortSignal` | Optional signal for cancellation. |

#### ExtractionResult
| Field | Type | Description |
| :--- | :--- | :--- |
| `extracted` | `boolean` | Whether an extraction operation was performed. |
| `summary` | `string` | Optional human-readable summary of the extraction. |
| `factsExtracted` | `number` | Number of discrete items saved or updated. |
| `tokenCost` | `number` | Total tokens consumed by the extraction LLM call. |

#### RetrievalResult
| Field | Type | Description |
| :--- | :--- | :--- |
| `systemPromptSection` | `string` | The formatted text to be injected into the system prompt. |
| `selectedMemories` | `Array<{name, content}>` | The specific memory entries selected for this turn. |
| `tokenEstimate` | `number` | Estimated token count of the injected section. |

## Methods & Properties

### Properties
*   **`name`**: `string` (Required) - A unique identifier for the strategy used in logging and debugging.

### Extraction Methods
*   **`shouldExtract(ctx: MemoryContext)`**: `boolean | Promise<boolean>` - Evaluates the current context (e.g., token counts, tool usage) to determine if the `extract` method should be triggered.
*   **`extract(ctx: MemoryContext)`**: `Promise<ExtractionResult>` - Processes the conversation to extract knowledge and persist it to a store.
*   **`reset?()`**: `void` - Optional method to clear internal extraction state, typically called after context compaction.

### Retrieval Methods
*   **`retrieve(ctx: MemoryContext)`**: `Promise<RetrievalResult>` - Queries the memory store and formats the results for the LLM prompt. This method is responsible for staying within token budgets.

## Examples

### Implementing a Custom Strategy
This example demonstrates a custom strategy that persists facts to a Redis store every 20 messages.

```typescript
import type {
  MemoryStrategy,
  MemoryContext,
  ExtractionResult,
  RetrievalResult,
} from 'yaaf';

class RedisMemoryStrategy implements MemoryStrategy {
  readonly name = 'redis-memory';

  async initialize() { 
    await this.redis.connect(); 
  }

  shouldExtract(ctx: MemoryContext): boolean {
    return ctx.messages.length % 20 === 0;
  }

  async extract(ctx: MemoryContext): Promise<ExtractionResult> {
    const facts = await extractFacts(ctx.messages);
    await this.redis.set(`memory:${Date.now()}`, JSON.stringify(facts));
    return { extracted: true, factsExtracted: facts.length };
  }

  async retrieve(ctx: MemoryContext): Promise<RetrievalResult> {
    const keys  = await this.redis.keys('memory:*');
    const facts = await Promise.all(keys.slice(-10).map(k => this.redis.get(k)));
    const section = `## Memory\n${facts.filter(Boolean).join('\n')}`;
    
    return {
      systemPromptSection: section,
      selectedMemories: facts.map((f, i) => ({ name: keys[i]!, content: f! })),
      tokenEstimate: Math.ceil(section.length / 4),
    };
  }
}
```

### Using Built-in Session Memory
The `SessionMemoryExtractor` mirrors the Claude Code memory system, maintaining a structured markdown document of "Session Notes".

```typescript
import { Agent, sessionMemoryStrategy } from 'yaaf';

const agent = new Agent({
  memoryStrategy: sessionMemoryStrategy({
    extractFn: async ({ messages, currentNotes, systemPrompt }) => {
      // Implementation of LLM call to update notes
      return updatedNotes;
    },
    storagePath: './.memory/session-notes.md',
    minimumTokensToInit: 10000,
    toolCallsBetweenUpdates: 3
  })
});
```

### Composing Strategies
The `CompositeMemoryStrategy` allows mixing different extraction and retrieval implementations.

```typescript
import { 
  Agent, 
  CompositeMemoryStrategy, 
  TopicFileExtractor, 
  LLMRetrievalStrategy 
} from 'yaaf';

const agent = new Agent({
  memoryStrategy: new CompositeMemoryStrategy({
    extraction: new TopicFileExtractor({ store: myStore, extractFn }),
    retrieval: new LLMRetrievalStrategy({ store: myStore, queryFn })
  })
});
```

## See Also
* `MemoryStore`
* `MemoryRelevanceEngine`
* `SessionMemoryExtractor`
* `TopicFileExtractor`
* `HonchoMemoryStrategy`