---
summary: How to build and configure custom memory extraction and retrieval logic for specialized agent requirements.
title: Implementing a Custom Memory Strategy
entity_type: guide
difficulty: intermediate
stub: false
compiled_at: 2026-04-16T14:30:24.408Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/memory/strategies.ts
confidence: 0.9
---

## Overview
YAAF provides a pluggable architecture for managing persistent memory across conversations. While the framework includes built-in strategies like `SessionMemoryExtractor` and `LLMRetrievalStrategy`, developers can implement custom strategies to control exactly when knowledge is persisted and how it is retrieved for the LLM's context.

This guide walks through implementing the `MemoryStrategy` interface, which combines two distinct responsibilities:
1.  **Extraction**: Deciding when and how to save information from the current conversation.
2.  **Retrieval**: Deciding which stored memories are relevant to the current turn and how to format them for the system prompt.

## Step-by-Step

### 1. Define the Strategy Structure
A custom memory strategy must implement the `MemoryStrategy` interface, which is a combination of `MemoryExtractionStrategy` and `MemoryRetrievalStrategy`.

```typescript
import { 
  MemoryStrategy, 
  MemoryContext, 
  ExtractionResult, 
  RetrievalResult 
} from './memory/strategies';

export class MyCustomStrategy implements MemoryStrategy {
  readonly name = 'MyCustomStrategy';

  async initialize(): Promise<void> {
    // Setup logic (e.g., opening database connections)
  }

  async destroy(): Promise<void> {
    // Cleanup logic
  }
}
```

### 2. Implement Extraction Logic
The extraction layer uses a "trigger policy" to avoid running expensive LLM extraction calls on every turn. You must implement `shouldExtract` to evaluate the context and `extract` to perform the actual persistence.

```typescript
export class MyCustomStrategy implements MemoryStrategy {
  // ... (previous code)

  /**
   * Trigger extraction every 5 tool calls or if tokens exceed a threshold.
   */
  shouldExtract(ctx: MemoryContext): boolean {
    return ctx.toolCallsSinceExtraction >= 5 || ctx.totalTokens > 10000;
  }

  /**
   * Process the conversation and save facts.
   */
  async extract(ctx: MemoryContext): Promise<ExtractionResult> {
    // Example: Logic to summarize the last few messages
    const lastMessage = ctx.messages[ctx.messages.length - 1];
    
    // Perform your extraction logic here...

    return {
      extracted: true,
      summary: "Extracted user preferences regarding project structure.",
      factsExtracted: 1,
      tokenCost: 150 // Optional: track usage
    };
  }
}
```

### 3. Implement Retrieval Logic
The retrieval layer is called during the prompt-building phase. It selects relevant memories and formats them into a string that YAAF injects into the agent's system prompt.

```typescript
export class MyCustomStrategy implements MemoryStrategy {
  // ... (previous code)

  async retrieve(ctx: MemoryContext): Promise<RetrievalResult> {
    // Use ctx.currentQuery to find relevant data
    const relevantContent = "User prefers TypeScript over JavaScript.";

    return {
      systemPromptSection: `### Relevant Context\n${relevantContent}`,
      selectedMemories: [
        { name: "pref_lang", content: relevantContent, relevanceScore: 0.9 }
      ],
      tokenEstimate: 20 // Approximate tokens used by the section
    };
  }
}
```

### 4. Compose Strategies (Optional)
If you only need to customize one half of the process, use the `CompositeMemoryStrategy`. This allows you to mix a custom extractor with a built-in retriever, or vice versa.

```typescript
import { 
  CompositeMemoryStrategy, 
  LLMRetrievalStrategy 
} from './memory/strategies';

const strategy = new CompositeMemoryStrategy({
  extraction: new MyCustomExtractor(), // Your custom class
  retrieval: new LLMRetrievalStrategy({ 
    store: myStore, 
    queryFn: myLLMQuery 
  })
});
```

### 5. Register the Strategy with an Agent
Pass the strategy instance into the `Agent` configuration.

```typescript
const agent = new Agent({
  name: "MemoryAgent",
  memory: new MyCustomStrategy(),
  // ... other config
});
```

## Configuration Reference

### MemoryContext
The `MemoryContext` object is provided to both extraction and retrieval methods to provide state without coupling to the internal context manager.

| Field | Type | Description |
|-------|------|-------------|
| `messages` | `ReadonlyArray` | Current conversation history (role, content, timestamp). |
| `currentQuery` | `string` | The user's most recent input. |
| `totalTokens` | `number` | Estimated total tokens in the conversation. |
| `toolCallsSinceExtraction` | `number` | Counter of tool executions since the last successful extraction. |
| `recentTools` | `readonly string[]` | Names of tools used in recent turns. |
| `signal` | `AbortSignal` | Signal to handle request cancellation. |

### ExtractionResult
| Field | Type | Description |
|-------|------|-------------|
| `extracted` | `boolean` | Whether the extraction operation was performed. |
| `summary` | `string` | (Optional) Human-readable summary of the operation. |
| `factsExtracted` | `number` | (Optional) Count of new items stored. |

### RetrievalResult
| Field | Type | Description |
|-------|------|-------------|
| `systemPromptSection` | `string` | The actual text to be injected into the LLM prompt. |
| `selectedMemories` | `Array` | Metadata about the specific memories retrieved. |
| `tokenEstimate` | `number` | Estimated token count of the `systemPromptSection`. |

## Common Mistakes
*   **Infinite Extraction Loops**: If `shouldExtract` returns true but `extract` fails to reset the counters (like `toolCallsSinceExtraction`), the agent may attempt to extract on every subsequent turn.
*   **Exceeding Token Budgets**: Retrieval strategies should be "token-aware." If the `systemPromptSection` is too large, it may cause the primary LLM call to fail or truncate important conversation history.
*   **Blocking the Main Loop**: Memory extraction often involves background LLM calls. Ensure extraction logic is non-blocking or properly awaited to prevent UI/UX lag in interactive agents.

## Next Steps
*   **Memory Stores**: Learn how to implement a custom `MemoryStore` for persisting data to databases or specialized file formats.
*   **Relevance Engines**: Explore using the `MemoryRelevanceEngine` for semantic search within your retrieval logic.