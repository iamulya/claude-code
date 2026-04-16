---
summary: The process of monitoring token usage and reducing conversation history size to stay within model limits.
title: Context Compaction
entity_type: concept
related_subsystems:
  - ContextManager
stub: false
compiled_at: 2026-04-16T14:06:04.866Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/compaction.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/docs/doctor.md
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/compactionPrompts.ts
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/context/strategies.ts
confidence: 1
---

## What It Is

Context Compaction is the mechanism used to manage an LLM's finite context window by strategically reducing the size of the conversation history. As a conversation grows, the token count eventually approaches the model's limit. Compaction prevents "context-too-large" errors and maintains performance by summarizing, truncating, or clearing less relevant data before the limit is reached.

In YAAF, compaction is a pluggable and automated process. It ensures that agents can maintain long-running sessions by keeping the most relevant information within the model's "effective limit"—the total context window minus the required output reserve and static system prompts.

## How It Works in YAAF

The `ContextManager` is the primary subsystem responsible for monitoring the token budget. It tracks the current message history and triggers a `CompactionStrategy` when usage exceeds a configurable threshold.

### Model Specs Registry
YAAF includes a built-in registry of context and output token limits for over 40 models, including OpenAI GPT-4o, Anthropic Claude 3.5, Google Gemini, and Meta Llama. When an agent is configured with `contextManager: 'auto'`, YAAF automatically:
- Resolves the correct `contextWindowTokens` and `maxOutputTokens` for the model.
- Enables proactive compaction before the context fills.
- Provides emergency overflow recovery if the API returns a context-related error.
- Handles max-output-token continuations if a response is cut off.

### Compaction Strategies
Compaction logic is encapsulated in strategies implementing the `CompactionStrategy` interface. Strategies receive a `CompactionContext` (containing messages, token estimates, and limits) and return a `StrategyResult` (containing the reduced message set and metadata).

YAAF provides several built-in strategies:

| Strategy | Mechanism | LLM Required |
| :--- | :--- | :--- |
| **SummarizeStrategy** | Replaces history with a structured 9-section summary. | Yes |
| **TruncateStrategy** | Drops the oldest N% of messages. | No |
| **SlidingWindowStrategy** | Keeps the most recent messages that fit a token fraction. | No |
| **MicroCompactStrategy** | Clears content of old tool results but keeps message structure. | No |
| **TimeBasedMicroCompactStrategy** | Micro-compacts only after a specific idle duration (e.g., 60 min). | No |
| **SessionMemoryStrategy** | Extracts facts into memory and keeps only recent messages. | Yes |
| **CompositeStrategy** | Chains multiple strategies (e.g., Micro-Compact → Summarize). | Optional |

### The Production Pipeline
The recommended production setup uses a `CompositeStrategy` to perform multi-tier compaction. For example, it may first attempt a "partial" compaction (like `MicroCompactStrategy`) to save tokens without losing information, and then fall back to a full `SummarizeStrategy` if the token count remains too high.

## Configuration

### Auto Mode
The simplest way to enable compaction is using the `'auto'` configuration, which leverages the Model Specs Registry.

```typescript
import { Agent } from 'yaaf';

const agent = new Agent({
  model: 'gpt-4o',
  contextManager: 'auto',
  systemPrompt: 'You are a helpful assistant.',
});
```

### Manual Configuration
Developers can manually define the `ContextManager` and its strategy for fine-grained control.

```typescript
import { Agent, ContextManager, SummarizeStrategy } from 'yaaf';

const agent = new Agent({
  model: 'gpt-4o',
  contextManager: new ContextManager({
    contextWindowTokens: 128_000,
    maxOutputTokens: 16_384,
    strategy: new SummarizeStrategy({
      additionalInstructions: 'Always preserve TypeScript type signatures.',
    }),
  }),
});
```

### Custom Strategy Implementation
Custom strategies can be created by implementing the `CompactionStrategy` interface.

```typescript
import type {
  CompactionStrategy,
  CompactionContext,
  StrategyResult,
} from 'yaaf';

class KeyMessageStrategy implements CompactionStrategy {
  readonly name = 'key-message';

  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    // Keep only messages containing code blocks
    const keyMessages = ctx.messages.filter(m =>
      typeof m.content === 'string' && m.content.includes('```')
    );

    if (keyMessages.length >= ctx.messages.length) return null;

    return {
      messages: keyMessages,
      summary: `[Removed ${ctx.messages.length - keyMessages.length} non-code messages]`,
      messagesRemoved: ctx.messages.length - keyMessages.length,
      tokensFreed: ctx.totalTokens - 1000, // Simplified estimate
    };
  }
}
```

## See Also
- `ContextManager`
- `SummarizeStrategy`
- `CompositeStrategy`
- `Model Specs Registry`