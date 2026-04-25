---
title: RoutingDecision
entity_type: api
summary: A type alias representing the choice between a "fast" or "capable" model in a routing system.
export_name: RoutingDecision
source_file: src/models/router.ts
category: type
search_terms:
 - model routing
 - fast vs capable model
 - cost optimization LLM
 - RouterChatModel decision
 - choose which model to use
 - routing function return type
 - LLM traffic routing
 - dual model strategy
 - cheap vs expensive model
 - conditional model execution
 - dynamic model selection
stub: false
compiled_at: 2026-04-24T17:34:11.552Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

`RoutingDecision` is a string literal type that represents the outcome of a routing choice within the `RouterChatModel` [Source 1]. It is used to direct a request to one of two language models: a "fast" model, which is typically cheaper and less powerful, or a "capable" model, which is more powerful but also more expensive and potentially slower [Source 1].

This type is the required return value for the `route` function in the `RouterConfig`. By returning either `"fast"` or `"capable"`, the routing logic determines which underlying model will process the current request, enabling a strategy of [Cost Optimization](../concepts/cost-optimization.md) by using the powerful model only [when](./when.md) necessary [Source 1].

## Signature

`RoutingDecision` is a type alias for a union of two string literals [Source 1].

```typescript
export type RoutingDecision = "fast" | "capable";
```

- `"fast"`: Indicates that the request should be sent to the cheaper, faster model.
- `"capable"`: Indicates that the request should be sent to the more powerful, expensive model.

## Examples

The primary use of `RoutingDecision` is as the return type for a custom routing function provided to the `RouterChatModel`.

```typescript
import {
  RouterChatModel,
  RoutingDecision,
  RouterContext,
  ChatModel,
} from 'yaaf';

// Assume fastModel and capableModel are pre-configured instances of ChatModel
declare const fastModel: ChatModel;
declare const capableModel: ChatModel;

/**
 * A custom routing function that returns a RoutingDecision.
 * This logic decides to use the 'capable' model for complex tasks
 * identified by keywords in the last message.
 */
const customRoute = (ctx: RouterContext): RoutingDecision => {
  const lastMessage = ctx.messages.at(-1)?.content ?? '';

  // Use the capable model for tasks that seem complex
  if (/plan|architect|design|refactor/i.test(lastMessage)) {
    return 'capable';
  }

  // For everything else, use the fast, cheaper model
  return 'fast';
};

const model = new RouterChatModel({
  fast: fastModel,
  capable: capableModel,
  route: customRoute,
});
```

## Sources

[Source 1]: src/models/router.ts