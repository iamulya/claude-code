---
summary: The limited input and output capacity of an LLM, measured in tokens, which must be managed to prevent truncation of important information like prompts, history, and tool results.
title: Context Window
entity_type: concept
see_also:
 - "[Context Window Management](./context-window-management.md)"
 - "[Context Overflow](./context-overflow.md)"
 - "[Token Budget](./token-budget.md)"
 - "[Tool Result Budget](./tool-result-budget.md)"
 - "[Token Estimation](./token-estimation.md)"
search_terms:
 - LLM input limit
 - token limit
 - managing prompt size
 - context length
 - how to avoid context overflow
 - tool result truncation
 - max tokens
 - model input capacity
 - prompt is too long
 - context blowout
 - input token budget
 - output token limit
stub: false
compiled_at: 2026-04-25T00:17:34.839Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/tools.md
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/openai.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

The context window is the maximum number of tokens a Large Language Model ([LLM](./llm.md)) can process in a single request. This limit encompasses all inputs—such as the [System Prompt](./system-prompt.md), user query, conversation history, and [tool results](./tool-results.md)—as well as the generated output.

It is a fundamental constraint of most LLM architectures. If the total number of tokens in a request exceeds the model's context window, the provider will typically return an error, or the input will be truncated. This leads to a loss of information and can significantly degrade the agent's performance and reasoning capabilities. Effective [Context Window Management](./context-window-management.md) is crucial for building robust and reliable agents.

## How It Works in YAAF

YAAF provides several mechanisms to manage this limited resource and prevent [Context Overflow](./context-overflow.md).

The total size of the context window is a property of the specific LLM being used and is configured at the adapter level. For instance, the [OpenAIModelConfig](../apis/open-ai-model-config.md) for OpenAI-compatible models allows a developer to explicitly set the `contextWindowTokens` for a given model [Source 2].

To manage the consumption of this space during an agent's operation, YAAF employs strategies like budgeting for tool outputs. The [Tool Result Budget](./tool-result-budget.md) concept allows developers to set limits on the size of data returned from tools. This feature can automatically truncate older or excessively large results to ensure there is enough space remaining in the context window for the LLM to reason and generate a response [Source 1].

## Configuration

Developers can configure context window parameters at both the model and agent levels.

### Model-Level Configuration

When initializing an LLM adapter, the context window size for the specific model can be set.

```typescript
// Source: src/models/openai.ts
import { OpenAIChatModel } from 'yaaf';

// Configure a model with a specific context window size
const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
  /** Context window size in tokens (default: 128_000) */
  contextWindowTokens: 128000,
  /** Maximum output tokens per completion (default: 4_096) */
  maxOutputTokens: 4096,
});
```
[Source 2]

### Agent-Level Management

Within an agent's definition, a `toolResultBudget` can be configured to manage how much context space is consumed by the outputs of tools.

```typescript
// Source: docs/tools.md
import { Agent } from 'yaaf';

const agent = new Agent({
  tools: [/* ... */],
  systemPrompt: '...',
  // Truncate old tool results to save context space
  toolResultBudget: {
    maxCharsPerResult: 5000,
    maxTotalChars: 20000,
    strategy: 'truncate-oldest',
  },
});
```
[Source 1]

## Sources
[Source 1]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/docs/tools.md
[Source 2]: /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/openai.ts