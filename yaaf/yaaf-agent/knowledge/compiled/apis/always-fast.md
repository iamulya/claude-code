---
title: alwaysFast
entity_type: api
summary: A factory function that creates a `RouterChatModel` configured to always use the "fast" model.
export_name: alwaysFast
source_file: src/models/router.ts
category: function
search_terms:
 - disable capable model
 - force fast model
 - development model routing
 - rapid iteration LLM
 - cost optimization off
 - use cheap model only
 - RouterChatModel factory
 - how to use only the fast model
 - testing with cheap LLM
 - alwaysFast helper
 - model routing for development
 - bypass routing logic
stub: false
compiled_at: 2026-04-24T16:48:12.754Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/models/router.ts
compiled_from_quality: unknown
confidence: 0.95
---

## Overview

The `alwaysFast` function is a factory that creates and configures an instance of `RouterChatModel` to exclusively use the "fast" model for all operations [Source 1]. It effectively bypasses the routing logic that would normally choose between a fast and a [Capable Model](../concepts/capable-model.md).

This function is primarily intended for development and testing scenarios where rapid iteration and low cost are more important than the advanced reasoning capabilities of a more powerful model [Source 1]. By using `alwaysFast`, developers can ensure their agent uses a cheaper, faster model without changing the code where the model is consumed.

## Signature

```typescript
export function alwaysFast(fast: ChatModel): RouterChatModel;
```

### Parameters

-   **`fast`** `ChatModel`: An instance of a class that implements the `ChatModel` interface. This is the model that the returned `RouterChatModel` will use for all requests.

### Returns

-   `RouterChatModel`: A new instance of `RouterChatModel` configured to always route requests to the provided `fast` model.

## Examples

The following example demonstrates how to create a model router that is locked to a fast, inexpensive model for development purposes.

```typescript
import { alwaysFast } from 'yaaf';
// Assuming a provider-specific model implementation exists
import { GeminiChatModel } from '@google/generative-ai';

// 1. Instantiate the fast model you want to use exclusively.
const fastModel = new GeminiChatModel({ model: 'gemini-2.0-flash' });

// 2. Use the alwaysFast factory to create a RouterChatModel instance.
const developmentModel = alwaysFast(fastModel);

// 3. The `developmentModel` can now be passed to an agent.
// All calls to this model will be directed to 'gemini-2.0-flash',
// regardless of the complexity of the prompt or the number of tools.
//
// await agent.run({
//   model: developmentModel,
//   prompt: "A simple task...",
// });
```

## See Also

-   `RouterChatModel`: The class that provides two-tier [Model Routing](../concepts/model-routing.md) for [Cost Optimization](../concepts/cost-optimization.md).
-   `alwaysCapable`: The counterpart factory function that forces the use of the "capable" model.

## Sources

[Source 1] src/models/router.ts