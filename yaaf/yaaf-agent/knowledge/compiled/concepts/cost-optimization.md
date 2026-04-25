---
title: Cost Optimization
entity_type: concept
summary: A strategy in YAAF to reduce LLM operational costs by routing requests between a fast, inexpensive model and a more capable, expensive model based on task complexity.
search_terms:
 - reduce LLM costs
 - model routing
 - two-tier model strategy
 - fast and capable models
 - RouterChatModel
 - how to save money on LLM calls
 - cheap vs expensive models
 - dynamic model selection
 - conditional model usage
 - Gemini Flash vs Pro
 - gpt-4o-mini vs gpt-4o
 - cost-effective agent
stub: false
compiled_at: 2026-04-24T17:54:09.735Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Cost Optimization in YAAF refers to the practice of minimizing the operational expenses of running [LLM](./llm.md)-powered agents by intelligently selecting the most appropriate model for a given task. The primary strategy employed is a two-tier [Model Routing](./model-routing.md) system that distinguishes between simple, routine tasks and complex reasoning tasks [Source 1].

This approach utilizes two types of models:
*   A **[Fast Model](./fast-model.md)**: A cheaper, faster model suitable for simple requests, such as straightforward [Tool Calls](./tool-calls.md).
*   A **[Capable Model](./capable-model.md)**: A more powerful, expensive model reserved for complex tasks that require deep reasoning, planning, or architectural thinking.

By routing the majority of simple requests to the fast model, this strategy can significantly reduce overall costs, typically by a factor of 3-7x, with negligible impact on the agent's overall performance and quality [Source 1].

## How It Works in YAAF

YAAF implements this strategy through the `RouterChatModel` class. This class conforms to the standard `ChatModel` interface but internally manages two distinct model instances: one designated as `fast` and the other as `capable` [Source 1].

Before every call to the LLM, `RouterChatModel` executes a routing function to decide which underlying model to use. This function receives a `RouterContext` object containing the current `messages`, available `[[[[[[[[Tools]]]]]]]]`, and the `iteration` number [Source 1].

By default, `RouterChatModel` uses a built-in heuristic for its routing decision:
*   It selects the **'capable'** model if the number of Tools is greater than 5, the number of messages exceeds 12, or the user's message content contains keywords related to planning or architecture (e.g., "plan", "design").
*   Otherwise, it defaults to the **'fast'** model [Source 1].

This routing logic is fully customizable. Developers can provide their own `route` function to implement logic tailored to their specific use case. For [Observability](./observability.md), an optional `onRoute` callback can be configured to log or monitor each routing decision [Source 1].

The framework also provides helper functions for scenarios where dynamic routing is not desired:
*   `alwaysCapable()`: Forces all requests to use the capable model, useful for production environments where performance is prioritized over cost.
*   `alwaysFast()`: Forces all requests to use the fast model, useful for rapid development and testing [Source 1].

## Configuration

A developer can configure model routing by instantiating a `RouterChatModel` with `fast` and `capable` model instances.

### Basic Configuration

This example sets up a router with two different Gemini models. It will use the default routing heuristic.

```typescript
const model = new RouterChatModel({
  fast: new GeminiChatModel({ model: 'gemini-2.0-flash' }),
  capable: new GeminiChatModel({ model: 'gemini-2.0-pro' }),
});
```
[Source 1]

### Custom Routing Logic

This example demonstrates providing a custom `route` function to override the default behavior. The logic routes to the capable model for requests with many tools, long conversation histories, or specific keywords.

```typescript
const model = new RouterChatModel({
  fast: openaiModel('gpt-4o-mini'),
  capable: openaiModel('gpt-4o'),
  route: ({ messages, tools }) => {
    // Use capable model when: many tools, long context, or complex ask
    if ((tools?.length ?? 0) > 5) return 'capable';
    if (messages.length > 20) return 'capable';
    const lastMsg = messages.at(-1)?.content ?? '';
    if (/plan|architect|design|refactor/i.test(lastMsg)) return 'capable';
    return 'fast';
  },
});
```
[Source 1]

## Sources
[Source 1] src/models/router.ts