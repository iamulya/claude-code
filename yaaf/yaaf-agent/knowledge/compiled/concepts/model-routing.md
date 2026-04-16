---
summary: The strategy of dynamically selecting an LLM based on task complexity, cost constraints, or context length to optimize performance and cost.
title: Model Routing
entity_type: concept
related_subsystems:
  - models
  - agents
stub: false
compiled_at: 2026-04-16T14:31:32.458Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/router.ts
confidence: 0.95
---

## What It Is
Model Routing is a strategy in YAAF used to optimize the balance between execution cost, latency, and reasoning quality. It involves a two-tier architecture where LLM requests are dynamically dispatched to either a "fast" model or a "capable" model based on the specific requirements of the current task.

This approach addresses the economic inefficiency of using high-reasoning, high-cost models for simple tasks (such as basic tool calls or short conversational turns). By routing simpler work to cheaper models (e.g., Gemini Flash) and complex reasoning to more powerful models (e.g., Gemini Pro), developers can typically reduce operational costs by 3–7× with negligible loss in overall agent performance.

## How It Works in YAAF
The primary implementation of this concept is the `RouterChatModel` class. This class implements the `ChatModel` interface, allowing it to be used anywhere a standard LLM provider would be used.

### Routing Tiers
YAAF defines two tiers for routing:
*   **Fast**: A cheap, high-speed model intended for simple or short requests.
*   **Capable**: A more expensive, high-reasoning model intended for complex tasks, long contexts, or architectural planning.

### The Routing Decision
Before every LLM call, the framework evaluates a `RouterContext`—which includes the current message history, available tools, and the current iteration count—to decide which tier to use. 

YAAF provides a default heuristic that selects the **capable** model if any of the following conditions are met:
*   The number of available tools exceeds 5.
*   The message history exceeds 12 messages.
*   The content of the last message contains planning or architectural keywords (e.g., "plan", "architect", "design", "refactor").

Otherwise, the framework defaults to the **fast** model.

### Observability
The routing mechanism supports an `onRoute` callback. This allows developers to hook into the decision-making process for logging, monitoring, or debugging purposes, providing visibility into which model was selected for a specific turn and why.

## Configuration
Developers configure routing by instantiating a `RouterChatModel` with a `RouterConfig` object. This configuration allows for the definition of the two models and an optional custom routing function.

### Basic Configuration
```typescript
import { RouterChatModel } from 'yaaf/models';

const model = new RouterChatModel({
  fast: new GeminiChatModel({ model: 'gemini-2.0-flash' }),
  capable: new GeminiChatModel({ model: 'gemini-2.0-pro' }),
});
```

### Custom Routing Logic
A custom `route` function can be provided to override the default heuristics based on specific domain needs.

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

### Utility Helpers
YAAF provides utility functions to bypass routing logic without changing the underlying implementation at the call site:
*   `alwaysCapable(model)`: Forces the use of the capable model, effectively disabling routing. This is useful for production environments where maximum quality is required regardless of cost.
*   `alwaysFast(model)`: Forces the use of the fast model. This is typically used during rapid iteration or development to minimize costs.

## Sources
* `src/models/router.ts`