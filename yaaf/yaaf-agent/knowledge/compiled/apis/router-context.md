---
title: RouterContext
entity_type: api
summary: A type defining the contextual information provided to a routing function within a RouterChatModel.
export_name: RouterContext
source_file: src/models/router.ts
category: type
search_terms:
 - routing context object
 - custom routing function data
 - RouterChatModel context
 - decide between fast and capable model
 - LLM routing parameters
 - what data is in RouterContext
 - messages tools iteration
 - onRoute callback context
 - dynamic model selection
 - cost optimization routing
 - conditional LLM usage
 - route function argument
stub: false
compiled_at: 2026-04-24T17:34:01.417Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`RouterContext` is a TypeScript type that encapsulates the state of a conversation at the moment a routing decision is required within a `RouterChatModel`. It provides the necessary information for a custom routing function to decide whether to use a "fast" or "capable" language model for the next turn.

This context object is passed as an argument to the `route` function and the `onRoute` callback defined in the `RouterConfig`. By inspecting the properties of `RouterContext`, developers can implement custom logic for cost and performance optimization.

## Signature

`RouterContext` is an object type with the following properties:

```typescript
export type RouterContext = {
  /** The history of messages in the current conversation. */
  messages: ChatMessage[];

  /** The tools available for the model to call. */
  tools?: ToolSchema[];

  /** The current turn number in the agent's execution loop. */
  iteration: number;
};
```

## Examples

The primary use of `RouterContext` is within a custom `route` function for a `RouterChatModel`. The function receives the context and returns a `RoutingDecision`.

### Custom Routing Logic

This example demonstrates a custom `route` function that inspects the `messages` and `tools` from the `RouterContext` to decide which model to use.

```typescript
import { RouterChatModel, RouterContext, RoutingDecision } from 'yaaf';
import { openaiModel } from 'some-provider'; // Fictional provider import

const model = new RouterChatModel({
  fast: openaiModel('gpt-4o-mini'),
  capable: openaiModel('gpt-4o'),
  route: ({ messages, tools }: RouterContext): RoutingDecision => {
    // Use the capable model for complex scenarios
    if ((tools?.length ?? 0) > 5) return 'capable';
    if (messages.length > 20) return 'capable';

    const lastMsg = messages.at(-1)?.content ?? '';
    if (/plan|architect|design|refactor/i.test(lastMsg)) {
      return 'capable';
    }

    // Otherwise, use the fast model
    return 'fast';
  },
  onRoute: (decision, ctx) => {
    console.log(`Routing decision for iteration ${ctx.iteration}: ${decision}`);
  }
});
```

## See Also

- `RouterChatModel`: The chat model that uses `RouterContext` to perform two-tier [Model Routing](../concepts/model-routing.md).
- `RouterConfig`: The configuration object for `RouterChatModel`, where the `route` function is defined.
- `RoutingDecision`: The return type (`'fast' | 'capable'`) for a routing function.

## Sources

- [Source 1] src/models/router.ts