---
summary: How to select, configure, and compose different memory strategies to optimize agent performance and knowledge retention.
title: Configuring Memory Strategies
entity_type: guide
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:09:19.926Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/memory.md
confidence: 1
---

## Overview
YAAF provides a pluggable memory strategy system that decouples the process of extracting knowledge from a conversation from the process of retrieving that knowledge during prompt construction. This architecture allows developers to optimize for different use cases, such as long-running coding sessions, ephemeral chat interactions, or persistent knowledge bases.

In this guide, you will learn how to implement built-in memory strategies, compose extraction and retrieval logic, and create custom memory providers.

## Prerequisites
* A YAAF project initialized with an `Agent` instance.
* An LLM provider configured (required for strategies that use LLM-based extraction or retrieval).
* (Optional) A storage backend or file system access for persistent strategies.

## Step-by-Step

### 1. Implementing Session Memory
The `SessionMemoryExtractor` mirrors the multi-tier memory architecture used in production-grade coding agents. It extracts structured markdown notes from the conversation when specific thresholds (tokens or tool calls) are met.

```typescript
import { sessionMemoryStrategy, DEFAULT_SESSION_MEMORY_TEMPLATE, Agent } from 'yaaf';

const agent = new Agent({
  memoryStrategy: sessionMemoryStrategy({
    // Function to perform the extraction LLM call
    extractFn: async ({ messages, currentNotes, systemPrompt, signal }) => {
      return await myModel.complete({
        messages: [...messages, { role: 'user', content: systemPrompt }],
        signal,
      }).then(r => r.content ?? '');
    },
    storagePath: './.memory/session-notes.md',
    minimumTokensToInit: 10_000,       // Threshold for first extraction
    minimumTokensBetweenUpdate: 5_000, // Frequency of subsequent updates
    toolCallsBetweenUpdates: 3,        // Update every 3 tool calls
    template: DEFAULT_SESSION_MEMORY_TEMPLATE,
  }),
});
```

### 2. Using Ephemeral Buffers
For short-lived agents or scenarios where persistence is not required, use the `EphemeralBufferStrategy`. This keeps a fixed number of facts in an in-memory ring buffer.

```typescript
import { ephemeralBufferStrategy, Agent } from 'yaaf';

const agent = new Agent({
  memoryStrategy: ephemeralBufferStrategy({
    maxEntries: 50,  // Maximum number of facts to retain
    extractEvery: 5, // Extract a fact every 5 messages
  }),
});
```

### 3. Composing Extraction and Retrieval
You can mix and match how knowledge is saved and how it is searched using the `CompositeMemoryStrategy`. For example, you can extract knowledge into topic-based files but use an LLM to semantically select which files are relevant to the current query.

```typescript
import {
  CompositeMemoryStrategy,
  TopicFileExtractor,
  LLMRetrievalStrategy,
  Agent
} from 'yaaf';

const agent = new Agent({
  memoryStrategy: new CompositeMemoryStrategy({
    extraction: new TopicFileExtractor({ 
      store: myStore, 
      extractFn: myExtractFunction 
    }),
    retrieval: new LLMRetrievalStrategy({ 
      queryFn: myQueryFunction, 
      store: myStore 
    }),
  }),
});
```

### 4. Integrating Cloud Memory (Honcho)
YAAF supports Honcho for cloud-based memory and user modeling. This strategy provides both raw memory storage and a synthesized user representation (preferences, dialect, etc.).

```typescript
import { HonchoPlugin, honchoMemoryStrategy, Agent } from 'yaaf';

const honcho = new HonchoPlugin({
  apiKey: process.env.HONCHO_API_KEY!,
  workspaceId: 'my-app',
  userId: 'user-123',
});
await honcho.initialize();

const agent = new Agent({
  memoryStrategy: honchoMemoryStrategy(honcho),
});
```

### 5. Creating a Custom Strategy
To create a custom strategy, implement the `MemoryStrategy` interface, which combines `shouldExtract`, `extract`, and `retrieve`.

```typescript
import type {
  MemoryStrategy,
  MemoryContext,
  ExtractionResult,
  RetrievalResult,
} from 'yaaf';

class RedisMemoryStrategy implements MemoryStrategy {
  readonly name = 'redis-memory';

  async initialize() { /* Connect to Redis */ }

  shouldExtract(ctx: MemoryContext): boolean {
    return ctx.messages.length % 20 === 0;
  }

  async extract(ctx: MemoryContext): Promise<ExtractionResult> {
    // Logic to extract and save to Redis
    return { extracted: true, factsExtracted: 1 };
  }

  async retrieve(ctx: MemoryContext): Promise<RetrievalResult> {
    // Logic to fetch from Redis and format for the system prompt
    return {
      systemPromptSection: "## Relevant Context\n...",
      selectedMemories: [],
      tokenEstimate: 100,
    };
  }
}
```

## Configuration Reference

### MemoryContext
Every strategy receives a `MemoryContext` object during each turn:

| Field | Type | Description |
|---|---|---|
| `messages` | `ReadonlyArray<{role, content}>` | The current conversation history. |
| `currentQuery` | `string` | The latest user message. |
| `totalTokens` | `number` | Estimated total tokens in the current context. |
| `toolCallsSinceExtraction` | `number` | Number of tool calls made since the last extraction. |
| `recentTools` | `string[]` | Names of tools used in recent turns. |
| `signal` | `AbortSignal?` | Cancellation signal for long-running operations. |

### Strategy Comparison

| Strategy | Extraction Trigger | Retrieval Method | LLM Required? |
|---|---|---|---|
| `SessionMemoryExtractor` | Token/Tool thresholds | Pass-through notes | Yes |
| `TopicFileExtractor` | Message frequency | File globbing | Yes |
| `EphemeralBufferStrategy` | Message frequency | Recency | No |
| `LLMRetrievalStrategy` | Configurable | Semantic selection | Yes |
| `RecencyRetrievalStrategy` | Configurable | Chronological | No |

## Common Mistakes
*   **Aggressive Extraction Thresholds:** Setting `minimumTokensBetweenUpdate` too low can lead to excessive LLM API costs and latency, as extraction occurs before the agent responds.
*   **Missing `extractFn`:** Strategies like `SessionMemoryExtractor` require a developer-provided function to call the LLM. Forgetting to handle errors or empty responses in this function can break the memory loop.
*   **Token Limit Oversights:** When using `LLMRetrievalStrategy`, ensure the `maxMemories` setting does not cause the retrieved context to exceed the model's system prompt capacity.

## Next Steps
*   Explore the `MemoryStore` API for implementing custom persistence layers.
*   Learn about **Context Compaction** to understand how memory interacts with message pruning.
*   Review the `DEFAULT_SESSION_MEMORY_TEMPLATE` to customize the structure of extracted notes.