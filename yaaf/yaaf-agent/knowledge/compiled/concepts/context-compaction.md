---
summary: YAAF's mechanism for automatically reducing the token count of conversation messages to stay within an LLM's context window, using pluggable strategies.
title: Context Compaction
entity_type: concept
related_subsystems:
 - Context Management
see_also:
 - "[Context Window](./context-window.md)"
 - "[Token Budget](./token-budget.md)"
 - "[Context Overflow](./context-overflow.md)"
 - "[ContextManager](../apis/context-manager.md)"
 - "[CompactionStrategy](../apis/compaction-strategy.md)"
search_terms:
 - preventing context overflow
 - managing long conversations
 - LLM token limit
 - conversation summarization
 - history truncation
 - sliding window context
 - how to handle large context
 - YAAF context manager
 - automatic context reduction
 - reduce prompt size
 - token budget management
 - SummarizeStrategy
 - MicroCompactStrategy
stub: false
compiled_at: 2026-04-25T00:17:33.542Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/compaction.md
compiled_from_quality: documentation
confidence: 1
---

## What It Is

Context Compaction is the process of reducing the token count of an agent's conversation history to prevent it from exceeding the [LLM](./llm.md)'s [Context Window](./context-window.md) limit [Source 1]. As a conversation with an agent progresses, the list of messages grows, consuming more tokens. Without management, this leads to a [Context Overflow](./context-overflow.md) error from the [LLM](./llm.md) provider, halting the conversation.

YAAF solves this problem with an automated, pluggable compaction system. The [ContextManager](../apis/context-manager.md) subsystem monitors the conversation's [Token Budget](./token-budget.md) and, when usage exceeds a configurable threshold, triggers a compaction process to free up space. This ensures that long-running conversations can continue indefinitely without manual intervention [Source 1].

## How It Works in YAAF

The core of the system is the interaction between the [ContextManager](../apis/context-manager.md) and a configured [CompactionStrategy](../apis/compaction-strategy.md) [Source 1].

The [ContextManager](../apis/context-manager.md) divides the total [Context Window](./context-window.md) into three parts:
1.  **System Sections:** The static [System Prompt](./system-prompt.md) and other fixed context.
2.  **Messages:** The dynamic, growing list of user, assistant, and tool messages.
3.  **Output Reserve:** A buffer of tokens reserved for the [LLM](./llm.md)'s next response (`maxOutputTokens`).

Compaction is triggered automatically when the `Messages` section grows beyond its allocated budget. The [ContextManager](../apis/context-manager.md) then invokes the `compact()` method of the active [CompactionStrategy](../apis/compaction-strategy.md), which receives a `CompactionContext` object containing the current messages, token counts, and helper methods [Source 1]. The strategy's goal is to return a new, smaller list of messages.

### Built-in Strategies

YAAF provides several built-in strategies, allowing developers to balance performance, cost, and context preservation [Source 1]:

| Strategy | LLM Required | Speed | Context Preserved | Best For |
| :--- | :--- | :--- | :--- | :--- |
| `SummarizeStrategy` | Yes | Slow | High (structured summary) | General purpose, high-fidelity fallback. |
| `TruncateStrategy` | No | Instant | Low (oldest messages lost) | Enforcing a hard budget cap with stateless agents. |
| `SlidingWindowStrategy` | No | Instant | Medium (recency bias) | Agents where the most recent context is most important. |
| `MicroCompactStrategy` | No | Instant | High (structure preserved) | A fast, first-pass strategy that clears verbose tool outputs without losing the record of the tool call. |
| `TimeBasedMicroCompactStrategy` | No | Instant | High | Resuming idle conversations where server-side caches have likely expired. |
| `SessionMemoryStrategy` | Yes | Medium | Very High (facts + recent) | Long-running task agents, combining structured fact extraction with verbatim recent history. |
| `CompositeStrategy` | Depends | Depends | Best-effort from chain | Production use, allowing multiple strategies to be chained together. |

### Production Pipeline

