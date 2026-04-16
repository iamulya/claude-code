---
summary: A pluggable system that decouples how an agent extracts knowledge from a conversation from how that knowledge is retrieved during prompt construction.
title: Memory Strategy
entity_type: concept
stub: false
compiled_at: 2026-04-16T14:08:55.452Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/memory.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/strategies.ts
confidence: 1
---

---
title: Memory Strategy
entity_type: concept
summary: A pluggable system that decouples how an agent extracts knowledge from a conversation from how that knowledge is retrieved during prompt construction.
related_subsystems:
  - Agent
  - Memory

## What It Is
A **Memory Strategy** is a pluggable architecture in YAAF that manages how an agent stores, retrieves, and maintains persistent knowledge across conversations. It solves the problem of context window management by decoupling the process of extracting facts from a live conversation from the process of selecting relevant facts to inject into a system prompt.

This system is inspired by the multi-tier memory architecture found in Claude Code, allowing agents to maintain "working memory" (like session notes) or "long-term memory" (like topic-specific files) without manually managing the underlying storage logic during the agent's execution loop.

## How It Works in YAAF
The memory strategy system is built around two primary interfaces that are often combined into a single `MemoryStrategy` implementation.

### Core Interfaces
1.  **`MemoryExtractionStrategy`**: Governs *when* and *how* to extract knowledge. It uses a trigger policy (e.g., based on token counts or tool calls) to decide if the current conversation contains new information worth persisting.
2.  **`MemoryRetrievalStrategy`**: Governs *how* to select and format memories for the current turn. It is called during the prompt-building phase to generate a `systemPromptSection` that is injected into the agent's context.

### The Memory Context
On every turn, the active strategy receives a `MemoryContext` object containing:
*   **`messages`**: The current conversation history.
*   **`currentQuery`**: The latest user input.
*   **`totalTokens`**: An estimate of the current context size.
*   **`toolCallsSinceExtraction`**: A counter used to trigger periodic updates.
*   **`recentTools`**: A list of recently invoked tools to help determine relevance.

### Execution Flow
The agent follows a specific lifecycle for memory management:
1.  **Check Extraction**: The agent calls `shouldExtract(ctx)`. If it returns true, the agent calls `extract(ctx)`.
2.  **Retrieve**: The agent calls `retrieve(ctx)` to get the relevant memory text.
3.  **Inject**: The resulting text is added to the system prompt before the LLM is called.

### Built-in Strategies
YAAF provides several pre-configured strategies:

| Strategy | Description |
| :--- | :--- |
| `SessionMemoryExtractor` | Periodically extracts structured markdown notes (e.g., "Current State", "Learnings") into a single file. |
| `TopicFileExtractor` | Writes individual markdown files with YAML frontmatter for specific topics or concepts. |
| `EphemeralBufferStrategy` | Maintains a rolling ring buffer of facts in-memory with no disk persistence. |
| `LLMRetrievalStrategy` | Uses an LLM to semantically select the most relevant memories from a store based on the user's query. |
| `RecencyRetrievalStrategy` | Selects the $N$ most recently updated memories without requiring an LLM call. |
| `CompositeMemoryStrategy` | Allows developers to pair any extraction strategy with any retrieval strategy. |
| `HonchoMemoryStrategy` | Integrates with the Honcho cloud service for remote memory storage and user modeling. |

## Configuration
Developers configure memory strategies by passing them to the `Agent` constructor. Strategies can be used individually or composed using the `CompositeMemoryStrategy`.

### Session Memory Example
This strategy mirrors the default behavior of coding assistants, maintaining a structured set of notes that survive context compaction.

```typescript
import { Agent, sessionMemoryStrategy } from 'yaaf';

const agent = new Agent({
  memoryStrategy: sessionMemoryStrategy({
    extractFn: async ({ messages, currentNotes, systemPrompt }) => {
      // Implementation using an LLM provider
      return await myModel.complete({
        messages: [...messages, { role: 'user', content: systemPrompt }]
      }).then(r => r.content);
    },
    storagePath: './.memory/session.md',
    minimumTokensToInit: 10000,
    toolCallsBetweenUpdates: 3
  })
});
```

### Composite Strategy Example
This example demonstrates decoupling extraction (writing to files) from retrieval (using an LLM to find relevant files).

```typescript
import { 
  Agent, 
  CompositeMemoryStrategy, 
  TopicFileExtractor, 
  LLMRetrievalStrategy 
} from 'yaaf';

const agent = new Agent({
  memoryStrategy: new CompositeMemoryStrategy({
    extraction: new TopicFileExtractor({ 
      store: myFileStore, 
      extractFn: myExtractionLlm 
    }),
    retrieval: new LLMRetrievalStrategy({ 
      store: myFileStore, 
      queryFn: myRelevanceLlm 
    })
  })
});
```

### Custom Strategy Implementation
A custom strategy must implement the `MemoryStrategy` interface, providing logic for both extraction and retrieval.

```typescript
import type { MemoryStrategy, MemoryContext, ExtractionResult, RetrievalResult } from 'yaaf';

class MyCustomStrategy implements MemoryStrategy {
  readonly name = 'custom-db-strategy';

  shouldExtract(ctx: MemoryContext): boolean {
    return ctx.toolCallsSinceExtraction > 5;
  }

  async extract(ctx: MemoryContext): Promise<ExtractionResult> {
    // Logic to save to a database
    return { extracted: true, factsExtracted: 1 };
  }

  async retrieve(ctx: MemoryContext): Promise<RetrievalResult> {
    const content = "Relevant data from DB";
    return {
      systemPromptSection: `## Knowledge\n${content}`,
      selectedMemories: [{ name: 'db_entry', content }],
      tokenEstimate: 10
    };
  }
}
```