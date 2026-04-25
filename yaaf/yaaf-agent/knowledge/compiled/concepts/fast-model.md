---
title: Fast Model
entity_type: concept
summary: A designation for a lower-cost, higher-speed Large Language Model (LLM) used for simpler, less computationally intensive tasks within the YAAF framework.
related_subsystems:
 - core.models
 - core.memory
see_also:
 - "[Model Routing](./model-routing.md)"
 - "[Capable Model](./capable-model.md)"
 - "[Cost Optimization](./cost-optimization.md)"
 - "[RouterChatModel](../apis/router-chat-model.md)"
 - "[MemoryRelevanceEngine](../apis/memory-relevance-engine.md)"
search_terms:
 - cheap LLM
 - fast LLM
 - model routing strategy
 - cost optimization for agents
 - capable model vs fast model
 - gemini flash
 - gpt-4o-mini
 - how to reduce LLM costs
 - two-tier model strategy
 - low latency model
 - simple agent tasks
 - RouterChatModel configuration
stub: false
compiled_at: 2026-04-25T00:19:19.012Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/memory/relevance.ts
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts
compiled_from_quality: unknown
confidence: 1
---

## What It Is

A "Fast Model" is a category of [LLM](./llm.md) characterized by lower cost, higher speed, and typically reduced reasoning capabilities compared to its [Capable Model](./capable-model.md) counterpart [Source 2].

This distinction is a core principle for [Cost Optimization](./cost-optimization.md) within YAAF. Many tasks performed by an agent, such as simple tool selection, data classification, or preliminary content filtering, do not require the full power of a state-of-the-art model. By delegating these simpler tasks to a fast model, an agent can significantly reduce operational costs and response latency [Source 2]. The trade-off for this efficiency is that fast models are generally less suitable for complex, multi-step reasoning, planning, or architectural design tasks [Source 2].

## How It Works in YAAF

YAAF primarily leverages fast models through a strategy called [Model Routing](./model-routing.md), which is implemented by the [RouterChatModel](../apis/router-chat-model.md) API [Source 2]. This component acts as a switch, directing requests to one of two underlying models: a `fast` model and a `capable` model.

Before each [LLM Call](./llm-call.md), a routing function evaluates the request context. A default heuristic routes the request based on factors like the number of tools provided, the length of the message history, and the presence of keywords indicating complex reasoning (e.g., "plan," "architect," "design"). If the task is deemed simple, it is sent to the fast model; otherwise, it is routed to the capable model [Source 2]. This dynamic selection allows the system to balance cost and performance on a per-task basis.

A concrete application of this concept is the [MemoryRelevanceEngine](../apis/memory-relevance-engine.md), which is responsible for selecting relevant memories for an agent's [Context Window](./context-window.md). This engine uses a fast model to scan memory file headers and select a small, relevant subset to inject into the prompt for the main agent turn. This preliminary filtering step is a well-defined, low-stakes task perfectly suited for a fast model, adding only about 200ms of latency at a minimal cost [Source 1].

Examples of models often used in the "fast" category include `gemini-2.0-flash` and `gpt-4o-mini` [Source 2].

## Configuration

Developers configure the use of fast models by instantiating a [RouterChatModel](../apis/router-chat-model.md) and providing it with both a `fast` and a `capable` model instance. The routing logic can be customized with a `route` function.

```typescript
// Example of configuring a RouterChatModel
const model = new RouterChatModel({
  fast: new GeminiChatModel({ model: 'gemini-2.0-flash' }),
  capable: new GeminiChatModel({ model: 'gemini-2.0-pro' }),
});

// Example with a custom routing function
const customRouter = new RouterChatModel({
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
[Source 2]

For development or testing, YAAF also provides helper functions like `alwaysFast()` to force all traffic through the fast model, which can accelerate iteration cycles [Source 2].

## Sources
- [Source 1]: `src/memory/relevance.ts`
- [Source 2]: `src/models/router.ts`