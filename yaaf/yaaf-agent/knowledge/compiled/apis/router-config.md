---
title: RouterConfig
entity_type: api
summary: Configuration object for the RouterChatModel, defining the fast and capable models and the routing logic between them.
export_name: RouterConfig
source_file: src/models/router.ts
category: type
search_terms:
 - model routing configuration
 - cost optimization for LLMs
 - dual model strategy
 - fast and capable models
 - how to configure RouterChatModel
 - custom routing function
 - LLM routing logic
 - cheap vs expensive model
 - conditional model selection
 - observability for model routing
 - onRoute callback
 - two-tier LLM setup
stub: false
compiled_at: 2026-04-24T17:33:54.615Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`RouterConfig` is a type alias for the configuration object required by the `RouterChatModel` constructor. It defines the two-tier [Model Routing](../concepts/model-routing.md) strategy for [Cost Optimization](../concepts/cost-optimization.md) by specifying a "fast" (cheap) model for simple tasks and a "capable" (expensive) model for complex reasoning [Source 1].

This configuration is the primary mechanism for implementing a dual-model approach, allowing developers to define which models to use and the specific logic for routing requests between them. It also includes an optional callback for observing routing decisions [Source 1].

## Signature

`RouterConfig` is an object type with the following structure. It relies on the `RouterContext` and `RoutingDecision` types for its `route` function signature [Source 1].

```typescript
export type RouterConfig = {
  /** Cheap, fast model — used for simple/short requests. */
  fast: ChatModel;

  /** Capable, slower model — used for complex/long requests. */
  capable: ChatModel;

  /**
   * Routing function. Called before every LLM call.
   * Return 'fast' to use the cheap model, 'capable' for the better one.
   */
  route?: (ctx: RouterContext) => RoutingDecision | Promise<RoutingDecision>;

  /**
   * Optional callback for [[[[[[[[Observability]]]]]]]] — called after each routing decision.
   */
  onRoute?: (decision: RoutingDecision, ctx: RouterContext) => void;
};

export type RouterContext = {
  messages: ChatMessage[];
  [[[[[[[[Tools]]]]]]]]?: ToolSchema[];
  iteration: number;
};

export type RoutingDecision = "fast" | "capable";
```

## Properties

- **`fast`**: `ChatModel` (required)
  - The cheaper, faster model instance to be used for simple or short requests [Source 1].

- **`capable`**: `ChatModel` (required)
  - The more capable, and typically more expensive, model instance to be used for complex or long requests [Source 1].

- **`route`**: `(ctx: RouterContext) => RoutingDecision | Promise<RoutingDecision>` (optional)
  - A function that determines which model to use for a given request. It receives a `RouterContext` object containing the messages, Tools, and iteration count. It must return either `'fast'` or `'capable'`, optionally as a `Promise` [Source 1].
  - If not provided, a default heuristic is used: the 'capable' model is chosen if there are more than 5 tools, more than 12 messages, or if the message content contains keywords related to planning or architecture. Otherwise, the 'fast' model is used [Source 1].

- **`onRoute`**: `(decision: RoutingDecision, ctx: RouterContext) => void` (optional)
  - A callback function invoked after each routing decision is made. This is useful for logging, metrics, or other Observability purposes. It receives the `RoutingDecision` ('fast' or 'capable') and the `RouterContext` that informed the decision [Source 1].

## Examples

### Basic Configuration

This example configures a `RouterChatModel` with fast and [Capable Model](../concepts/capable-model.md)s, relying on the default routing logic [Source 1].

```typescript
import { RouterChatModel } from 'yaaf';
import { GeminiChatModel } from 'yaaf/models/gemini'; // Fictional import path

const model = new RouterChatModel({
  fast: new GeminiChatModel({ model: 'gemini-2.0-flash' }),
  capable: new GeminiChatModel({ model: 'gemini-2.0-pro' }),
});
```

### Configuration with a Custom Routing Function

This example provides a custom `route` function to implement specific logic for [when](./when.md) to use the more Capable Model [Source 1].

```typescript
import { RouterChatModel, RouterConfig } from 'yaaf';
import { openaiModel } from 'yaaf/models/openai'; // Fictional import path

const config: RouterConfig = {
  fast: openaiModel('gpt-4o-mini'),
  capable: openaiModel('gpt-4o'),
  route: ({ messages, tools }) => {
    // Use capable model for more complex scenarios
    if ((tools?.length ?? 0) > 5) return 'capable';
    if (messages.length > 20) return 'capable';

    const lastMsg = messages.at(-1)?.content ?? '';
    if (/plan|architect|design|refactor/i.test(lastMsg)) {
      return 'capable';
    }

    return 'fast';
  },
  onRoute: (decision, ctx) => {
    console.log(`Routing decision: ${decision} for iteration ${ctx.iteration}`);
  }
};

const model = new RouterChatModel(config);
```

## See Also

- `RouterChatModel`: The class that consumes this configuration object to implement two-tier model routing.
- `alwaysCapable`: A factory function that creates a `RouterChatModel` which always uses the 'capable' model.
- `alwaysFast`: A factory function that creates a `RouterChatModel` which always uses the 'fast' model.

## Sources

[Source 1] src/models/router.ts