---
title: RouterChatModel
entity_type: api
summary: A two-tier chat model that routes requests to either a fast, cheap model or a capable, expensive model to optimize for cost.
export_name: RouterChatModel
source_file: src/models/router.ts
category: class
search_terms:
 - cost optimization for LLMs
 - model routing
 - two-tier model architecture
 - cheap vs expensive models
 - dynamic model selection
 - how to reduce LLM costs
 - fast and capable model
 - conditional model usage
 - LLM traffic routing
 - smart model switching
 - Gemini Flash vs Pro
 - GPT-4o-mini vs GPT-4o
 - custom routing logic
stub: false
compiled_at: 2026-04-24T17:33:54.466Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `RouterChatModel` is a specialized implementation of the `ChatModel` interface that provides two-tier [Model Routing](../concepts/model-routing.md) for [Cost Optimization](../concepts/cost-optimization.md) [Source 1]. It is designed to route requests to one of two underlying models: a "fast" model, which is typically cheaper and less powerful, and a "capable" model, which is more expensive and powerful [Source 1].

This approach is effective for workflows involving [Tool Use](../concepts/tool-use.md), where simple tasks can be handled by the [Fast Model](../concepts/fast-model.md) and more complex reasoning or planning can be delegated to the [Capable Model](../concepts/capable-model.md). By intelligently switching between models, `RouterChatModel` can significantly reduce operational costs, often by a factor of 3-7x, with negligible impact on output quality, especially [when](./when.md) the cost ratio between the models is around 10:1 (e.g., Google's Gemini Flash vs. Pro models) [Source 1].

## Signature / Constructor

`RouterChatModel` is instantiated with a configuration object that defines the two models and the routing logic.

```typescript
import type { ChatModel } from "../agents/runner.js";

export class RouterChatModel implements ChatModel {
  constructor(config: RouterConfig);
  // ... implementation details
}
```

### Configuration (`RouterConfig`)

The constructor accepts a `RouterConfig` object with the following properties:

```typescript
export type RouterConfig = {
  /** Cheap, fast model — used for simple/short requests. */
  fast: ChatModel;

  /** Capable, slower model — used for complex/long requests. */
  capable: ChatModel;

  /**
   * Routing function. Called before every LLM call.
   * Return 'fast' to use the cheap model, 'capable' for the better one.
   *
   * Default heuristic:
   * - Use 'capable' if: [[[[[[[[Tools]]]]]]]] > 5, messages > 12, or content contains
   * planning/architecture keywords.
   * - Otherwise: 'fast'.
   */
  route?: (ctx: RouterContext) => RoutingDecision | Promise<RoutingDecision>;

  /**
   * Optional callback for [[[[[[[[Observability]]]]]]]] — called after each routing decision.
   */
  onRoute?: (decision: RoutingDecision, ctx: RouterContext) => void;
};
```

- **`fast`**: An instance of a `ChatModel` to be used for simpler, less expensive tasks.
- **`capable`**: An instance of a `ChatModel` to be used for complex reasoning and planning.
- **`route`** (optional): A custom function that determines which model to use for a given request. It receives a `RouterContext` object and must return either `'fast'` or `'capable'`. If not provided, a default heuristic is used which selects the 'capable' model if there are more than 5 Tools, more than 12 messages, or if the last message contains keywords related to planning or architecture. Otherwise, it defaults to 'fast' [Source 1].
- **`onRoute`** (optional): A callback function that is invoked after each routing decision is made. This is useful for logging, monitoring, and other Observability purposes [Source 1].

### Routing Context (`RouterContext`)

The `route` function and `onRoute` callback receive a context object with the following shape:

```typescript
import type { ChatMessage, ToolSchema } from "../agents/runner.js";

export type RouterContext = {
  messages: ChatMessage[];
  tools?: ToolSchema[];
  iteration: number;
};
```

## Methods & Properties

As an implementation of the `ChatModel` interface, `RouterChatModel` exposes the same public methods and properties as other chat models in the framework. The specific implementation details are internal, but it conforms to the standard `ChatModel` contract.

## Examples

### Basic Usage

This example demonstrates setting up a `RouterChatModel` with two different Gemini models. It will use the default routing logic.

```typescript
import { RouterChatModel } from 'yaaf';
import { GeminiChatModel } from 'some-provider-library'; // Fictional import

const model = new RouterChatModel({
  fast: new GeminiChatModel({ model: 'gemini-2.0-flash' }),
  capable: new GeminiChatModel({ model: 'gemini-2.0-pro' }),
});
```

### Custom Routing Logic

This example shows how to provide a custom `route` function to implement more specific logic for when to use the capable model.

```typescript
import { RouterChatModel } from 'yaaf';
import { openaiModel } from 'some-provider-library'; // Fictional import

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

## See Also

The `yaaf` package also exports two helper functions for creating specialized instances of `RouterChatModel` that bypass the routing logic.

- **`alwaysCapable(capable: ChatModel)`**: A factory function that returns a `RouterChatModel` which always uses the `capable` model. This is useful for disabling routing in a production environment without changing the code that uses the model [Source 1].
- **`alwaysFast(fast: ChatModel)`**: A factory function that returns a `RouterChatModel` which always uses the `fast` model. This is useful for rapid development and testing where cost and speed are prioritized over capability [Source 1].

## Sources

[Source 1]: src/models/router.ts