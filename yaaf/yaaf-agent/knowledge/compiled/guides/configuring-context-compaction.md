---
summary: How to set up automatic or manual context management and compaction strategies for YAAF agents.
title: Configuring Context Compaction
entity_type: guide
stub: false
compiled_at: 2026-04-16T14:06:16.117Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/compaction.md
confidence: 1
---

---
title: Configuring Context Compaction
entity_type: guide
summary: How to set up automatic or manual context management and compaction strategies for YAAF agents.
difficulty: intermediate

## Overview
As conversations with Large Language Models (LLMs) grow, the message history eventually approaches the model's context limit. YAAF provides a `ContextManager` subsystem that monitors the token budget and triggers **compaction**—the process of reducing the message history size—when usage exceeds a configurable threshold.

This guide covers how to implement zero-config automatic compaction, how to manually configure specific compaction strategies, and how to build multi-tier production pipelines.

## Prerequisites
- A YAAF project with an `Agent` initialized.
- An LLM provider configured (required for summarization-based strategies).

## Step-by-Step

### 1. Using Zero-Config (Auto Mode)
The simplest way to manage context is to use the `'auto'` setting. In this mode, YAAF looks up the model's specifications in its built-in registry to determine the context window and output token limits.

```typescript
import { Agent } from 'yaaf';

// YAAF resolves gpt-4o's specs (128K context, 16K output) automatically.
const agent = new Agent({
  model: 'gpt-4o',
  contextManager: 'auto',
  systemPrompt: 'You are a helpful assistant.',
});
```

In `'auto'` mode, the framework enables:
- **Proactive compaction**: Reducing context before the limit is reached.
- **Emergency overflow recovery**: Handling API errors if the context becomes too large.
- **Continuation**: Managing responses that are cut off by the `maxOutputTokens` limit.

### 2. Manual Configuration
For fine-grained control, you can instantiate a `ContextManager` manually. This is necessary when using custom models or specific compaction strategies.

```typescript
import { Agent, ContextManager, SummarizeStrategy } from 'yaaf';

const agent = new Agent({
  model: 'gpt-4o',
  contextManager: new ContextManager({
    contextWindowTokens: 128_000,
    maxOutputTokens: 16_384,
    strategy: new SummarizeStrategy(),
    llmAdapter: myModel, // Required for strategies that use LLM calls
  }),
});
```

### 3. Selecting a Compaction Strategy
YAAF includes several built-in strategies with different trade-offs regarding speed and context preservation:

| Strategy | LLM Required | Description |
| :--- | :--- | :--- |
| `SummarizeStrategy` | Yes | Replaces messages with a structured 9-section summary. |
| `TruncateStrategy` | No | Drops the oldest N% of messages instantly. |
| `SlidingWindowStrategy` | No | Retains a fraction of the most recent messages. |
| `MicroCompactStrategy` | No | Clears verbose tool outputs while keeping message structure. |
| `TimeBasedMicroCompactStrategy` | No | Fires Micro-Compact only after a specific idle duration. |
| `SessionMemoryStrategy` | Yes | Extracts facts and keeps recent messages verbatim. |
| `CompositeStrategy` | Varies | Chains multiple strategies together. |

### 4. Implementing a Production Pipeline
A recommended production setup uses a multi-tier approach via `CompositeStrategy`. This allows the agent to attempt "cheap" compaction (like clearing tool results) before resorting to "expensive" LLM-based summarization.

```typescript
import {
  ContextManager,
  CompositeStrategy,
  TimeBasedMicroCompactStrategy,
  MicroCompactStrategy,
  SessionMemoryStrategy,
  SummarizeStrategy,
  defaultCompactionPipeline,
} from 'yaaf';

// Option A: Using the built-in factory
const ctx = new ContextManager({
  contextWindowTokens: 200_000,
  maxOutputTokens: 16_384,
  llmAdapter: myModel,
  strategy: defaultCompactionPipeline({
    summarizeInstructions: 'Always preserve TypeScript type signatures.',
  }),
});

// Option B: Manual composition
const strategy = new CompositeStrategy([
  new TimeBasedMicroCompactStrategy({ gapThresholdMinutes: 60 }),
  new MicroCompactStrategy({ keepRecent: 5 }),
  new SessionMemoryStrategy({ extractMemory: myExtractor }),
  new SummarizeStrategy({ additionalInstructions: '...' }),
], { continueAfterPartial: true });
```

### 5. Creating a Custom Strategy
To create a custom strategy, implement the `CompactionStrategy` interface.

```typescript
import type {
  CompactionStrategy,
  CompactionContext,
  StrategyResult,
} from 'yaaf';

class KeyMessageStrategy implements CompactionStrategy {
  readonly name = 'key-message';

  canApply(ctx: CompactionContext): boolean {
    return ctx.messages.length > 20;
  }

  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    // Keep only messages containing code blocks or tool calls
    const keyMessages = ctx.messages.filter(m =>
      (typeof m.content === 'string' && m.content.includes('```')) ||
      m.role === 'tool_result'
    );

    if (keyMessages.length >= ctx.messages.length) return null;

    const removed = ctx.messages.length - keyMessages.length;
    const postTokens = keyMessages.reduce(
      (sum, m) => sum + ctx.estimateTokens(
        typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      ),
      0,
    );

    return {
      messages: keyMessages,
      summary: `[Key-message: ${removed} context messages removed]`,
      messagesRemoved: removed,
      tokensFreed: ctx.totalTokens - postTokens,
    };
  }
}
```

## Configuration Reference

### Model Specs Registry
YAAF maintains a registry for over 40 model families (OpenAI, Anthropic, Google, Meta, etc.). You can extend this registry for private or fine-tuned models:

```typescript
import { registerModelSpecs, resolveModelSpecs } from 'yaaf';

registerModelSpecs('my-fine-tuned-llama', {
  contextWindowTokens: 32_000,
  maxOutputTokens: 4_096,
});

const specs = resolveModelSpecs('gpt-4o');
// Returns { contextWindowTokens: 128_000, maxOutputTokens: 16_384 }
```

### ContextManager Options
| Option | Type | Description |
| :--- | :--- | :--- |
| `contextWindowTokens` | `number` | Total tokens allowed by the model. |
| `maxOutputTokens` | `number` | Tokens reserved for the model's response. |
| `strategy` | `CompactionStrategy` | The algorithm used to reduce context. |
| `llmAdapter` | `LLMAdapter` | Required for strategies performing LLM calls. |

## Common Mistakes
1. **Missing LLM Adapter**: Attempting to use `SummarizeStrategy` or `SessionMemoryStrategy` without providing an `llmAdapter` to the `ContextManager`.
2. **Ignoring Output Reserve**: Setting `contextWindowTokens` to the model's maximum without subtracting `maxOutputTokens`, which can lead to immediate context overflow when the model generates a response.
3. **Aggressive Truncation**: Using a `TruncateStrategy` with a high `dropRatio` in complex reasoning tasks, which may cause the agent to lose critical instructions or early task requirements.

## Next Steps
- Explore the **Model Specs Registry** to see supported models.
- Learn about **LLM Adapters** to understand how strategies communicate with models.
- Review **Agent Configuration** for other memory management options.