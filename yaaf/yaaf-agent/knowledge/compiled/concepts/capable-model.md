---
summary: A designation within YAAF's Model Routing subsystem for a powerful, often slower and more expensive, LLM used for complex reasoning tasks.
primary_files:
 - src/models/router.ts
title: Capable Model
entity_type: concept
related_subsystems:
 - Model Routing
see_also:
 - "[Model Routing](./model-routing.md)"
 - "[Fast Model](./fast-model.md)"
 - "[Cost Optimization](./cost-optimization.md)"
 - "[RouterChatModel](../apis/router-chat-model.md)"
search_terms:
 - powerful LLM
 - expensive model
 - complex reasoning model
 - model for complex tasks
 - what is a capable model
 - fast vs capable model
 - model routing tiers
 - high-capability LLM
 - production model selection
 - gpt-4o vs gpt-4o-mini
 - gemini pro vs flash
 - disabling model routing
 - alwaysCapable function
stub: false
compiled_at: 2026-04-25T00:17:03.628Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

A **Capable Model** is a designation within YAAF for a large language model ([LLM](./llm.md)) that exhibits high performance on complex reasoning, instruction following, and multi-step tasks. These models are typically more powerful, slower, and more expensive to operate than their [Fast Model](./fast-model.md) counterparts [Source 1].

The concept is central to the [Model Routing](./model-routing.md) subsystem, which aims to optimize for both cost and performance. By defining two tiers of models—a fast, cheap one for simple tasks and a capable, expensive one for complex tasks—the system can dynamically select the appropriate model for a given [LLM Call](./llm-call.md). This strategy can significantly reduce operational costs, often by a factor of 3-7x, with negligible impact on output quality [Source 1].

## How It Works in YAAF

In YAAF, the Capable Model is configured as part of the [RouterChatModel](../apis/router-chat-model.md), a specialized `ChatModel` implementation that performs two-tier routing. The developer provides an instance of a powerful model (e.g., `gemini-2.0-pro` or `gpt-4o`) to the `capable` property of the [RouterConfig](../apis/router-config.md) [Source 1].

The [RouterChatModel](../apis/router-chat-model.md)'s routing logic decides when to invoke the Capable Model. The default heuristic routes a request to the `capable` model under the following conditions [Source 1]:
- The number of available [tools](./tool-calls.md) is high (e.g., more than 5).
- The conversation history is long (e.g., more than 12 messages).
- The content of the latest message contains keywords suggesting a complex task, such as "plan," "architect," "design," or "refactor."

Developers can override this default behavior by supplying a custom `route` function in the [RouterConfig](../apis/router-config.md). This allows for fine-grained control over the trade-off between cost, speed, and reasoning quality [Source 1].

For scenarios where maximum quality is always required, such as in certain production environments or during debugging, YAAF provides the [alwaysCapable](../apis/always-capable.md) helper function. This function configures a [RouterChatModel](../apis/router-chat-model.md) to bypass the routing logic and send all requests directly to the Capable Model [Source 1].

## Configuration

A Capable Model is specified during the instantiation of a [RouterChatModel](../apis/router-chat-model.md).

```typescript
import { RouterChatModel } from 'yaaf/models';
import { GeminiChatModel } from 'yaaf/providers/gemini';
import { openaiModel } from 'yaaf/providers/openai';

// Example using Gemini models
const modelWithGemini = new RouterChatModel({
  fast: new GeminiChatModel({ model: 'gemini-2.0-flash' }),
  capable: new GeminiChatModel({ model: 'gemini-2.0-pro' }), // The capable model
});

// Example using OpenAI models and a custom routing function
const modelWithOpenAI = new RouterChatModel({
  fast: openaiModel('gpt-4o-mini'),
  capable: openaiModel('gpt-4o'), // The capable model
  route: ({ messages, tools }) => {
    // Custom logic to decide when to use the capable model
    if ((tools?.length ?? 0) > 5) return 'capable';
    if (messages.length > 20) return 'capable';
    return 'fast';
  },
});
```
[Source 1]

To disable routing and always use the Capable Model, the [alwaysCapable](../apis/always-capable.md) helper can be used:

```typescript
import { alwaysCapable } from 'yaaf/models';
import { openaiModel } from 'yaaf/providers/openai';

// This router will always use 'gpt-4o' and never the fast model.
const productionModel = alwaysCapable(openaiModel('gpt-4o'));
```
[Source 1]

## See Also

- [Model Routing](./model-routing.md): The subsystem that utilizes Fast and Capable Models.
- [Fast Model](./fast-model.md): The counterpart to the Capable Model, used for simpler, less expensive tasks.
- [Cost Optimization](./cost-optimization.md): The primary goal of the [Model Routing](./model-routing.md) strategy.
- [RouterChatModel](../apis/router-chat-model.md): The API that implements the routing logic.
- [alwaysCapable](../apis/always-capable.md): The helper function to force the use of the Capable Model.

## Sources

[Source 1]: src/models/router.ts