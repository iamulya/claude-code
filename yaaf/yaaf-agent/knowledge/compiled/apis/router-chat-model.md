---
export_name: RouterChatModel
source_file: src/models/router.ts
category: class
summary: A chat model implementation that routes requests between a fast/cheap model and a capable/expensive model based on context.
title: RouterChatModel
entity_type: api
stub: false
compiled_at: 2026-04-16T14:31:26.094Z
compiled_from:
  - /Users/hybridpro/Downloads/claude-code-main/yaaf/knowledge/raw/source/models/router.ts
confidence: 0.98
---

## Overview
`RouterChatModel` is a chat model implementation designed for cost and performance optimization through a two-tier routing strategy. It acts as a proxy that directs LLM requests to either a "fast" (typically smaller and less expensive) model or a "capable" (larger and more sophisticated) model based on the current conversation context.

By routing simple tasks to models like Gemini Flash or GPT-4o-mini and reserving complex reasoning for models like Gemini Pro or GPT-4o, this implementation can reduce operational costs by 3–7× with negligible loss in quality.

## Signature / Constructor

### Constructor
```typescript
export class RouterChatModel implements ChatModel {
  constructor(config: RouterConfig)
}
```

### Configuration Types

**RouterConfig**
The configuration object defines the two models and the logic used to switch between them.
```typescript
export type RouterConfig = {
  /** Cheap, fast model — used for simple/short requests. */
  fast: ChatModel
  /** Capable, slower model — used for complex/long requests. */
  capable: ChatModel
  /**
   * Routing function. Called before every LLM call.
   * Return 'fast' to use the cheap model, 'capable' for the better one.
   */
  route?: (ctx: RouterContext) => RoutingDecision | Promise<RoutingDecision>
  /**
   * Optional callback for observability — called after each routing decision.
   */
  onRoute?: (decision: RoutingDecision, ctx: RouterContext) => void
}
```

**RouterContext**
The context provided to the routing function to inform the decision.
```typescript
export type RouterContext = {
  messages: ChatMessage[]
  tools?: ToolSchema[]
  iteration: number
}
```

**RoutingDecision**
```typescript
export type RoutingDecision = 'fast' | 'capable'
```

## Methods & Properties

### Default Routing Logic
If no `route` function is provided in the configuration, `RouterChatModel` uses a default heuristic:
- It selects the **capable** model if:
    - The number of available tools exceeds 5.
    - The conversation history exceeds 12 messages.
    - The content of the last message contains keywords related to planning or architecture (e.g., "plan", "architect", "design", "refactor").
- Otherwise, it selects the **fast** model.

### Static Factory Functions

#### alwaysCapable
Creates a `RouterChatModel` that bypasses routing logic to always use the capable model. This is useful for disabling routing in production environments without modifying call sites.
```typescript
export function alwaysCapable(capable: ChatModel): RouterChatModel
```

#### alwaysFast
Creates a `RouterChatModel` that always uses the fast model. This is primarily used for rapid iteration or development where cost is a primary concern.
```typescript
export function alwaysFast(fast: ChatModel): RouterChatModel
```

## Examples

### Basic Usage
Configuring a router with default heuristics using Gemini models.
```typescript
const model = new RouterChatModel({
  fast: new GeminiChatModel({ model: 'gemini-2.0-flash' }),
  capable: new GeminiChatModel({ model: 'gemini-2.0-pro' }),
});
```

### Custom Routing Logic
Implementing specific logic based on tool count, message length, and keyword detection.
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