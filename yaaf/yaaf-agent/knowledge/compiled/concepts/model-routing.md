---
primary_files:
 - src/models/router.ts
title: Model Routing
entity_type: concept
summary: A cost-optimization strategy that dynamically routes LLM calls between a fast, inexpensive model and a more capable, expensive model based on task complexity.
related_subsystems:
 - models
search_terms:
 - cost optimization for LLMs
 - cheap vs expensive models
 - two-tier model strategy
 - dynamic model selection
 - routing LLM calls
 - how to reduce agent costs
 - fast and capable models
 - RouterChatModel
 - conditional model usage
 - smart model switching
 - YAAF cost savings
 - alwaysCapable
 - alwaysFast
stub: false
compiled_at: 2026-04-24T17:58:51.213Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts
compiled_from_quality: unknown
confidence: 0.95
---

## What It Is

Model Routing is a cost-optimization pattern in YAAF that employs a two-tier system for handling [LLM](./llm.md) requests. It directs simple, routine tasks to a fast and inexpensive model, while reserving a more powerful and expensive model for complex reasoning and planning [Source 1].

This approach aims to significantly reduce operational costs with minimal impact on the agent's overall performance. By intelligently selecting the right model for the job, it can achieve cost reductions of 3-7x, particularly [when](../apis/when.md) there is a significant price difference (e.g., a 10:1 ratio) between the "fast" and "capable" models [Source 1].

## How It Works in YAAF

The core implementation of this concept is the `RouterChatModel` class, which conforms to the standard `ChatModel` interface, making it a drop-in replacement for any single model [Source 1].

Before every [LLM Call](./llm-call.md), a routing function is invoked. This function analyzes the current `RouterContext`, which includes the message history (`messages`), available [Tools](../subsystems/tools.md) (`tools`), and the current agent `iteration` number. Based on this context, it returns a `RoutingDecision`: either `"fast"` or `"capable"` [Source 1]. The `RouterChatModel` then delegates the call to the corresponding underlying model instance.

YAAF provides a default routing heuristic [Source 1]:
*   **"Capable" model is used if:**
    *   The number of tools is greater than 5.
    *   The number of messages in the context is greater than 12.
    *   The user's message contains keywords related to complex tasks like "plan," "architect," "design," or "refactor."
*   **"Fast" model is used otherwise.**

For [Observability](./observability.md), an optional `onRoute` callback can be configured to log or monitor the routing decisions made by the system [Source 1].

The framework also includes helper functions for specific scenarios:
*   `alwaysCapable(capableModel)`: Creates a `RouterChatModel` that always uses the [Capable Model](./capable-model.md), effectively disabling routing. This is useful for production environments where performance is prioritized over cost, without requiring changes to the agent's code [Source 1].
*   `alwaysFast(fastModel)`: Creates a `RouterChatModel` that always uses the [Fast Model](./fast-model.md). This is useful for rapid development and testing where cost and speed are primary concerns [Source 1].

## Configuration

A `RouterChatModel` is configured by providing instances for the `fast` and `capable` models. The routing logic can be customized with a `route` function.

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

This example demonstrates a custom routing function that overrides the default behavior. The capable model is selected if there are many tools, the message history is long, or the user's prompt contains specific keywords.

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
[Source 1]: src/models/router.ts