For production environments, YAAF recommends a multi-tier approach using a `CompositeStrategy`. This pipeline attempts cheaper, lossless compactions first before falling back to more expensive, lossy methods like full summarization. A typical flow is [Source 1]:

1.  **`TimeBasedMicroCompactStrategy`**: If the agent has been idle for a long time, clear old tool results.
2.  **`MicroCompactStrategy`**: If not time-triggered, still try to clear old tool results to save space. This is a "partial" compaction, so the chain continues.
3.  **`SessionMemoryStrategy`**: Attempt to extract key facts and retain recent messages.
4.  **`SummarizeStrategy`**: As a final fallback, perform a full [LLM](./llm.md)-based summarization of the entire history.

This layered approach, available via the `defaultCompactionPipeline` factory function, provides a robust balance of performance and context fidelity [Source 1].

## Configuration

YAAF offers both a simple "auto" mode and full manual control over context compaction.

### Auto Mode (Recommended)

The simplest way to enable context management is by setting `contextManager: 'auto'` when creating an `Agent`. YAAF will automatically instantiate and configure a [ContextManager](../apis/context-manager.md) using specifications from its built-in Model Specs Registry. This enables proactive compaction, emergency overflow recovery, and continuation for responses that hit the model's output limit [Source 1].

```typescript
import { Agent } from 'yaaf';

// YAAF looks up gpt-4o's specs and configures the ContextManager automatically.
const agent = new Agent({
  model: 'gpt-4o',
  contextManager: 'auto',
  systemPrompt: 'You are a helpful assistant.',
});
```

### Manual Configuration

For full control, a developer can instantiate [ContextManager](../apis/context-manager.md) directly and pass it to the agent. This allows for custom strategies, token limits, and other advanced settings [Source 1].

```typescript
import { Agent, ContextManager, SummarizeStrategy } from 'yaaf';

const agent = new Agent({
  model: 'gpt-4o',
  contextManager: new ContextManager({
    contextWindowTokens: 128_000,
    maxOutputTokens: 16_384,
    strategy: new SummarizeStrategy(),
    llmAdapter: myModel, // Required for strategies that use an LLM
  }),
});
```

### Model Specs Registry

YAAF includes a registry of [Context Window](./context-window.md) and `maxOutputTokens` limits for over 40 common [LLM](./llm.md) models from providers like OpenAI, Google, and Anthropic. This registry is used by the `'auto'` mode. Developers can also query it directly or extend it with specifications for private or fine-tuned models [Source 1].

```typescript
import { registerModelSpecs, resolveModelSpecs } from 'yaaf';

// Register a private model
registerModelSpecs('my-fine-tuned-llama', {
  contextWindowTokens: 32_000,
  maxOutputTokens: 4_096,
});

// Query the registry
const specs = resolveModelSpecs('gpt-4o');
// → { contextWindowTokens: 128_000, maxOutputTokens: 16_384 }
```

### Custom Strategies

Developers can implement the [CompactionStrategy](../apis/compaction-strategy.md) interface to create custom compaction logic tailored to their agent's needs. A custom strategy must implement a `name` property and an `async compact()` method [Source 1].

```typescript
import type {
  CompactionStrategy,
  CompactionContext,
  StrategyResult,
} from 'yaaf';

class KeyMessageStrategy implements CompactionStrategy {
  readonly name = 'key-message';

  // Optional: define when this strategy can be applied
  canApply(ctx: CompactionContext): boolean {
    return ctx.messages.length > 20;
  }

  async compact(ctx: CompactionContext): Promise<StrategyResult | null> {
    // Keep only messages containing code blocks
    const keyMessages = ctx.messages.filter(m =>
      (typeof m.content === 'string' && m.content.includes('```'))
    );

    if (keyMessages.length >= ctx.messages.length) return null; // No change

    return {
      messages: keyMessages,
      summary: `[Key-message: Kept messages with code blocks]`,
      messagesRemoved: ctx.messages.length - keyMessages.length,
      tokensFreed: /* ... calculate token difference ... */,
    };
  }
}
```

## Sources

[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/compaction.md