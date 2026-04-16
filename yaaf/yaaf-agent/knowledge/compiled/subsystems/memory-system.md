---
summary: A logical subsystem of YAAF that manages how agents store, retrieve, and maintain persistent information across conversations.
primary_files:
  - src/memory/strategies.ts
  - src/memory/memoryStore.ts
  - src/memory/relevance.ts
title: Memory System
entity_type: subsystem
exports:
  - MemoryStore
  - MemoryStrategy
  - MemoryExtractionStrategy
  - MemoryRetrievalStrategy
  - AutoMemoryExtractor
  - MemoryRelevanceEngine
  - SessionMemoryExtractor
  - TopicFileExtractor
  - EphemeralBufferStrategy
  - LLMRetrievalStrategy
  - RecencyRetrievalStrategy
  - CompositeMemoryStrategy
  - HonchoMemoryStrategy
  - TeamMemory
stub: false
compiled_at: 2026-04-16T14:09:01.338Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/memory.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/index.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/autoExtract.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/memoryStore.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/relevance.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/strategies.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/teamMemory.ts
confidence: 1
---

## Purpose
The **Memory System** in YAAF provides a pluggable architecture for managing persistent information. It decouples the process of extracting knowledge from a conversation (deciding *when* and *how* to save facts) from the process of retrieving that knowledge (deciding *what* to inject into the prompt at runtime). 

This subsystem solves the problem of context window limitations by allowing agents to maintain a long-term "working memory" that survives context compaction and spans multiple sessions. It is designed to be provider-agnostic and supports various persistence layers, from local markdown files to cloud services.

## Architecture
The Memory System follows a multi-tier architecture inspired by the Claude Code memory system. It is structured around three primary components: the **Memory Store**, the **Relevance Engine**, and the **Strategy Layer**.

### Memory Taxonomy
YAAF enforces a closed four-type taxonomy for memories to ensure consistency and prevent the system from becoming a stale cache of derivable data (like code patterns or git history):

| Type | Scope | Description |
| :--- | :--- | :--- |
| `user` | Private | User roles, goals, preferences, and specific knowledge. |
| `feedback` | Flexible | Corrections and confirmations of the agent's approach. |
| `project` | Team | Ongoing work, goals, deadlines, and architectural decisions. |
| `reference` | Team | Pointers to external systems, documentation, and resources. |

### Internal Components
*   **MemoryStore**: A file-based persistence layer that stores memories as individual markdown files with YAML frontmatter. It manages a `MEMORY.md` index file that acts as a lightweight table of contents.
*   **MemoryRelevanceEngine**: Uses an LLM to scan memory headers (names and descriptions) and select the most relevant entries for a specific user query.
*   **AutoMemoryExtractor**: A background utility that monitors conversation history and triggers extraction passes based on thresholds (e.g., token growth or tool call counts).
*   **TeamMemory**: An extension of the store that supports shared namespaces for multi-agent swarms, allowing agents to route memories to either `private` or `team` scopes.

### The Strategy Pattern
The system uses two primary interfaces to define behavior:
1.  **MemoryExtractionStrategy**: Defines `shouldExtract(ctx)` to check thresholds and `extract(ctx)` to process messages into the store.
2.  **MemoryRetrievalStrategy**: Defines `retrieve(ctx)` to select and format memories for the system prompt.

A **MemoryStrategy** combines both interfaces and is the primary configuration point for an agent.

## Integration Points
The Memory System interacts with the following components:
*   **AgentRunner**: Calls `buildMemoryPrefix()` before every LLM turn to inject retrieved memories into the system prompt.
*   **Context Manager**: Provides token estimates and message history to the `MemoryContext`.
*   **Plugin System**: Allows third-party services (like Honcho) to provide alternative memory implementations.

## Key APIs

### MemoryContext
The context object passed to strategies on every turn:
*   `messages`: Readonly array of conversation messages.
*   `currentQuery`: The latest user message.
*   `totalTokens`: Estimated total tokens in the conversation.
*   `toolCallsSinceExtraction`: Counter for triggering periodic saves.
*   `recentTools`: List of recently used tool names for relevance filtering.

### Built-in Strategies
*   **SessionMemoryExtractor**: Periodically extracts structured notes into a single markdown file. This is the recommended default for coding agents.
*   **TopicFileExtractor**: Writes individual markdown files per topic, suitable for long-term knowledge accumulation.
*   **EphemeralBufferStrategy**: An in-memory ring buffer for short-lived agents that requires no disk persistence.
*   **LLMRetrievalStrategy**: Uses the `MemoryRelevanceEngine` to perform semantic selection of memories.
*   **RecencyRetrievalStrategy**: A low-latency strategy that retrieves the $N$ most recently updated memories without an LLM call.
*   **CompositeMemoryStrategy**: A utility to mix and match different extraction and retrieval implementations.

## Configuration
Developers configure memory via the `Agent` constructor using the `memoryStrategy` field.

### Example: Session Memory
```typescript
import { Agent, sessionMemoryStrategy } from 'yaaf';

const agent = new Agent({
  memoryStrategy: sessionMemoryStrategy({
    extractFn: async ({ messages, currentNotes, systemPrompt }) => {
      // Implementation of LLM call to update notes
      return updatedNotes;
    },
    storagePath: './.memory/session-notes.md',
    minimumTokensBetweenUpdate: 5000,
    toolCallsBetweenUpdates: 3,
  }),
});
```

### Example: Topic Files with LLM Retrieval
```typescript
import { Agent, CompositeMemoryStrategy, TopicFileExtractor, LLMRetrievalStrategy } from 'yaaf';

const strategy = new CompositeMemoryStrategy({
  extraction: new TopicFileExtractor({ store: myStore, extractFn: myExtractFn }),
  retrieval: new LLMRetrievalStrategy({ store: myStore, queryFn: myQueryFn }),
});

const agent = new Agent({ memoryStrategy: strategy });
```

## Extension Points
Developers can implement the `MemoryStrategy` interface to integrate custom storage backends (e.g., Redis, Vector Databases) or custom extraction logic.

```typescript
import type { MemoryStrategy, MemoryContext, ExtractionResult, RetrievalResult } from 'yaaf';

class CustomDatabaseStrategy implements MemoryStrategy {
  readonly name = 'custom-db';

  async shouldExtract(ctx: MemoryContext) {
    return ctx.toolCallsSinceExtraction > 5;
  }

  async extract(ctx: MemoryContext): Promise<ExtractionResult> {
    // Custom logic to save to a database
    return { extracted: true, factsExtracted: 1 };
  }

  async retrieve(ctx: MemoryContext): Promise<RetrievalResult> {
    // Custom logic to query a database
    return {
      systemPromptSection: "## Relevant Info\n...",
      selectedMemories: [],
      tokenEstimate: 100
    };
  }
}
```